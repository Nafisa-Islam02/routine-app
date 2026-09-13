
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { DAYS, BLOCKS, PERIODS } from '../schedule';
import { COLOR_CLASSES } from '../context/colors';

const BLOCK_KEYS = ['A', 'B', 'C'];

// The canonical order the original sheet uses for the batch rows.
const BATCH_ORDER = [
  '1st Year Odd Semester 2025 Series',
  '2nd Year Odd Semester 2024 Series',
  '2nd Year Even Semester 2023 Series',
  '3rd Year Even Semester 2022 Series',
  '4th Year Odd Semester 2021 Series',
  'Semester 2-1 (24)',
];

function sortBatches(batches) {
  return [...batches].sort((a, b) => {
    const ai = BATCH_ORDER.indexOf(a);
    const bi = BATCH_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

const DAY_COLUMNS = `repeat(3, minmax(78px,1fr)) 16px repeat(3, minmax(78px,1fr)) 16px repeat(3, minmax(78px,1fr))`;

// Maps JS Date#getDay() (0=Sun..6=Sat) to our 5-day school week.
const JS_DAY_TO_NAME = { 6: 'Saturday', 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday' };

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// The two real gaps in the day: the 10:30-10:50 break and the 1:20-2:30 lunch gap.
const GAPS = [
  { id: 1, start: toMinutes(PERIODS[2].end), end: toMinutes(PERIODS[3].start) },
  { id: 2, start: toMinutes(PERIODS[5].end), end: toMinutes(PERIODS[6].start) },
];

// Hook: recomputes the pixel position of the "now" line inside `gridRef`
// every 30 seconds, by locating the live period/gap cell for today.
function useNowLine(gridRef) {
  const [pos, setPos] = useState(null); // { left, top, height } or null

  useEffect(() => {
    function update() {
      const grid = gridRef.current;
      if (!grid) return setPos(null);

      const now = new Date();
      const today = JS_DAY_TO_NAME[now.getDay()];
      if (!today) return setPos(null); // weekend — no classes, no line

      const mins = now.getHours() * 60 + now.getMinutes();
      let selector = null;
      let fraction = 0;

      const period = PERIODS.find((p) => mins >= toMinutes(p.start) && mins < toMinutes(p.end));
      if (period) {
        selector = `[data-role="period-header"][data-day="${today}"][data-period="${period.id}"]`;
        fraction = (mins - toMinutes(period.start)) / (toMinutes(period.end) - toMinutes(period.start));
      } else {
        const gap = GAPS.find((g) => mins >= g.start && mins < g.end);
        if (gap) {
          selector = `[data-role="gap-header"][data-day="${today}"][data-gap="${gap.id}"]`;
          fraction = (mins - gap.start) / (gap.end - gap.start);
        }
      }

      if (!selector) return setPos(null); // before 8:00 or after 5:00 — no line

      const cell = grid.querySelector(selector);
      if (!cell) return setPos(null);

      const gridRect = grid.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      setPos({
        left: cellRect.left - gridRect.left + cellRect.width * fraction,
        top: 0,
        height: gridRect.height,
      });
    }

    update();
    const interval = setInterval(update, 30000);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', update);
    };
  }, [gridRef]);

  return pos;
}

// routines: array of routine objects from the API
// onEdit/onDelete + currentUser: optional — only passed by pages that allow editing
export default function RoutineGrid({ routines, onEdit, onDelete, currentUser }) {
  const gridRef = useRef(null);
  const nowLine = useNowLine(gridRef);

  const batches = useMemo(() => {
    const set = new Set(routines.map((r) => r.batch));
    return sortBatches(Array.from(set));
  }, [routines]);

  function findClass(batch, day, periodId) {
    return routines.find(
      (r) => r.batch === batch && r.day === day && r.type === 'class' && Number(r.period) === periodId
    );
  }

  // Returns an array (0, 1, or 2 — a pair of labs sharing the same slot).
  function findLabs(batch, day, blockKey) {
    return routines.filter((r) => r.batch === batch && r.day === day && r.type === 'lab' && r.block === blockKey);
  }

  function canManage(slot) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.role === 'teacher' && String(slot.createdBy) === String(currentUser.id);
  }

  if (batches.length === 0) {
    return <p className="text-gray-500 italic p-4">No classes found yet.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-xl shadow-sm">
      <div
        ref={gridRef}
        className="grid text-[11px] min-w-max relative"
        style={{ gridTemplateColumns: `190px repeat(${DAYS.length}, minmax(600px,1fr))` }}
      >
        {nowLine && (
          <div
            className="absolute w-[2px] bg-red-500 z-30 pointer-events-none"
            style={{ left: nowLine.left, top: nowLine.top, height: nowLine.height }}
            title="Current time"
          >
            <span className="absolute -top-1 -left-[5px] w-3 h-3 rounded-full bg-red-500" />
          </div>
        )}

        {/* Day name header row */}
        <div className="sticky left-0 bg-blue-950 text-white p-2 font-semibold z-20">Batch / Day</div>
        {DAYS.map((day) => (
          <div key={day} className="bg-blue-950 text-white text-center p-2 font-semibold border-l border-blue-800">
            {day}
          </div>
        ))}

        {/* Period time header row */}
        <div className="sticky left-0 bg-blue-50 z-20 border-t" />
        {DAYS.map((day) => (
          <div key={day} className="grid border-t border-l border-blue-100" style={{ gridTemplateColumns: DAY_COLUMNS }}>
            {PERIODS.slice(0, 3).map((p) => <PeriodHeader key={p.id} p={p} day={day} />)}
            <GapHeader gapId={1} day={day} />
            {PERIODS.slice(3, 6).map((p) => <PeriodHeader key={p.id} p={p} day={day} />)}
            <GapHeader gapId={2} day={day} />
            {PERIODS.slice(6, 9).map((p) => <PeriodHeader key={p.id} p={p} day={day} />)}
          </div>
        ))}

        {/* One data row per batch */}
        {batches.map((batch) => (
          <React.Fragment key={batch}>
            <div className="sticky left-0 bg-emerald-50 border-t border-r p-2 font-medium z-20 flex items-center">
              {batch}
            </div>
            {DAYS.map((day) => (
              <div key={day} className="grid border-t border-l" style={{ gridTemplateColumns: DAY_COLUMNS }}>
                {BLOCK_KEYS.map((blockKey, bi) => {
                  const labs = findLabs(batch, day, blockKey);
                  return (
                    <React.Fragment key={blockKey}>
                      {labs.length > 0 ? (
                        <PairedLabCell slots={labs} span={3} onEdit={onEdit} onDelete={onDelete} canManage={canManage} />
                      ) : (
                        BLOCKS[blockKey].periods.map((pid) => {
                          const cls = findClass(batch, day, pid);
                          return (
                            <SlotCell
                              key={pid}
                              slot={cls}
                              span={1}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              canManage={cls ? canManage(cls) : false}
                            />
                          );
                        })
                      )}
                      {bi < 2 && <div className="bg-gray-200" />}
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function PeriodHeader({ p, day }) {
  return (
    <div
      data-role="period-header"
      data-day={day}
      data-period={p.id}
      className="text-center py-1 border-r bg-amber-50 text-blue-900 leading-tight"
    >
      <div>{p.start}</div>
      <div>{p.end}</div>
    </div>
  );
}

function GapHeader({ gapId, day }) {
  return <div data-role="gap-header" data-day={day} data-gap={gapId} className="bg-gray-200" />;
}

function SlotCell({ slot, span, onEdit, onDelete, canManage }) {
  const colorClass = COLOR_CLASSES[slot?.color ?? ''] ?? COLOR_CLASSES[''];
  return (
    <div
      className={`border-r p-1 min-h-[58px] flex flex-col justify-center items-center text-center transition-colors ${slot ? colorClass : 'bg-white'}`}
      style={{ gridColumn: `span ${span}` }}
    >
      {slot && (
        <>
          <div className="font-semibold leading-tight">{slot.courseCode}</div>
          <div className="leading-tight">{slot.teacher}</div>
          <div className="leading-tight opacity-80">{slot.room}</div>
          {canManage && (onEdit || onDelete) && (
            <div className="mt-1 space-x-1">
              {onEdit && (
                <button className="underline" onClick={() => onEdit(slot)}>Edit</button>
              )}
              {onDelete && (
                <button className="underline" onClick={() => onDelete(slot)}>Del</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Renders one or two labs sharing the same 2h30m block, side by side.
function PairedLabCell({ slots, span, onEdit, onDelete, canManage }) {
  if (slots.length === 1) {
    return <SlotCell slot={slots[0]} span={span} onEdit={onEdit} onDelete={onDelete} canManage={canManage(slots[0])} />;
  }

  return (
    <div className="border-r flex min-h-[58px]" style={{ gridColumn: `span ${span}` }}>
      {slots.map((slot, i) => {
        const colorClass = COLOR_CLASSES[slot?.color ?? ''] ?? COLOR_CLASSES[''];
        return (
          <div
            key={slot._id || i}
            className={`flex-1 p-1 flex flex-col justify-center items-center text-center ${colorClass} ${i === 0 ? 'border-r border-white/50' : ''}`}
          >
            <div className="font-semibold leading-tight">{slot.courseCode}</div>
            <div className="leading-tight">{slot.teacher}</div>
            <div className="leading-tight opacity-80">{slot.room}</div>
            {canManage(slot) && (onEdit || onDelete) && (
              <div className="mt-1 space-x-1">
                {onEdit && <button className="underline" onClick={() => onEdit(slot)}>Edit</button>}
                {onDelete && <button className="underline" onClick={() => onDelete(slot)}>Del</button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}