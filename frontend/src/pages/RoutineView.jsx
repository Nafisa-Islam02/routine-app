import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import RoutineGrid from '../components/RoutineGrid';
import RoutineHeader from '../components/RoutineHeader';
import RoutineLegend from '../components/RoutineLegend';
import Notification from '../components/Notification';
import WeeklySheet from '../components/WeeklySheet';

export default function RoutineView() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [dynamicRoutines, setDynamicRoutines] = useState([]);
  const [department, setDepartment] = useState(user?.department || '');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [viewMode, setViewMode] = useState('ecat'); // 'ecat' | 'matrix'
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const pdfContainerRef = useRef(null);

  const fetchAllRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (department) params.department = department;
      
      const [resManual, resDynamic] = await Promise.all([
        api.get('/api/routines', { params }).catch(() => ({ data: [] })),
        api.get('/api/dynamic-routines', { params }).catch(() => ({ data: [] })),
      ]);
      setRoutines(resManual.data || []);
      setDynamicRoutines(resDynamic.data || []);
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchAllRoutines();
  }, [fetchAllRoutines]);

  // Listen for live updates from both manual and dynamic routines
  useEffect(() => {
    function handleUpdate(payload) {
      if (payload && payload.message) {
        setToast(payload.message);
      } else {
        setToast('Routine updated in real-time!');
      }
      fetchAllRoutines();
    }
    socket.on('routineUpdated', handleUpdate);
    socket.on('dynamicRoutineUpdated', handleUpdate);
    socket.on('notification', (note) => {
      if (note?.message) setToast(note.message);
    });

    return () => {
      socket.off('routineUpdated', handleUpdate);
      socket.off('dynamicRoutineUpdated', handleUpdate);
      socket.off('notification');
    };
  }, [fetchAllRoutines]);

  // Combine dynamic and manual routines so dashboard is 100% synchronized
  const allCombinedRoutines = useMemo(() => {
    return [...dynamicRoutines, ...routines];
  }, [dynamicRoutines, routines]);

  const combinedRoutines = useMemo(() => {
    if (selectedBatch === 'All') return allCombinedRoutines;
    return allCombinedRoutines.filter((r) => r.batch === selectedBatch);
  }, [allCombinedRoutines, selectedBatch]);

  // Show ONLY series that actually exist in the data (no uncreated empty series)
  const availableBatches = useMemo(() => {
    const existingBatches = allCombinedRoutines.map((r) => r.batch).filter(Boolean);
    const set = new Set(existingBatches);
    return Array.from(set).sort();
  }, [allCombinedRoutines]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = combinedRoutines.length;
    const ctCount = combinedRoutines.filter((r) => r.isCT).length;
    const quizCount = combinedRoutines.filter((r) => r.isQuiz).length;
    const labsCount = combinedRoutines.filter((r) => r.type === 'lab').length;
    return { total, ctCount, quizCount, labsCount };
  }, [combinedRoutines]);

  // Crisp PDF Export logic with ZERO white margin spaces
  const handleDownloadPDF = async (targetBatchName = null) => {
    try {
      setToast('Generating PDF document…');
      const container = pdfContainerRef.current;
      if (!container) return;

      const sheetsToExport = container.querySelectorAll('[data-pdf-sheet]');
      if (!sheetsToExport || sheetsToExport.length === 0) {
        setToast('No routine sheet found to export.');
        return;
      }

      let pdf = null;
      let pageCount = 0;

      for (let i = 0; i < sheetsToExport.length; i++) {
        const sheetEl = sheetsToExport[i];
        const sheetBatch = sheetEl.getAttribute('data-pdf-sheet');

        // Filter based on target request
        if (targetBatchName && targetBatchName !== 'All' && sheetBatch !== targetBatchName) continue;

        const canvas = await html2canvas(sheetEl, {
          scale: 2,
          backgroundColor: '#0f172a',
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pxWidth = canvas.width / 2;
        const pxHeight = canvas.height / 2;

        if (!pdf) {
          pdf = new jsPDF({
            orientation: pxWidth > pxHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [pxWidth, pxHeight],
          });
          pdf.addImage(imgData, 'PNG', 0, 0, pxWidth, pxHeight);
        } else {
          pdf.addPage([pxWidth, pxHeight], pxWidth > pxHeight ? 'landscape' : 'portrait');
          pdf.addImage(imgData, 'PNG', 0, 0, pxWidth, pxHeight);
        }
        pageCount++;
      }

      if (pageCount > 0 && pdf) {
        const fileName = (targetBatchName && targetBatchName !== 'All')
          ? `weekly-routine-${targetBatchName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`
          : selectedBatch !== 'All'
          ? `weekly-routine-${selectedBatch.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`
          : `weekly-routine-all-series.pdf`;

        pdf.save(fileName);
        setToast(`Downloaded ${fileName} successfully!`);
      } else {
        setToast('Selected series routine was not rendered for export.');
      }
    } catch (err) {
      console.error(err);
      setToast('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 overflow-hidden">
      <Notification message={toast} onClose={() => setToast('')} />

      {/* Routine Header Component */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <RoutineHeader />
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
            📚
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-800">{stats.total}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Classes</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
            📝
          </div>
          <div>
            <p className="text-xl font-extrabold text-amber-900">{stats.ctCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Class Tests (CT)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
            ⚡
          </div>
          <div>
            <p className="text-xl font-extrabold text-purple-900">{stats.quizCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Quizzes</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-bold">
            🔬
          </div>
          <div>
            <p className="text-xl font-extrabold text-teal-900">{stats.labsCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Lab Sessions</p>
          </div>
        </div>
      </div>

      {/* Filter, View Switcher, and PDF Export Control Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3 max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Dashboard Routine Matrix</h2>
            <p className="text-xs text-slate-500 font-medium">Real-time synchronized weekly class schedule</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Department Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Dept:</span>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. ECE"
                className="border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-400 focus:outline-none"
              />
            </div>

            {/* View Format Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                onClick={() => setViewMode('ecat')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'ecat' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 ECAT Grid Format
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'matrix' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Dept Matrix
              </button>
            </div>

            {/* Single Main PDF Download Button */}
            <button
              type="button"
              onClick={() => handleDownloadPDF(selectedBatch === 'All' ? 'All' : selectedBatch)}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>📥 PDF</span>
              <span>({selectedBatch === 'All' ? 'All Series' : selectedBatch})</span>
            </button>
          </div>
        </div>

        {/* Series Filter Tabs (Scrollable & strict width constraint) */}
        {availableBatches.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedBatch('All')}
                className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                  selectedBatch === 'All'
                    ? 'bg-blue-950 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Series
              </button>
              {availableBatches.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBatch(b)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                    selectedBatch === b
                      ? 'bg-blue-950 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Routine Surface */}
      <div className="space-y-6 overflow-hidden">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm italic shadow-sm border border-slate-200">
            Loading routine matrix…
          </div>
        ) : viewMode === 'matrix' && selectedBatch === 'All' ? (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-blue-950 text-base uppercase tracking-tight flex items-center gap-2">
                <span>⚡ RESULTING WEEKLY DEPARTMENT ROUTINE MATRIX</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                Full Department View
              </span>
            </div>
            <RoutineGrid routines={combinedRoutines} readOnly={true} />
          </div>
        ) : (
          /* ECAT Grid Format (Image 1) */
          <div ref={pdfContainerRef} className="space-y-6">
            {(selectedBatch === 'All' ? availableBatches : [selectedBatch]).map((batchName) => (
              <div key={batchName} data-pdf-sheet={batchName}>
                <WeeklySheet
                  batch={batchName}
                  routines={allCombinedRoutines}
                  onDownloadPDF={() => handleDownloadPDF(batchName)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend Component */}
      <RoutineLegend />
    </div>
  );
}
