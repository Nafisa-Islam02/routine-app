import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinkCls = (path) =>
    `px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive(path)
        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  return (
    <nav className="sticky top-0 z-40 glass-nav text-white px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-black text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-sky-300 transition-colors">
              Routine App
            </span>
            <span className="block text-[10px] font-semibold tracking-wider text-sky-400/80 -mt-1 uppercase">
              Smart Schedule
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-2">
          {user && (
            <Link to="/dashboard" className={navLinkCls('/dashboard')}>
              📊 Dashboard
            </Link>
          )}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Link to="/teacher" className={navLinkCls('/teacher')}>
              ✏️ Manage Routine
            </Link>
          )}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Link to="/dynamic-routine" className={navLinkCls('/dynamic-routine')}>
              ✨ Dynamic Routine
            </Link>
          )}
        </div>

        {/* Right Action Items */}
        <div className="hidden md:flex items-center gap-3">
          <NotificationBell />
          {user ? (
            <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 p-1 pl-3 rounded-2xl">
              <div className="text-left leading-none">
                <p className="text-xs font-bold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-sky-400 font-medium capitalize">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border border-red-500/30"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu & Bell Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-700/80 flex flex-col gap-2 pb-2">
          {user && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={navLinkCls('/dashboard')}
            >
              📊 Dashboard
            </Link>
          )}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Link
              to="/teacher"
              onClick={() => setMobileMenuOpen(false)}
              className={navLinkCls('/teacher')}
            >
              ✏️ Manage Routine
            </Link>
          )}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Link
              to="/dynamic-routine"
              onClick={() => setMobileMenuOpen(false)}
              className={navLinkCls('/dynamic-routine')}
            >
              ✨ Dynamic Routine
            </Link>
          )}
          {user ? (
            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-sky-400">{user.role} &middot; {user.department}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="bg-red-500/20 text-red-300 px-3 py-1 rounded-xl text-xs font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-sky-500 text-white text-center py-2 rounded-xl text-xs font-bold mt-1"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
