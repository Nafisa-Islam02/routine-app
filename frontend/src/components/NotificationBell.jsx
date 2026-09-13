import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const params = {};
      if (user.department) params.department = user.department;
      const { data } = await api.get('/api/notifications', { params });
      setNotifications(data);
    } catch {
      // Non-critical — quietly ignore if this fails.
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    function handleNew(note) {
      setNotifications((list) => [note, ...list].slice(0, 50));
      setUnread((n) => n + 1);
    }
    socket.on('notification', handleNew);
    return () => socket.off('notification', handleNew);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => { setOpen((o) => !o); setUnread(0); }}
        className="relative p-2 rounded-full hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-gray-800 rounded-xl shadow-2xl border border-slate-200 z-50">
          <div className="px-4 py-3 border-b font-semibold text-blue-950 sticky top-0 bg-white rounded-t-xl">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 italic">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n._id} className="px-4 py-3 text-sm hover:bg-slate-50">
                  <p>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {n.source === 'dynamic-routine' ? 'Dynamic Routine' : 'Routine'} · {timeAgo(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
