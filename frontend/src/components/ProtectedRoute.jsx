import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap any page that needs login, optionally restricted to specific roles.
// Usage: <ProtectedRoute roles={['admin','teacher']}><TeacherEditor /></ProtectedRoute>
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
