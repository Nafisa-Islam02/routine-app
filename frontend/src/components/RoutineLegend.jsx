import React, { useState } from 'react';
import teacherLegend from '../data/teacherLegend.json';
import labLegend from '../data/labLegend.json';

// Collapsible reference tables, same information as the small side tables
// on the original printed routine: which initials belong to which teacher,
// and what each lab number actually is.
export default function RoutineLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 border rounded bg-white">
      <button
        className="w-full text-left px-4 py-2 font-semibold text-blue-900 flex justify-between items-center"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Teacher &amp; Lab Legend</span>
        <span className="text-xs text-gray-500">{open ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      {open && (
        <div className="grid md:grid-cols-2 gap-4 p-4 pt-0 text-xs">
          <div>
            <h4 className="font-semibold mb-1 text-blue-900">Teacher's Initial</h4>
            <div className="max-h-80 overflow-y-auto border rounded">
              <table className="w-full">
                <thead className="bg-blue-50 sticky top-0">
                  <tr>
                    <th className="text-left p-1 border-b">Initial</th>
                    <th className="text-left p-1 border-b">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherLegend.map((t, i) => (
                    <tr key={i} className="odd:bg-gray-50">
                      <td className="p-1 border-b font-medium">{t.initial}</td>
                      <td className="p-1 border-b">{t.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1 text-blue-900">Lab</h4>
            <div className="max-h-80 overflow-y-auto border rounded">
              <table className="w-full">
                <thead className="bg-blue-50 sticky top-0">
                  <tr>
                    <th className="text-left p-1 border-b">Sl. No.</th>
                    <th className="text-left p-1 border-b">Lab</th>
                  </tr>
                </thead>
                <tbody>
                  {labLegend.map((l, i) => (
                    <tr key={i} className="odd:bg-gray-50">
                      <td className="p-1 border-b font-medium">{l.id}</td>
                      <td className="p-1 border-b">{l.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
