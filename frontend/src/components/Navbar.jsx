import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-blue-900 text-white">
      <Link to="/" className="font-bold text-lg">Routine App</Link>
      <div className="flex items-center gap-4">
        {user && <Link to="/dashboard">Dashboard</Link>}
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Link to="/teacher">Manage Routine</Link>
        )}
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Link to="/dynamic-routine">Dynamic Routine</Link>
        )}
        {user ? (
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded"
          >
            Logout ({user.name})
          </button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
