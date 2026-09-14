import React, { useMemo } from 'react';
import { DAYS, PERIODS, BLOCKS } from '../schedule';
import { COLOR_CLASSES } from '../context/colors';

const BLOCK_KEYS = ['A', 'B', 'C'];

// One weekly, print-style sheet for a SINGLE series/batch — days as rows,
// periods as columns, matching the hand-made routine sheet layout (course
// code, teacher initials, and room per cell).
export default function WeeklySheet({ batch, routines }) {
  const slots = useMemo(() => routines.filter((r) => r.batch === batch), [routines, batch]);

  function findClass(day, periodId) {
    return slots.find((r) => r.day === day && r.type === 'class' && Number(r.period) === periodId);
  }
  function findLabs(day, blockKey) {
    return slots.filter((r) => r.day === day && r.type === 'lab' && r.block === blockKey);
  }

  if (!batch) {
    return <p className="text-sm text-slate-400 italic p-4">Pick a series to see its weekly sheet.</p>;
  }

  if (slots.length === 0) {
    return <p className="text-sm text-slate-400 italic p-4">No classes placed for this series yet.</p>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:shadow-none print:border-0">
      <div className="overflow-x-auto">
        <div
          className="grid text-[11px] min-w-max"
          style={{
            gridTemplateColumns:
              '150px repeat(3,minmax(72px,1fr)) 26px repeat(3,minmax(72px,1fr)) 26px repeat(3,minmax(72px,1fr))',
          }}
        >
          <div className="bg-blue-950 text-white p-2 font-semibold flex items-center border-b border-blue-900">TIME / DAY</div>
          {PERIODS.slice(0, 3).map((p) => <TimeHeader key={p.id} p={p} />)}
          <div className="bg-slate-200 border-b" />
          {PERIODS.slice(3, 6).map((p) => <TimeHeader key={p.id} p={p} />)}
          <div className="bg-slate-200 border-b" />
          {PERIODS.slice(6, 9).map((p) => <TimeHeader key={p.id} p={p} />)}

          {DAYS.map((day) => (
            <React.Fragment key={day}>
              <div className="bg-emerald-50 border-t border-r p-2 font-medium flex items-center">{day}</div>
              {BLOCK_KEYS.map((blockKey, bi) => {
                const labs = findLabs(day, blockKey);
                return (
                  <React.Fragment key={blockKey}>
                    {labs.length > 0 ? (
                      <LabCell slots={labs} />
                    ) : (
                      BLOCKS[blockKey].periods.map((pid) => (
                        <SlotCell key={pid} slot={findClass(day, pid)} />
                      ))
                    )}
                    {bi < 2 && <div className="bg-slate-200 border-t" />}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeHeader({ p }) {
  return (
    <div className="text-center py-1.5 border-b border-r bg-amber-50 text-blue-900 leading-tight">
      <div>{p.start}</div>
      <div>{p.end}</div>
    </div>
  );
}

function SlotCell({ slot }) {
  const colorClass = COLOR_CLASSES[slot?.color ?? ''] ?? COLOR_CLASSES[''];
  return (
    <div className={`border-r border-t p-1 min-h-[54px] flex flex-col justify-center items-center text-center ${slot ? colorClass : 'bg-white'}`}>
      {slot && (
        <>
          <div className="flex items-center gap-0.5 justify-center mb-0.5">
            {slot.isCT && <span className="bg-amber-500 text-white font-extrabold text-[8px] px-1 rounded">CT</span>}
            {slot.isQuiz && <span className="bg-purple-600 text-white font-extrabold text-[8px] px-1 rounded">Quiz</span>}
            {slot.labGroup && <span className="bg-sky-600 text-white font-bold text-[8px] px-1 rounded">{slot.labGroup}</span>}
          </div>
          <div className="font-semibold leading-tight">{slot.courseCode}</div>
          <div className="leading-tight text-[10px]">{slot.teacher}</div>
          <div className="leading-tight text-[10px] opacity-80">{slot.room}</div>
        </>
      )}
    </div>
  );
}

function LabCell({ slots }) {
  const summary = slots.map((s) => `${s.courseCode}${s.labGroup ? ` (${s.labGroup})` : ''}`).join(' / ');

  return (
    <div className="border-r border-t flex min-h-[54px] relative" style={{ gridColumn: 'span 3' }}>
      {slots.length > 1 && (
        <div className="absolute top-0 left-0 right-0 bg-blue-950/80 text-white text-[7px] font-bold text-center py-0.2 z-10 truncate px-1">
          {summary}
        </div>
      )}
      {slots.map((slot, i) => {
        const colorClass = COLOR_CLASSES[slot?.color ?? ''] ?? COLOR_CLASSES[''];
        return (
          <div
            key={slot._id || i}
            className={`flex-1 p-1 ${slots.length > 1 ? 'pt-3' : ''} flex flex-col justify-center items-center text-center ${colorClass} ${i === 0 && slots.length > 1 ? 'border-r border-white/50' : ''}`}
          >
            <div className="flex items-center gap-0.5 justify-center mb-0.5">
              {slot.labGroup && <span className="bg-blue-950 text-white font-bold text-[8px] px-1 rounded">{slot.labGroup}</span>}
              {slot.isCT && <span className="bg-amber-500 text-white text-[8px] font-bold px-1 rounded">CT</span>}
              {slot.isQuiz && <span className="bg-purple-600 text-white text-[8px] font-bold px-1 rounded">Quiz</span>}
            </div>
            <div className="font-semibold leading-tight">{slot.courseCode}</div>
            <div className="leading-tight text-[10px]">{slot.teacher}</div>
            <div className="leading-tight text-[10px] opacity-80">{slot.room}</div>
          </div>
        );
      })}
    </div>
  );
}
