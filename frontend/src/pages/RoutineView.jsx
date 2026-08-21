import React, { useEffect, useState, useCallback } from 'react';
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
  const [department, setDepartment] = useState(user?.department || '');
  const [toast, setToast] = useState('');

  const fetchRoutines = useCallback(async () => {
    const params = {};
    if (department) params.department = department;
    const { data } = await api.get('/api/routines', { params });
    setRoutines(data);
  }, [department]);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  // Listen for live updates from the server and re-fetch when relevant
  useEffect(() => {
    function handleUpdate(payload) {
      const relevant = !department || payload.department === department;
      if (relevant) {
        setToast(`Routine updated: a class was ${payload.type}.`);
        fetchRoutines();
      }
    }
    socket.on('routineUpdated', handleUpdate);
    return () => socket.off('routineUpdated', handleUpdate);
  }, [department, fetchRoutines]);

  return (
    <div className="p-6">
      <Notification message={toast} onClose={() => setToast('')} />
      <RoutineHeader />
      <div className="flex items-center justify-between my-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold">Class Routine</h2>
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Department (e.g. ECE)"
          className="border p-2 rounded text-sm"
        />
      </div>
      <RoutineGrid routines={routines} />
      <RoutineLegend />
    </div>
  );
}
