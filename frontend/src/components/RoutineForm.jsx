import React, { useState, useEffect } from 'react';
import { PERIODS, BLOCKS, DAYS } from '../schedule';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  department: '', batch: '', section: '', day: 'Saturday',
  type: 'class', period: 1, block: 'A',
  courseCode: '', courseTitle: '', teacher: '', room: '', color: '',
};

const COLOR_OPTIONS = [
  { value: '', label: 'None (white)' },
  { value: 'yellow', label: 'Yellow — sessional/elective' },
  { value: 'cyan', label: 'Cyan — lab session' },
  { value: 'blue', label: 'Blue — sessional (HBK)' },
  { value: 'gray', label: 'Gray — theory highlight' },
  { value: 'orange', label: 'Orange — project course' },
  { value: 'neutral', label: 'Neutral — admin/non-class block' },
];

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

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded p-4 space-y-3 max-w-xl">
      <h3 className="font-bold text-lg">{editingSlot ? 'Edit Slot' : 'Add Slot'}</h3>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <input
          name="department" value={form.department} onChange={handleChange}
          placeholder="Department (e.g. ECE)" className="border p-2 rounded" required
        />
        <input
          name="section" value={form.section} onChange={handleChange}
          placeholder="Section (optional)" className="border p-2 rounded"
        />
        <input
          name="batch" value={form.batch} onChange={handleChange}
          placeholder='Batch / row label (e.g. "2nd Year Odd Semester 2024 Series")'
          className="border p-2 rounded col-span-2" required
        />

        <select name="day" value={form.day} onChange={handleChange} className="border p-2 rounded">
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select name="type" value={form.type} onChange={handleChange} className="border p-2 rounded">
          <option value="class">Class (50 min)</option>
          <option value="lab">Lab (2h30m)</option>
        </select>

        {form.type === 'class' ? (
          <select name="period" value={form.period} onChange={handleChange} className="border p-2 rounded col-span-2">
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                Period {p.id} · {p.start}–{p.end}
              </option>
            ))}
          </select>
        ) : (
          <select name="block" value={form.block} onChange={handleChange} className="border p-2 rounded col-span-2">
            {Object.entries(BLOCKS).map(([key, b]) => (
              <option key={key} value={key}>
                Block {key} · {b.start}–{b.end}
              </option>
            ))}
          </select>
        )}

        <p className="col-span-2 text-xs text-gray-500 -mt-1">
          Only valid class periods / lab blocks are selectable, so the 10:30–10:50 break and the
          1:20–2:30 lunch gap can never be booked.
        </p>

        <input
          name="courseCode" value={form.courseCode} onChange={handleChange}
          placeholder="Course code (e.g. ECE 2103)" className="border p-2 rounded" required
        />
        <input
          name="courseTitle" value={form.courseTitle} onChange={handleChange}
          placeholder="Course title (optional)" className="border p-2 rounded"
        />
        <input
          name="teacher" value={form.teacher} onChange={handleChange}
          placeholder="Teacher (initial or name)" className="border p-2 rounded" required
        />
        <input
          name="room" value={form.room} onChange={handleChange}
          placeholder="Room / lab (e.g. R-403)" className="border p-2 rounded" required
        />

        <select name="color" value={form.color} onChange={handleChange} className="border p-2 rounded col-span-2">
          {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
          {editingSlot ? 'Save Changes' : 'Add Slot'}
        </button>
        {editingSlot && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded border">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
