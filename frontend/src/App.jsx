import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TeacherEditor from './pages/TeacherEditor';
import DynamicRoutine from './pages/DynamicRoutine';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <TeacherEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dynamic-routine"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <DynamicRoutine />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
