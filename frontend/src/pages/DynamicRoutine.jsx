import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { DAYS } from '../schedule';
import courseCatalog from '../data/courseCatalog.json';
import { TEACHERS } from '../context/teachers';
import { roomsFor } from '../context/rooms';
import { COLOR_OPTIONS, DEFAULT_COLOR } from '../context/colors';
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <Notification message={toast} onClose={() => setToast('')} />
      <RoutineHeader />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-950 tracking-tight">Dynamic Routine</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Auto-scheduled &middot; conflict-free</p>
          </div>
          <button
            onClick={handleClearAll}
            type="button"
            className="text-sm font-medium text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-3 py-1.5 rounded-full transition-colors"
          >
            Clear all
          </button>
        </div>

        {error && (
          <p className="text-red-700 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl shadow-sm">{error}</p>
        )}

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
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors font-medium text-slate-600 text-sm shadow-sm"
            >
              + Add another class
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-sky-600 to-blue-800 text-white px-6 py-2.5 rounded-xl hover:from-sky-500 hover:to-blue-700 disabled:opacity-50 font-semibold transition-all shadow-md shadow-blue-900/20 text-sm"
            >
              {submitting ? 'Generating…' : 'Generate Routine'}
            </button>
          </div>
        </form>

        {skipped.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm shadow-sm">
            <p className="font-semibold text-amber-800 mb-2">Couldn't be placed automatically:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              {skipped.map((s, i) => (
                <li key={i}>
                  <strong>{s.courseCode}</strong> on {s.day} ({s.teacher}, {s.room}) — {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2 text-slate-700 text-sm uppercase tracking-wide">Resulting Routine</h3>
          <RoutineGrid routines={routines} onDelete={handleDelete} currentUser={user} />
        </div>
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

  const inputCls =
    'border border-slate-200 bg-slate-50/60 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="relative bg-white shadow-sm hover:shadow-md rounded-2xl p-5 space-y-4 border border-slate-200 transition-shadow">
      <span className="absolute left-0 top-5 bottom-5 w-1 rounded-full bg-gradient-to-b from-sky-400 to-blue-700" />

      <div className="flex justify-between items-center pl-2">
        <h3 className="font-bold text-blue-950 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-950 text-white text-xs font-bold">
            {index + 1}
          </span>
          Class
        </h3>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-red-500 text-xs font-medium hover:underline">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-2">
        <input
          value={row.department}
          onChange={(e) => onUpdate({ department: e.target.value })}
          placeholder="Department (e.g. ECE)"
          className={inputCls}
          required
        />

        <select
          value={row.batch}
          onChange={(e) => onSeriesChange(e.target.value)}
          className={`${inputCls} col-span-2`}
          required
        >
          <option value="" disabled>Select series…</option>
          {SERIES_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={row.type}
          onChange={(e) => onUpdate({ type: e.target.value, courseCode: '', courseTitle: '', credit: '', room: '' })}
          className={inputCls}
        >
          <option value="class">Class (50 min)</option>
          <option value="lab">Lab (2h30m)</option>
        </select>

        <select
          value={row.courseCode}
          onChange={(e) => onCourseCodeChange(e.target.value)}
          className={inputCls}
          disabled={!row.batch}
          required
        >
          <option value="" disabled>{row.batch ? 'Course code…' : 'Pick a series first'}</option>
          {courses.filter((c) => c.type === row.type).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
        <select
          value={row.courseTitle}
          onChange={(e) => onCourseTitleChange(e.target.value)}
          className={inputCls}
          disabled={!row.batch}
        >
          <option value="" disabled>{row.batch ? 'Course title…' : 'Pick a series first'}</option>
          {courses.filter((c) => c.type === row.type).map((c) => <option key={c.code} value={c.title}>{c.title}</option>)}
        </select>
        {row.credit !== '' ? (
          <div className="flex items-center">
            <span className="text-xs font-semibold bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full">
              {row.credit} Cr
            </span>
          </div>
        ) : <div />}

        <select value={row.teacher} onChange={(e) => onUpdate({ teacher: e.target.value })} className={inputCls} required>
          <option value="" disabled>Teacher…</option>
          {TEACHERS.map((t) => <option key={t.initial + t.name} value={t.initial}>{t.name} ({t.initial})</option>)}
        </select>
        <select value={row.room} onChange={(e) => onUpdate({ room: e.target.value })} className={inputCls} required>
          <option value="" disabled>Room…</option>
          {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={row.color} onChange={(e) => onUpdate({ color: e.target.value })} className={inputCls}>
          {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {row.type === 'lab' && (
        <div className="border-t border-dashed border-slate-200 pt-4 ml-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={row.pairEnabled}
              onChange={(e) => onUpdate({ pairEnabled: e.target.checked })}
              disabled={row.credit === ''}
              className="w-4 h-4 accent-sky-600"
            />
            Pair a second lab in this same slot (same batch, matching credit)
          </label>

          {row.pairEnabled && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 bg-sky-50/70 rounded-2xl p-4 border border-sky-100">
              <select
                value={row.pair.courseCode}
                onChange={(e) => onPairCourseCodeChange(e.target.value)}
                className={inputCls}
                required
              >
                <option value="" disabled>Paired course code…</option>
                {pairableCourses.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <select
                value={row.pair.courseTitle}
                onChange={(e) => onPairCourseTitleChange(e.target.value)}
                className={inputCls}
              >
                <option value="" disabled>Paired course title…</option>
                {pairableCourses.map((c) => <option key={c.code} value={c.title}>{c.title}</option>)}
              </select>
              <select value={row.pair.teacher} onChange={(e) => onPairUpdate({ teacher: e.target.value })} className={inputCls} required>
                <option value="" disabled>Paired teacher…</option>
                {TEACHERS.map((t) => <option key={t.initial + t.name} value={t.initial}>{t.name} ({t.initial})</option>)}
              </select>
              <select value={row.pair.room} onChange={(e) => onPairUpdate({ room: e.target.value })} className={inputCls} required>
                <option value="" disabled>Paired room…</option>
                {roomsFor('lab').filter((r) => r !== row.room).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={row.pair.color} onChange={(e) => onPairUpdate({ color: e.target.value })} className={`${inputCls} col-span-2`}>
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

      <div className="pl-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Which day(s)?</p>
        <div className="flex flex-wrap gap-2 items-center">
          {DAYS.map((d) => (
            <label
              key={d}
              className={`flex items-center gap-1 text-sm border rounded-full px-3 py-1 cursor-pointer transition-colors ${
                row.days.includes(d)
                  ? 'bg-blue-950 text-white border-blue-950 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input type="checkbox" className="hidden" checked={row.days.includes(d)} onChange={() => onToggleDay(d)} />
              {d}
            </label>
          ))}
          <button type="button" onClick={onToggleAllWeek} className="text-xs font-semibold underline text-sky-700 ml-1">
            {DAYS.every((d) => row.days.includes(d)) ? 'Clear all' : 'All week'}
          </button>
        </div>
      </div>
    </div>
  );
}
