import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import RoutineHeader from '../components/RoutineHeader';
import WeeklySheet from '../components/WeeklySheet';

// Read-only, single-series, print-style view — reachable from the dashboard
// by clicking a series card. Anyone signed in can view it; only
// admins/teachers can edit the sheet info (date range, syllabus notes, etc.)
// from the Dynamic Routine page.
export default function SeriesRoutine() {
  const { batch: batchParam } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const batch = decodeURIComponent(batchParam || '');
  const department = searchParams.get('department') || user?.department || '';

  const [routines, setRoutines] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { batch };
      if (department) params.department = department;
      const { data } = await api.get('/api/dynamic-routines', { params });
      setRoutines(data);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load this series\u2019 routine.');
    } finally {
      setLoading(false);
    }
  }, [batch, department]);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <RoutineHeader />
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div>
            <Link to="/dashboard" className="text-sm text-sky-700 hover:underline">&larr; Back to dashboard</Link>
            <h2 className="text-2xl font-extrabold text-blue-950 tracking-tight mt-1">{batch}</h2>
            {department && <p className="text-xs text-slate-400 font-medium">{department}</p>}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="text-sm font-semibold text-sky-700 border border-sky-200 hover:bg-sky-50 px-3 py-1.5 rounded-full transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>

        {error && <p className="text-red-700 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-400 italic">Loading…</p>
        ) : (
          <WeeklySheet batch={batch} routines={routines} />
        )}
      </div>
    </div>
  );
}
