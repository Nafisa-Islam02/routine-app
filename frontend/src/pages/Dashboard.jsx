import React from 'react';
import { useAuth } from '../context/AuthContext';
import RoutineView from './RoutineView';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="bg-white p-4 border-b">
        <h1 className="text-lg font-semibold">Welcome, {user?.name} 👋</h1>
        <p className="text-sm text-gray-600">
          {user?.role} · {user?.department}
        </p>
      </div>
      <RoutineView />
    </div>
  );
}
