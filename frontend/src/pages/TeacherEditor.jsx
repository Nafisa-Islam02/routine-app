import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import RoutineGrid from '../components/RoutineGrid';
import RoutineForm from '../components/RoutineForm';
import RoutineHeader from '../components/RoutineHeader';
import RoutineLegend from '../components/RoutineLegend';
import Notification from '../components/Notification';

export default function TeacherEditor() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);
  const [showForm, setShowForm] = useState(true); // Open directly as requested
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const formRef = useRef(null);

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

  async function handleSubmit(form) {
    setError('');
    try {
      if (editingSlot && editingSlot._id) {
        await api.put(`/api/routines/${editingSlot._id}`, form);
        setToast('Slot updated.');
      } else {
        await api.post('/api/routines', form);
        setToast('Slot added successfully.');
      }
      setEditingSlot(null);
      fetchRoutines();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong saving the slot');
    }
  }

  async function handleDelete(slot) {
    if (!confirm(`Delete ${slot.courseCode} on ${slot.day}?`)) return;
    setError('');
    try {
      await api.delete(`/api/routines/${slot._id}`);
      setToast('Slot deleted.');
      fetchRoutines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  }

  function handleEdit(slot) {
    setEditingSlot(slot);
    setShowForm(true);
    setError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleEmptyCellClick(targetDay, targetPeriod, targetBlock, batch) {
    setEditingSlot({
      department: user?.department || '',
      batch: batch || '',
      day: targetDay || 'Saturday',
      type: targetBlock ? 'lab' : 'class',
      period: targetPeriod || 1,
      block: targetBlock || 'A',
      courseCode: '',
      courseTitle: '',
      teacher: user?.role === 'teacher' ? user.name : '',
      room: '',
      isCT: false,
      isQuiz: false,
    });
    setShowForm(true);
    setError('');
    setToast(`Selected ${targetDay} ${targetBlock ? 'Block ' + targetBlock : 'Period ' + targetPeriod}. Complete details below!`);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Notification message={toast} onClose={() => setToast('')} />

      {/* Routine Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <RoutineHeader />
      </div>

      {/* Control Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Routine Slots</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create or edit class schedules &middot; Click any empty cell in the matrix to pre-select time
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSlot(null);
            setShowForm(!showForm);
            setError('');
          }}
          className="bg-gradient-to-r from-sky-600 to-blue-900 hover:from-sky-500 hover:to-blue-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
        >
          {showForm ? 'Hide Slot Form' : '+ Add Slot'}
        </button>
      </div>

      {/* Add / Edit Form Surface */}
      {showForm && (
        <div ref={formRef}>
          <RoutineForm
            editingSlot={editingSlot}
            onSubmit={handleSubmit}
            onCancel={() => {
              setEditingSlot(null);
              setShowForm(false);
            }}
            error={error}
          />
        </div>
      )}

      {/* Routine Grid Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-extrabold text-slate-800 text-base uppercase tracking-tight">
            Full Department Routine Matrix
          </h3>
          {user?.role === 'teacher' && (
            <span className="text-xs text-sky-700 font-semibold bg-sky-50 px-3 py-1 rounded-full">
              Teacher Mode: You can edit slots created by you
            </span>
          )}
        </div>
        
        <RoutineGrid
          routines={routines}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onEmptyCellClick={handleEmptyCellClick}
          currentUser={user}
        />
      </div>

      {/* Modern Teacher & Lab Legend */}
      <RoutineLegend />
    </div>
  );
}
