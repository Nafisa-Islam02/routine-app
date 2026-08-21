import React from 'react';

// Static title block that mirrors the header of the original routine sheet:
// university name, department, and the "effective from" date. Purely
// cosmetic — edit the text below if the department or term changes.
export default function RoutineHeader() {
  return (
    <div className="text-center py-3 border-b bg-white">
      <p className="italic text-xs text-gray-500">Heaven's Light is Our Guide</p>
      <h1 className="text-lg font-bold text-blue-950">
        Rajshahi University of Engineering &amp; Technology
      </h1>
      <p className="text-sm font-medium text-blue-900">Department of Electrical &amp; Computer Engineering</p>
      <p className="text-xs text-gray-600">Class routine (Effective from 10/01/2026)</p>
    </div>
  );
}
