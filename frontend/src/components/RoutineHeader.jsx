import React from 'react';

// Static title block that mirrors the header of the original routine sheet:
// university name, department, and the "effective from" date. Purely
// cosmetic — edit the text below if the department or term changes.
export default function RoutineHeader() {
  return (
    <div className="text-center py-2.5 bg-white">
      <h1 className="text-lg font-black text-blue-950 tracking-tight">
        Rajshahi University of Engineering &amp; Technology
      </h1>
      <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
        Department of Electrical &amp; Computer Engineering
      </p>
    </div>
  );
}
