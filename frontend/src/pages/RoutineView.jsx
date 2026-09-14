import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import RoutineGrid from '../components/RoutineGrid';
import RoutineHeader from '../components/RoutineHeader';
import RoutineLegend from '../components/RoutineLegend';
import Notification from '../components/Notification';

export default function RoutineView() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [dynamicRoutines, setDynamicRoutines] = useState([]);
  const [department, setDepartment] = useState(user?.department || '');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

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
  const combinedRoutines = useMemo(() => {
    const combined = [...dynamicRoutines, ...routines];
    if (selectedBatch === 'All') return combined;
    return combined.filter((r) => r.batch === selectedBatch);
  }, [dynamicRoutines, routines, selectedBatch]);

  const availableBatches = useMemo(() => {
    const set = new Set([...dynamicRoutines, ...routines].map((r) => r.batch));
    return Array.from(set);
  }, [dynamicRoutines, routines]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = combinedRoutines.length;
    const ctCount = combinedRoutines.filter((r) => r.isCT).length;
    const quizCount = combinedRoutines.filter((r) => r.isQuiz).length;
    const labsCount = combinedRoutines.filter((r) => r.type === 'lab').length;
    return { total, ctCount, quizCount, labsCount };
  }, [combinedRoutines]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Dashboard Routine Matrix</h2>
          <p className="text-xs text-slate-500 font-medium">Real-time synchronized class schedule</p>
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

          {/* Series Filter Tabs */}
          {availableBatches.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedBatch('All')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedBatch === 'All'
                    ? 'bg-blue-950 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Series
              </button>
              {availableBatches.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBatch(b)}
                  className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                    selectedBatch === b
                      ? 'bg-blue-950 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Routine Grid Surface */}
      <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 space-y-3">
        {selectedBatch !== 'All' && (
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-extrabold text-blue-950 text-base uppercase tracking-tight">
              Resulting Weekly {selectedBatch} Routine
            </h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              Read-Only View
            </span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm italic">Loading routine matrix…</div>
        ) : (
          <RoutineGrid routines={combinedRoutines} readOnly={true} />
        )}
      </div>

      {/* Legend Component */}
      <RoutineLegend />
    </div>
  );
}
