import React, { useEffect, useState } from 'react';

// Simple toast that auto-dismisses. Call showToast(msg) via the setter passed in.
export default function Notification({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded shadow-lg z-50 max-w-sm">
      {message}
    </div>
  );
}
