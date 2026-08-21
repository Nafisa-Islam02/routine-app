import React, { useEffect, useState, useCallback } from 'react';
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
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

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
      if (editingSlot) {
        await api.put(`/api/routines/${editingSlot._id}`, form);
        setToast('Slot updated.');
      } else {
        await api.post('/api/routines', form);
        setToast('Slot added.');
      }
      setEditingSlot(null);
      setShowForm(false);
      fetchRoutines();
    } catch (err) {
      // Conflict errors (409), permission errors (403) and validation errors (400)
      // all come through here with a clear message from the backend.
      setError(err.response?.data?.message || 'Something went wrong');
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
  }

  return (
    <div className="p-6 space-y-6">
      <Notification message={toast} onClose={() => setToast('')} />
      <RoutineHeader />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">Manage Routine</h2>
        <button
          onClick={() => { setEditingSlot(null); setShowForm(!showForm); setError(''); }}
          className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
        >
          {showForm ? 'Close Form' : '+ Add Slot'}
        </button>
      </div>

      {showForm && (
        <RoutineForm
          editingSlot={editingSlot}
          onSubmit={handleSubmit}
          onCancel={() => { setEditingSlot(null); setShowForm(false); }}
          error={error}
        />
      )}

      <div>
        <h3 className="font-semibold mb-2">
          Full Department Routine
          {user?.role === 'teacher' && (
            <span className="font-normal text-gray-500 text-sm"> — you can only edit/delete slots you added</span>
          )}
        </h3>
        <RoutineGrid routines={routines} onEdit={handleEdit} onDelete={handleDelete} currentUser={user} />
      </div>
      <RoutineLegend />
    </div>
  );
}
