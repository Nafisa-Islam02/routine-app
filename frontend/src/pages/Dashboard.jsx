import React from 'react';
import { useAuth } from '../context/AuthContext';
import RoutineView from './RoutineView';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100/70">
      {/* Hero Welcome Surface */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 sm:px-10 py-6 shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full text-xs font-bold border border-sky-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Schedule Sync
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {user?.name || 'Student'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              <span className="text-sky-300 font-bold uppercase">{user?.role}</span> &middot; {user?.department || 'Engineering'} Department
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 rounded-2xl text-slate-200 text-xs flex items-center gap-2">
              <span className="text-base">📅</span>
              <div>
                <p className="font-bold text-white leading-tight">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p className="text-[10px] text-slate-400">Class Academic Calendar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RoutineView />
    </div>
  );
}
