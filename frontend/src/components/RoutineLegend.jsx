import React, { useState } from 'react';
import teacherLegend from '../data/teacherLegend.json';
import labLegend from '../data/labLegend.json';

export default function RoutineLegend() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('teachers');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      <button
        type="button"
        className="w-full text-left px-5 py-3.5 font-bold text-slate-800 flex justify-between items-center bg-slate-50/70 hover:bg-slate-100/80 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📖</span>
          <span className="text-sm font-extrabold tracking-tight">Teacher &amp; Lab Reference Legend</span>
          <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
            {teacherLegend.length} Teachers &middot; {labLegend.length} Labs
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
          {open ? 'Collapse ▲' : 'Expand Legend ▼'}
        </span>
      </button>

      {open && (
        <div className="p-5 border-t border-slate-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'teachers'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              👩‍🏫 Teacher Initials ({teacherLegend.length})
            </button>
            <button
              onClick={() => setActiveTab('labs')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'labs'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🔬 Lab Rooms ({labLegend.length})
            </button>
          </div>

          {activeTab === 'teachers' ? (
            <div>
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-24">Initial</th>
                      <th className="p-2.5">Full Name &amp; Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teacherLegend.map((t, i) => (
                      <tr key={i} className="hover:bg-sky-50/50 transition-colors">
                        <td className="p-2.5 font-bold text-sky-700 bg-slate-50/50">{t.initial}</td>
                        <td className="p-2.5 font-medium text-slate-800">{t.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-24">Sl. No.</th>
                      <th className="p-2.5">Lab Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {labLegend.map((l, i) => (
                      <tr key={i} className="hover:bg-sky-50/50 transition-colors">
                        <td className="p-2.5 font-bold text-sky-700 bg-slate-50/50">{l.id}</td>
                        <td className="p-2.5 font-medium text-slate-800">{l.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
