import React, { useState, useEffect, useMemo } from 'react';
import { PERIODS, BLOCKS, DAYS } from '../schedule';
import { useAuth } from '../context/AuthContext';
import courseCatalog from '../data/courseCatalog.json';
import { TEACHERS } from '../context/teachers';
import { roomsFor } from '../context/rooms';
import { COLOR_OPTIONS, DEFAULT_COLOR } from '../context/colors';

const SERIES_OPTIONS = Object.keys(courseCatalog);

const emptyForm = {
  department: '',
  batch: '',
  section: '',
  day: 'Saturday',
  type: 'class',
  period: 1,
  block: 'A',
  courseCode: '',
  courseTitle: '',
  teacher: '',
  room: '',
  color: DEFAULT_COLOR,
  labGroup: '',
  isCT: false,
  isQuiz: false,
};

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
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSeriesChange(e) {
    const batch = e.target.value;
    setForm((f) => ({ ...f, batch, courseCode: '', courseTitle: '' }));
  }

  function handleCourseCodeChange(e) {
    const code = e.target.value;
    const match = courses.find((c) => c.code === code);
    setForm((f) => ({
      ...f,
      courseCode: code,
      courseTitle: match?.title || '',
      type: match?.type || f.type,
      labGroup: match?.type === 'lab' ? '1st 30' : f.labGroup,
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
      labGroup: match?.type === 'lab' ? '1st 30' : f.labGroup,
    }));
  }

  function handleTypeChange(e) {
    const newType = e.target.value;
    setForm((f) => ({
      ...f,
      type: newType,
      room: '',
      labGroup: newType === 'lab' ? '1st 30' : '',
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  const selectCls =
    'w-full border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-white border border-slate-200 shadow-xl rounded-2xl p-5 sm:p-6 space-y-5 max-w-4xl transition-all"
    >
      <span className="absolute left-0 top-6 bottom-6 w-1.5 rounded-full bg-gradient-to-b from-sky-500 to-blue-800" />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 pl-2">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-2">
            <span>{editingSlot ? '✏️ Edit Routine Slot' : '➕ Add Routine Slot'}</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure schedule details, class badges, and lab groups with modern options
          </p>
        </div>
        {form.type === 'lab' && (
          <span className="bg-sky-100 text-sky-900 text-xs font-extrabold px-3 py-1 rounded-full border border-sky-200 shadow-sm">
            🔬 2h 30m Lab Session
          </span>
        )}
      </div>

      {error && (
        <p className="text-red-700 text-sm bg-red-50 border border-red-200 p-3 rounded-xl shadow-sm">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pl-2">
        {/* Department & Section */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            Department <span className="text-red-500">*</span>
          </label>
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="e.g. ECE"
            className={selectCls}
            required
          />
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            Section (Optional)
          </label>
          <input
            name="section"
            value={form.section}
            onChange={handleChange}
            placeholder="e.g. A"
            className={selectCls}
          />
        </div>

        {/* Series Selection */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-sky-800 mb-1 block">
            🎯 Series / Batch <span className="text-red-500">*</span>
          </label>
          <select
            name="batch"
            value={form.batch}
            onChange={handleSeriesChange}
            className={`${selectCls} bg-sky-50/80 border-sky-300 font-bold text-sky-950`}
            required
          >
            <option value="" disabled>Select series…</option>
            {SERIES_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Day & Type */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            📅 Schedule Day <span className="text-red-500">*</span>
          </label>
          <select name="day" value={form.day} onChange={handleChange} className={selectCls}>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            ⚙️ Slot Type <span className="text-red-500">*</span>
          </label>
          <select name="type" value={form.type} onChange={handleTypeChange} className={selectCls}>
            <option value="class">Class (50 min)</option>
            <option value="lab">Lab (2h30m)</option>
          </select>
        </div>

        {/* Period or Block */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            ⏰ {form.type === 'class' ? 'Class Period' : 'Lab Block'} <span className="text-red-500">*</span>
          </label>
          {form.type === 'class' ? (
            <select name="period" value={form.period} onChange={handleChange} className={selectCls}>
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  Period {p.id} · {p.start}–{p.end}
                </option>
              ))}
            </select>
          ) : (
            <select name="block" value={form.block} onChange={handleChange} className={selectCls}>
              {Object.entries(BLOCKS).map(([key, b]) => (
                <option key={key} value={key}>
                  Block {key} · {b.start}–{b.end}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Course Code & Title */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            📚 Course Code <span className="text-red-500">*</span>
          </label>
          <select
            name="courseCode"
            value={form.courseCode}
            onChange={handleCourseCodeChange}
            className={selectCls}
            required
            disabled={!form.batch}
          >
            <option value="" disabled>{form.batch ? 'Pick course code…' : 'Select a series first'}</option>
            {courses.filter((c) => c.type === form.type).map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            📖 Course Title
          </label>
          <select
            name="courseTitle"
            value={form.courseTitle}
            onChange={handleCourseTitleChange}
            className={selectCls}
            disabled={!form.batch}
          >
            <option value="" disabled>{form.batch ? 'Pick course title…' : 'Select a series first'}</option>
            {courses.filter((c) => c.type === form.type).map((c) => (
              <option key={c.code} value={c.title}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Teacher & Room */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            👨‍🏫 Teacher <span className="text-red-500">*</span>
          </label>
          <select name="teacher" value={form.teacher} onChange={handleChange} className={selectCls} required>
            <option value="" disabled>Select teacher…</option>
            {TEACHERS.map((t) => (
              <option key={t.initial + t.name} value={t.initial}>{t.name} ({t.initial})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            🏫 Room <span className="text-red-500">*</span>
          </label>
          <select name="room" value={form.room} onChange={handleChange} className={selectCls} required>
            <option value="" disabled>Select room…</option>
            {rooms.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Lab Group & Color */}
        {form.type === 'lab' && (
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
              👥 Student Lab Group
            </label>
            <select name="labGroup" value={form.labGroup} onChange={handleChange} className={selectCls}>
              <option value="1st 30">Lab Option: 1st 30 (Group A)</option>
              <option value="2nd 30">Lab Option: 2nd 30 (Group B)</option>
              <option value="Both">Lab Option: Full Batch / Both</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 mb-1 block">
            🎨 Card Color Theme
          </label>
          <select name="color" value={form.color} onChange={handleChange} className={selectCls}>
            {COLOR_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Special Options: CT & Quiz Toggles */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-4 items-center pl-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Special Options:</span>
        <label className="inline-flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold text-amber-900 transition-colors shadow-sm">
          <input
            type="checkbox"
            name="isCT"
            checked={form.isCT}
            onChange={handleChange}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
          />
          <span>📝 Class Test (CT) Badge</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2 rounded-xl text-xs font-bold text-purple-900 transition-colors shadow-sm">
          <input
            type="checkbox"
            name="isQuiz"
            checked={form.isQuiz}
            onChange={handleChange}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
          />
          <span>⚡ Quiz Option Badge</span>
        </label>
      </div>

      {/* Submit / Cancel Action Buttons */}
      <div className="flex items-center gap-3 pt-2 pl-2">
        <button
          type="submit"
          className="bg-gradient-to-r from-sky-600 to-blue-900 hover:from-sky-500 hover:to-blue-800 text-white font-extrabold px-7 py-2.5 rounded-xl text-sm shadow-md transition-all active:scale-98"
        >
          {editingSlot ? 'Save Slot Changes' : 'Add Slot to Routine'}
        </button>

        {editingSlot && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 text-sm transition-all"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}