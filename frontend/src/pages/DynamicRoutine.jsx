import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { DAYS } from '../schedule';
import RoutineGrid from '../components/RoutineGrid';
import RoutineHeader from '../components/RoutineHeader';
import Notification from '../components/Notification';

const COLOR_OPTIONS = [
  { value: '', label: 'None (white)' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'blue', label: 'Blue' },
  { value: 'gray', label: 'Gray' },
  { value: 'orange', label: 'Orange' },
  { value: 'neutral', label: 'Neutral' },
];

function emptyRow(user) {
  return {
    key: crypto.randomUUID(),
    department: user?.department || '',
    batch: '',
    section: '',
    courseCode: '',
    courseTitle: '',
    teacher: user?.role === 'teacher' ? user.name : '',
    room: '',
    type: 'class',
    color: '',
    days: [],
  };
}

export default function DynamicRoutine() {
  const { user } = useAuth();
  const [rows, setRows] = useState([emptyRow(user)]);
  const [routines, setRoutines] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRoutines = useCallback(async () => {
    const params = {};
    if (user?.department) params.department = user.department;
    const { data } = await api.get('/api/routines', { params });
    setRoutines(data);
  }, [user]);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  useEffect(() => {
    function handleUpdate() { fetchRoutines(); }
    socket.on('routineUpdated', handleUpdate);
    return () => socket.off('routineUpdated', handleUpdate);
  }, [fetchRoutines]);

  function updateRow(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function toggleDay(key, day) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const days = r.days.includes(day) ? r.days.filter((d) => d !== day) : [...r.days, day];
        return { ...r, days };
      })
    );
  }

  function toggleAllWeek(key) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const allSelected = DAYS.every((d) => r.days.includes(d));
        return { ...r, days: allSelected ? [] : [...DAYS] };
      })
    );
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow(user)]);
  }

  function removeRow(key) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setSkipped([]);

    for (const r of rows) {
      if (!r.department || !r.batch || !r.courseCode || !r.teacher || !r.room) {
        setError('Every row needs department, batch, course code, teacher and room.');
        return;
      }
      if (r.days.length === 0) {
        setError(`Pick at least one day for ${r.courseCode || 'a row'} (or use "All week").`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = { classes: rows.map(({ key, ...rest }) => rest) };
      const { data } = await api.post('/api/routines/dynamic', payload);
      setSkipped(data.skipped || []);
      if (data.created?.length) {
        setToast(`Placed ${data.created.length} slot(s) automatically.`);
      }
      if (data.skipped?.length) {
        setError(`${data.skipped.length} slot(s) could not be placed — see the list below.`);
      }
      setRows([emptyRow(user)]);
      fetchRoutines();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong generating the routine.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Notification message={toast} onClose={() => setToast('')} />
      <RoutineHeader />

      <div>
        <h2 className="text-xl font-bold">Dynamic Routine</h2>
        <p className="text-sm text-gray-600">
          Add the class details — no need to pick a time. The system finds the earliest free
          50-minute period (or 2h30m lab block) for each day you select, without double-booking a
          teacher/room/batch and without ever giving one teacher 3 classes in a row.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded">{error}</p>}

      <form onSubmit={handleGenerate} className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row.key} className="bg-white shadow rounded p-4 space-y-3 border">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-blue-900">Class #{idx + 1}</h3>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(row.key)} className="text-red-600 text-sm underline">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                value={row.department}
                onChange={(e) => updateRow(row.key, { department: e.target.value })}
                placeholder="Department (e.g. ECE)"
                className="border p-2 rounded"
                required
              />
              <input
                value={row.section}
                onChange={(e) => updateRow(row.key, { section: e.target.value })}
                placeholder="Section (optional)"
                className="border p-2 rounded"
              />
              <input
                value={row.batch}
                onChange={(e) => updateRow(row.key, { batch: e.target.value })}
                placeholder='Batch (e.g. "2nd Year Odd Semester 2024 Series")'
                className="border p-2 rounded col-span-2"
                required
              />

              <select
                value={row.type}
                onChange={(e) => updateRow(row.key, { type: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="class">Class (50 min)</option>
                <option value="lab">Lab (2h30m)</option>
              </select>

              <input
                value={row.courseCode}
                onChange={(e) => updateRow(row.key, { courseCode: e.target.value })}
                placeholder="Course code (e.g. ECE 2103)"
                className="border p-2 rounded"
                required
              />
              <input
                value={row.courseTitle}
                onChange={(e) => updateRow(row.key, { courseTitle: e.target.value })}
                placeholder="Course title (optional)"
                className="border p-2 rounded"
              />
              <select
                value={row.color}
                onChange={(e) => updateRow(row.key, { color: e.target.value })}
                className="border p-2 rounded"
              >
                {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>

              <input
                value={row.teacher}
                onChange={(e) => updateRow(row.key, { teacher: e.target.value })}
                placeholder="Teacher (initial or name)"
                className="border p-2 rounded"
                required
              />
              <input
                value={row.room}
                onChange={(e) => updateRow(row.key, { room: e.target.value })}
                placeholder="Room / lab (e.g. R-403)"
                className="border p-2 rounded"
                required
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Which day(s)?</p>
              <div className="flex flex-wrap gap-2 items-center">
                {DAYS.map((d) => (
                  <label key={d} className="flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.days.includes(d)}
                      onChange={() => toggleDay(row.key, d)}
                    />
                    {d}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => toggleAllWeek(row.key)}
                  className="text-xs underline text-blue-900 ml-2"
                >
                  {DAYS.every((d) => row.days.includes(d)) ? 'Clear all' : 'All week'}
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <button type="button" onClick={addRow} className="px-4 py-2 rounded border">
            + Add another class
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? 'Generating…' : 'Generate Routine'}
          </button>
        </div>
      </form>

      {skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
          <p className="font-semibold text-amber-800 mb-1">Couldn't be placed automatically:</p>
          <ul className="list-disc list-inside space-y-1">
            {skipped.map((s, i) => (
              <li key={i}>
                <strong>{s.courseCode}</strong> on {s.day} ({s.teacher}, {s.room}) — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-2">Resulting Routine</h3>
        <RoutineGrid routines={routines} currentUser={user} />
      </div>
    </div>
  );
}
