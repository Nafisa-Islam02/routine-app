import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { DAYS } from '../schedule';
import courseCatalog from '../data/courseCatalog.json';
import { TEACHERS } from '../constants/teachers';
import { roomsFor } from '../constants/rooms';
import { COLOR_OPTIONS, DEFAULT_COLOR } from '../constants/colors';
import RoutineGrid from '../components/RoutineGrid';
import RoutineHeader from '../components/RoutineHeader';
import Notification from '../components/Notification';

const SERIES_OPTIONS = Object.keys(courseCatalog);

function emptyRow(user) {
  return {
    key: crypto.randomUUID(),
    department: user?.department || '',
    batch: '',
    courseCode: '',
    courseTitle: '',
    credit: '',
    teacher: user?.role === 'teacher' ? user.name : '',
    room: '',
    type: 'class',
    color: DEFAULT_COLOR,
    days: [],
    pairEnabled: false,
    pair: { courseCode: '', courseTitle: '', credit: '', teacher: '', room: '', color: DEFAULT_COLOR },
  };
}

function coursesFor(batch) {
  return courseCatalog[batch] || [];
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
    const { data } = await api.get('/api/dynamic-routines', { params });
    setRoutines(data);
  }, [user]);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  useEffect(() => {
    function handleUpdate() { fetchRoutines(); }
    socket.on('dynamicRoutineUpdated', handleUpdate);
    return () => socket.off('dynamicRoutineUpdated', handleUpdate);
  }, [fetchRoutines]);

  function updateRow(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function updatePair(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, pair: { ...r.pair, ...patch } } : r)));
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

  function handleSeriesChange(key, batch) {
    updateRow(key, { batch, courseCode: '', courseTitle: '', credit: '', type: 'class', room: '' });
  }

  function handleCourseCodeChange(key, row, code) {
    const match = coursesFor(row.batch).find((c) => c.code === code);
    updateRow(key, {
      courseCode: code,
      courseTitle: match?.title || '',
      credit: match?.credit ?? '',
      type: match?.type || row.type,
      room: '',
    });
  }

  function handleCourseTitleChange(key, row, title) {
    const match = coursesFor(row.batch).find((c) => c.title === title);
    updateRow(key, {
      courseTitle: title,
      courseCode: match?.code || '',
      credit: match?.credit ?? '',
      type: match?.type || row.type,
      room: '',
    });
  }

  function handlePairCourseCodeChange(key, row, code) {
    const match = coursesFor(row.batch).find((c) => c.code === code);
    updatePair(key, { courseCode: code, courseTitle: match?.title || '', credit: match?.credit ?? '' });
  }

  function handlePairCourseTitleChange(key, row, title) {
    const match = coursesFor(row.batch).find((c) => c.title === title);
    updatePair(key, { courseTitle: title, courseCode: match?.code || '', credit: match?.credit ?? '' });
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setSkipped([]);

    for (const r of rows) {
      if (!r.department || !r.batch || !r.courseCode || !r.teacher || !r.room) {
        setError('Every row needs a department, series, course, teacher and room.');
        return;
      }
      if (r.days.length === 0) {
        setError(`Pick at least one day for ${r.courseCode || 'a row'} (or use "All week").`);
        return;
      }
      if (r.pairEnabled) {
        if (!r.pair.courseCode || !r.pair.teacher || !r.pair.room) {
          setError(`Fill in the paired lab for ${r.courseCode}, or turn pairing off.`);
          return;
        }
        if (Number(r.credit) !== Number(r.pair.credit)) {
          setError(`Paired labs must match credit: ${r.courseCode} is ${r.credit} Cr but ${r.pair.courseCode} is ${r.pair.credit} Cr.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        classes: rows.map((r) => ({
          department: r.department,
          batch: r.batch,
          courseCode: r.courseCode,
          courseTitle: r.courseTitle,
          credit: r.credit,
          teacher: r.teacher,
          room: r.room,
          type: r.type,
          color: r.color,
          days: r.days,
          pair: r.pairEnabled ? r.pair : null,
        })),
      };
      const { data } = await api.post('/api/dynamic-routines/generate', payload);
      setSkipped(data.skipped || []);
      if (data.created?.length) setToast(`Placed ${data.created.length} slot(s) automatically.`);
      if (data.skipped?.length) setError(`${data.skipped.length} slot(s) could not be placed — see the list below.`);
      setRows([emptyRow(user)]);
      fetchRoutines();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong generating the routine.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slot) {
    if (!confirm(`Remove ${slot.courseCode} on ${slot.day}?`)) return;
    setError('');
    try {
      await api.delete(`/api/dynamic-routines/${slot._id}`);
      setToast('Slot removed.');
      fetchRoutines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleClearAll() {
    if (!confirm('Clear all your dynamic routine slots? This cannot be undone.')) return;
    setError('');
    try {
      const params = {};
      if (user?.department) params.department = user.department;
      await api.delete('/api/dynamic-routines', { params });
      setToast('Dynamic routine cleared.');
      fetchRoutines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear');
    }
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <Notification message={toast} onClose={() => setToast('')} />
      <RoutineHeader />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-blue-950">Dynamic Routine</h2>
        <button
          onClick={handleClearAll}
          type="button"
          className="text-sm text-red-600 hover:text-red-700 underline underline-offset-2"
        >
          Clear all
        </button>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

      <form onSubmit={handleGenerate} className="space-y-4">
        {rows.map((row, idx) => (
          <ClassRow
            key={row.key}
            row={row}
            index={idx}
            canRemove={rows.length > 1}
            onRemove={() => removeRow(row.key)}
            onUpdate={(patch) => updateRow(row.key, patch)}
            onSeriesChange={(v) => handleSeriesChange(row.key, v)}
            onCourseCodeChange={(v) => handleCourseCodeChange(row.key, row, v)}
            onCourseTitleChange={(v) => handleCourseTitleChange(row.key, row, v)}
            onPairCourseCodeChange={(v) => handlePairCourseCodeChange(row.key, row, v)}
            onPairCourseTitleChange={(v) => handlePairCourseTitleChange(row.key, row, v)}
            onPairUpdate={(patch) => updatePair(row.key, patch)}
            onToggleDay={(d) => toggleDay(row.key, d)}
            onToggleAllWeek={() => toggleAllWeek(row.key)}
          />
        ))}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition font-medium text-slate-700"
          >
            + Add another class
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-900 text-white px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium transition shadow-sm"
          >
            {submitting ? 'Generating…' : 'Generate Routine'}
          </button>
        </div>
      </form>

      {skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-800 mb-2">Couldn't be placed automatically:</p>
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
        <h3 className="font-semibold mb-2 text-slate-700">Resulting Routine</h3>
        <RoutineGrid routines={routines} onDelete={handleDelete} currentUser={user} />
      </div>
    </div>
  );
}

function ClassRow({
  row, index, canRemove, onRemove, onUpdate,
  onSeriesChange, onCourseCodeChange, onCourseTitleChange,
  onPairCourseCodeChange, onPairCourseTitleChange, onPairUpdate,
  onToggleDay, onToggleAllWeek,
}) {
  const courses = useMemo(() => coursesFor(row.batch), [row.batch]);
  const rooms = useMemo(() => roomsFor(row.type), [row.type]);
  const pairableCourses = useMemo(
    () => courses.filter((c) => c.type === 'lab' && c.credit === row.credit && c.code !== row.courseCode),
    [courses, row.credit, row.courseCode]
  );

  return (
    <div className="bg-white shadow-sm rounded-2xl p-5 space-y-4 border border-slate-200">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-blue-950">Class #{index + 1}</h3>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-red-600 text-sm underline underline-offset-2">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          value={row.department}
          onChange={(e) => onUpdate({ department: e.target.value })}
          placeholder="Department (e.g. ECE)"
          className="border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
          required
        />

        <select
          value={row.batch}
          onChange={(e) => onSeriesChange(e.target.value)}
          className="border border-slate-300 p-2 rounded-lg col-span-2"
          required
        >
          <option value="" disabled>Select series…</option>
          {SERIES_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={row.type}
          onChange={(e) => onUpdate({ type: e.target.value, courseCode: '', courseTitle: '', credit: '', room: '' })}
          className="border border-slate-300 p-2 rounded-lg"
        >
          <option value="class">Class (50 min)</option>
          <option value="lab">Lab (2h30m)</option>
        </select>

        <select
          value={row.courseCode}
          onChange={(e) => onCourseCodeChange(e.target.value)}
          className="border border-slate-300 p-2 rounded-lg"
          disabled={!row.batch}
          required
        >
          <option value="" disabled>{row.batch ? 'Course code…' : 'Pick a series first'}</option>
          {courses.filter((c) => c.type === row.type).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
        <select
          value={row.courseTitle}
          onChange={(e) => onCourseTitleChange(e.target.value)}
          className="border border-slate-300 p-2 rounded-lg"
          disabled={!row.batch}
        >
          <option value="" disabled>{row.batch ? 'Course title…' : 'Pick a series first'}</option>
          {courses.filter((c) => c.type === row.type).map((c) => <option key={c.code} value={c.title}>{c.title}</option>)}
        </select>
        {row.credit !== '' && (
          <div className="flex items-center">
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {row.credit} Cr
            </span>
          </div>
        )}

        <select value={row.teacher} onChange={(e) => onUpdate({ teacher: e.target.value })} className="border border-slate-300 p-2 rounded-lg" required>
          <option value="" disabled>Teacher…</option>
          {TEACHERS.map((t) => <option key={t.initial + t.name} value={t.initial}>{t.name} ({t.initial})</option>)}
        </select>
        <select value={row.room} onChange={(e) => onUpdate({ room: e.target.value })} className="border border-slate-300 p-2 rounded-lg" required>
          <option value="" disabled>Room…</option>
          {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={row.color} onChange={(e) => onUpdate({ color: e.target.value })} className="border border-slate-300 p-2 rounded-lg">
          {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {row.type === 'lab' && (
        <div className="border-t pt-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={row.pairEnabled}
              onChange={(e) => onUpdate({ pairEnabled: e.target.checked })}
              disabled={row.credit === ''}
            />
            Pair a second lab in this same slot (same batch, matching credit)
          </label>

          {row.pairEnabled && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 bg-slate-50 rounded-xl p-3">
              <select
                value={row.pair.courseCode}
                onChange={(e) => onPairCourseCodeChange(e.target.value)}
                className="border border-slate-300 p-2 rounded-lg"
                required
              >
                <option value="" disabled>Paired course code…</option>
                {pairableCourses.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <select
                value={row.pair.courseTitle}
                onChange={(e) => onPairCourseTitleChange(e.target.value)}
                className="border border-slate-300 p-2 rounded-lg"
              >
                <option value="" disabled>Paired course title…</option>
                {pairableCourses.map((c) => <option key={c.code} value={c.title}>{c.title}</option>)}
              </select>
              <select value={row.pair.teacher} onChange={(e) => onPairUpdate({ teacher: e.target.value })} className="border border-slate-300 p-2 rounded-lg" required>
                <option value="" disabled>Paired teacher…</option>
                {TEACHERS.map((t) => <option key={t.initial + t.name} value={t.initial}>{t.name} ({t.initial})</option>)}
              </select>
              <select value={row.pair.room} onChange={(e) => onPairUpdate({ room: e.target.value })} className="border border-slate-300 p-2 rounded-lg" required>
                <option value="" disabled>Paired room…</option>
                {roomsFor('lab').filter((r) => r !== row.room).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={row.pair.color} onChange={(e) => onPairUpdate({ color: e.target.value })} className="border border-slate-300 p-2 rounded-lg col-span-2">
                {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {pairableCourses.length === 0 && (
                <p className="col-span-2 md:col-span-4 text-xs text-amber-700">
                  No other {row.credit}-credit lab found in this series to pair with.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">Which day(s)?</p>
        <div className="flex flex-wrap gap-2 items-center">
          {DAYS.map((d) => (
            <label
              key={d}
              className={`flex items-center gap-1 text-sm border rounded-full px-3 py-1 cursor-pointer transition ${
                row.days.includes(d) ? 'bg-sky-500 text-white border-sky-500' : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input type="checkbox" className="hidden" checked={row.days.includes(d)} onChange={() => onToggleDay(d)} />
              {d}
            </label>
          ))}
          <button type="button" onClick={onToggleAllWeek} className="text-xs underline text-blue-900 ml-2">
            {DAYS.every((d) => row.days.includes(d)) ? 'Clear all' : 'All week'}
          </button>
        </div>
      </div>
    </div>
  );
}
