import React, { useMemo } from 'react';
import { DAYS, PERIODS, BLOCKS } from '../schedule';

const BLOCK_KEYS = ['A', 'B', 'C'];

// Color mapping tuned specifically for the ECAT dark routine matrix layout (Image 1)
const ECAT_CARD_COLORS = {
  '': 'bg-[#1e293b] text-slate-100',
  blue: 'bg-[#0284c7] text-white',
  pink: 'bg-[#f472b6] text-white',
  yellow: 'bg-[#854d0e] text-amber-100',
  green: 'bg-[#34d399] text-slate-950 font-bold',
  teal: 'bg-[#2dd4bf] text-slate-950 font-bold',
  purple: 'bg-[#a855f7] text-white',
  orange: 'bg-[#ea580c] text-white',
  cyan: 'bg-[#06b6d4] text-white',
  gray: 'bg-[#475569] text-white',
  red: 'bg-[#ef4444] text-white',
  indigo: 'bg-[#6366f1] text-white',
  rose: 'bg-[#f43f5e] text-white',
  lime: 'bg-[#84cc16] text-slate-950 font-bold',
  neutral: 'bg-[#334155] text-white',
};

export default function WeeklySheet({ batch, routines }) {
  const slots = useMemo(() => {
    if (!routines || !batch) return [];
    return routines.filter((r) => r.batch === batch);
  }, [routines, batch]);

  function findClass(day, periodId) {
    return slots.find((r) => r.day === day && r.type === 'class' && Number(r.period) === periodId);
  }

  function findLabs(day, blockKey) {
    return slots.filter((r) => r.day === day && r.type === 'lab' && r.block === blockKey);
  }

  if (!batch) {
    return <p className="text-sm text-slate-400 italic p-4">Pick a series to see its weekly routine sheet.</p>;
  }

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden text-white print:border-0 print:p-0">
      {/* Printable Sheet title updated to "WEEKLY ROUTINE" as requested */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-black text-sm sm:text-base tracking-wider uppercase text-slate-100 flex items-center gap-2">
          <span>WEEKLY ROUTINE ({batch.toUpperCase()})</span>
        </h3>
        <span className="text-[10px] font-bold text-sky-400 bg-sky-950/70 border border-sky-800/60 px-2.5 py-0.5 rounded-full print:hidden">
          ECAT Routine Grid Format
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b101d]">
        <div
          className="grid text-xs min-w-max"
          style={{
            gridTemplateColumns:
              '130px repeat(3, minmax(88px, 1fr)) 18px repeat(3, minmax(88px, 1fr)) 18px repeat(3, minmax(88px, 1fr))',
          }}
        >
          {/* Header Row */}
          <div className="bg-[#1e293b] text-slate-100 p-2 font-black text-[11px] flex items-center justify-center border-b border-r border-slate-800 tracking-wider">
            TIME / DAY
          </div>
          {PERIODS.slice(0, 3).map((p) => <TimeHeader key={p.id} p={p} />)}
          <div className="bg-[#0d131f] border-b border-r border-slate-800" />
          {PERIODS.slice(3, 6).map((p) => <TimeHeader key={p.id} p={p} />)}
          <div className="bg-[#0d131f] border-b border-r border-slate-800" />
          {PERIODS.slice(6, 9).map((p) => <TimeHeader key={p.id} p={p} />)}

          {/* Days Rows */}
          {DAYS.map((day) => (
            <React.Fragment key={day}>
              <div className="bg-[#182030] text-slate-100 font-bold p-2.5 flex items-center justify-center border-t border-r border-slate-800 text-xs">
                {day}
              </div>
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
                    {bi < 2 && <div className="bg-[#0d131f] border-t border-r border-slate-800" />}
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
    <div className="text-center py-2 border-b border-r border-slate-800 bg-[#182030] text-slate-200 font-semibold leading-tight text-[11px]">
      <div className="font-extrabold text-white">{p.start}</div>
      <div className="text-[10px] text-slate-400">{p.end}</div>
    </div>
  );
}

function SlotCell({ slot }) {
  const colorClass = slot
    ? (ECAT_CARD_COLORS[slot.color] || ECAT_CARD_COLORS.blue)
    : 'bg-[#111722] hover:bg-[#151c2a]';

  return (
    <div
      className={`border-r border-t border-slate-800/80 p-1.5 min-h-[66px] flex flex-col justify-center items-center text-center transition-colors ${colorClass}`}
    >
      {slot && (
        <>
          <div className="flex items-center gap-1 justify-center mb-1">
            {slot.isQuiz && (
              <span className="bg-[#a855f7] text-white font-black text-[8px] px-1.5 py-0.2 rounded-full shadow-sm">
                Quiz
              </span>
            )}
            {slot.isCT && (
              <span className="bg-[#f59e0b] text-slate-950 font-black text-[8px] px-1.5 py-0.2 rounded-full shadow-sm">
                CT
              </span>
            )}
            {slot.labGroup && (
              <span className="bg-slate-900/80 text-white font-bold text-[8px] px-1.5 py-0.2 rounded-full">
                {slot.labGroup}
              </span>
            )}
          </div>
          <div className="font-black text-xs tracking-tight leading-tight drop-shadow-sm">{slot.courseCode}</div>
          <div className="leading-tight text-[10px] font-semibold mt-0.5 opacity-90">{slot.teacher}</div>
          <div className="leading-tight text-[9px] font-medium opacity-80">{slot.room}</div>
        </>
      )}
    </div>
  );
}

function LabCell({ slots }) {
  const summary = slots.map((s) => `${s.courseCode}${s.labGroup ? ` (${s.labGroup})` : ''}`).join(' / ');

  return (
    <div className="border-r border-t border-slate-800/80 flex min-h-[66px] relative" style={{ gridColumn: 'span 3' }}>
      {slots.length > 1 && (
        <div className="absolute top-0 left-0 right-0 bg-[#090d16]/90 text-slate-200 text-[8px] font-extrabold text-center py-0.2 z-10 truncate px-1">
          {summary}
        </div>
      )}
      {slots.map((slot, i) => {
        const colorClass = ECAT_CARD_COLORS[slot.color] || ECAT_CARD_COLORS.blue;
        return (
          <div
            key={slot._id || i}
            className={`flex-1 p-1.5 ${slots.length > 1 ? 'pt-3.5' : ''} flex flex-col justify-center items-center text-center ${colorClass} ${
              i === 0 && slots.length > 1 ? 'border-r border-slate-800/60' : ''
            }`}
          >
            <div className="flex items-center gap-1 justify-center mb-1">
              {slot.isQuiz && <span className="bg-[#a855f7] text-white font-black text-[8px] px-1 rounded-full">Quiz</span>}
              {slot.isCT && <span className="bg-[#f59e0b] text-slate-950 font-black text-[8px] px-1 rounded-full">CT</span>}
              {slot.labGroup && <span className="bg-slate-900/80 text-white font-bold text-[8px] px-1 rounded-full">{slot.labGroup}</span>}
            </div>
            <div className="font-black text-xs tracking-tight leading-tight">{slot.courseCode}</div>
            <div className="leading-tight text-[10px] font-semibold mt-0.5 opacity-90">{slot.teacher}</div>
            <div className="leading-tight text-[9px] font-medium opacity-80">{slot.room}</div>
          </div>
        );
      })}
    </div>
  );
}
