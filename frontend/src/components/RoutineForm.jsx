
import React, { useState, useEffect, useMemo } from 'react';
import { PERIODS, BLOCKS, DAYS } from '../schedule';
import { useAuth } from '../context/AuthContext';
import courseCatalog from '../data/courseCatalog.json';
import { TEACHERS } from '../context/teachers';
import { roomsFor } from '../context/rooms';
import { COLOR_OPTIONS, DEFAULT_COLOR } from '../context/colors';

const SERIES_OPTIONS = Object.keys(courseCatalog);

const emptyForm = {
  department: '', batch: '', section: '', day: 'Saturday',
  type: 'class', period: 1, block: 'A',
  courseCode: '', courseTitle: '', teacher: '', room: '', color: DEFAULT_COLOR,
};

// editingSlot: pass an existing routine object to pre-fill for editing, or null for "create new"
export default function RoutineForm({ editingSlot, onSubmit, onCancel, error }) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingSlot) {
      setForm({ ...emptyForm, ...editingSlot });
    } else {
      setForm({
        ...emptyForm,
        department: user?.department || '',
        teacher: user?.role === 'teacher' ? user.name : '',
      });
    }
  }, [editingSlot, user]);

  const courses = useMemo(() => courseCatalog[form.batch] || [], [form.batch]);
  const rooms = useMemo(() => roomsFor(form.type), [form.type]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSeriesChange(e) {
    // Changing the series invalidates any previously chosen course from a different series.
    setForm((f) => ({ ...f, batch: e.target.value, courseCode: '', courseTitle: '' }));
  }

  function handleCourseCodeChange(e) {
    const code = e.target.value;
    const match = courses.find((c) => c.code === code);
    setForm((f) => ({
      ...f,
      courseCode: code,
      courseTitle: match?.title || '',
      type: match?.type || f.type,
    }));
  }

  function handleCourseTitleChange(e) {
    const title = e.target.value;
    const match = courses.find((c) => c.title === title);
    setForm((f) => ({
      ...f,
      courseTitle: title,
      courseCode: match?.code || '',
      type: match?.type || f.type,
    }));
  }

  function handleTypeChange(e) {
    // Room list depends on type, so reset room when it changes.
    setForm((f) => ({ ...f, type: e.target.value, room: '' }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 space-y-4 max-w-2xl">
      <h3 className="font-bold text-lg text-blue-950">{editingSlot ? 'Edit Slot' : 'Add Slot'}</h3>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <input
          name="department" value={form.department} onChange={handleChange}
          placeholder="Department (e.g. ECE)"
          className="border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
          required
        />
        <input
          name="section" value={form.section} onChange={handleChange}
          placeholder="Section (optional)"
          className="border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
        />

        <select
          name="batch" value={form.batch} onChange={handleSeriesChange}
          className="border border-slate-300 p-2 rounded-lg col-span-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          required
        >
          <option value="" disabled>Select series…</option>
          {SERIES_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select name="day" value={form.day} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg">
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select name="type" value={form.type} onChange={handleTypeChange} className="border border-slate-300 p-2 rounded-lg">
          <option value="class">Class (50 min)</option>
          <option value="lab">Lab (2h30m)</option>
        </select>

        {form.type === 'class' ? (
          <select name="period" value={form.period} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg col-span-2">
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                Period {p.id} · {p.start}–{p.end}
              </option>
            ))}
          </select>
        ) : (
          <select name="block" value={form.block} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg col-span-2">
            {Object.entries(BLOCKS).map(([key, b]) => (
              <option key={key} value={key}>
                Block {key} · {b.start}–{b.end}
              </option>
            ))}
          </select>
        )}

        <select
          name="courseCode" value={form.courseCode} onChange={handleCourseCodeChange}
          className="border border-slate-300 p-2 rounded-lg" required disabled={!form.batch}
        >
          <option value="" disabled>{form.batch ? 'Course code…' : 'Pick a series first'}</option>
          {courses.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>

        <select
          name="courseTitle" value={form.courseTitle} onChange={handleCourseTitleChange}
          className="border border-slate-300 p-2 rounded-lg" disabled={!form.batch}
        >
          <option value="" disabled>{form.batch ? 'Course title…' : 'Pick a series first'}</option>
          {courses.map((c) => <option key={c.code} value={c.title}>{c.title}</option>)}
        </select>

        <select name="teacher" value={form.teacher} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg" required>
          <option value="" disabled>Teacher…</option>
          {TEACHERS.map((t) => (
            <option key={t.initial + t.name} value={t.initial}>{t.name} ({t.initial})</option>
          ))}
        </select>

        <select name="room" value={form.room} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg" required>
          <option value="" disabled>Room…</option>
          {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select name="color" value={form.color} onChange={handleChange} className="border border-slate-300 p-2 rounded-lg col-span-2">
          {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition">
          {editingSlot ? 'Save Changes' : 'Add Slot'}
        </button>

        {editingSlot && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}