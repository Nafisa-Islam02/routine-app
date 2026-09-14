
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { DAYS, BLOCKS, PERIODS } from '../schedule';
import { COLOR_CLASSES } from '../context/colors';

const BLOCK_KEYS = ['A', 'B', 'C'];

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

const DAY_COLUMNS = `repeat(3, minmax(85px,1fr)) 16px repeat(3, minmax(85px,1fr)) 16px repeat(3, minmax(85px,1fr))`;

const JS_DAY_TO_NAME = { 6: 'Saturday', 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday' };

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const GAPS = [
  { id: 1, start: toMinutes(PERIODS[2].end), end: toMinutes(PERIODS[3].start) },
  { id: 2, start: toMinutes(PERIODS[5].end), end: toMinutes(PERIODS[6].start) },
];

function useNowLine(gridRef) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    function update() {
      const grid = gridRef.current;
      if (!grid) return setPos(null);

      const now = new Date();
      const today = JS_DAY_TO_NAME[now.getDay()];
      if (!today) return setPos(null);

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

      if (!selector) return setPos(null);

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

export default function RoutineGrid({
  routines,
  onEdit,
  onDelete,
  onSwap,
  onEmptyCellClick,
  currentUser,
  readOnly = false,
}) {
  const gridRef = useRef(null);
  const nowLine = useNowLine(gridRef);
  const [selectedSlotForSwap, setSelectedSlotForSwap] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  const batches = useMemo(() => {
    const set = new Set(routines.map((r) => r.batch));
    return sortBatches(Array.from(set));
  }, [routines]);

  function findClass(batch, day, periodId) {
    return routines.find(
      (r) => r.batch === batch && r.day === day && r.type === 'class' && Number(r.period) === periodId
    );
  }

  function findLabs(batch, day, blockKey) {
    return routines.filter((r) => r.batch === batch && r.day === day && r.type === 'lab' && r.block === blockKey);
  }

  function canManage(slot) {
    if (readOnly || !currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.role === 'teacher' && String(slot.createdBy) === String(currentUser.id);
  }

  // Handle Drag & Drop Events
  function handleDragStart(e, slot) {
    if (readOnly || !slot) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ slotId: slot._id, day: slot.day, type: slot.type }));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, cellKey) {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCell !== cellKey) setDragOverCell(cellKey);
  }

  function handleDragLeave() {
    setDragOverCell(null);
  }

  function handleDrop(e, targetDay, targetPeriod, targetBlock) {
    if (readOnly) return;
    e.preventDefault();
    setDragOverCell(null);
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr || !onSwap) return;
    try {
      const data = JSON.parse(dataStr);
      onSwap(data.slotId, targetDay, targetPeriod, targetBlock);
    } catch {
      // quiet fallback
    }
  }

  function handleCellClick(slot, targetDay, targetPeriod, targetBlock, batch) {
    if (readOnly) return;
    if (!slot) {
      if (onEmptyCellClick) {
        onEmptyCellClick(targetDay, targetPeriod, targetBlock, batch);
      }
      return;
    }
    if (!onSwap) return;
    if (!selectedSlotForSwap) {
      if (slot && canManage(slot)) {
        setSelectedSlotForSwap(slot);
      }
    } else {
      if (selectedSlotForSwap._id === slot?._id) {
        setSelectedSlotForSwap(null);
      } else {
        onSwap(selectedSlotForSwap._id, targetDay, targetPeriod, targetBlock);
        setSelectedSlotForSwap(null);
      }
    }
  }

  if (batches.length === 0) {
    return <p className="text-slate-400 italic p-6 text-center text-sm">No class routines found.</p>;
  }

  return (
    <div className="space-y-2">
      {selectedSlotForSwap && (
        <div className="bg-sky-500 text-white text-xs px-4 py-2 rounded-xl flex items-center justify-between font-semibold shadow-md animate-bounce">
          <span>
            ⇄ Click any slot or cell to swap/move class <strong>{selectedSlotForSwap.courseCode}</strong>
          </span>
          <button
            onClick={() => setSelectedSlotForSwap(null)}
            className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm bg-white">
        <div
          ref={gridRef}
          className="grid text-[11px] min-w-max relative"
          style={{ gridTemplateColumns: `190px repeat(${DAYS.length}, minmax(640px,1fr))` }}
        >
          {nowLine && (
            <div
              className="absolute w-[2px] bg-red-500 z-30 pointer-events-none"
              style={{ left: nowLine.left, top: nowLine.top, height: nowLine.height }}
              title="Current time"
            >
              <span className="absolute -top-1 -left-[5px] w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 animate-ping" />
            </div>
          )}

          {/* Day Header Row */}
          <div className="sticky left-0 bg-slate-900 text-white p-2.5 font-bold z-20 shadow-md">Batch / Day</div>
          {DAYS.map((day) => (
            <div key={day} className="bg-slate-900 text-white text-center p-2.5 font-extrabold border-l border-slate-800 tracking-wide uppercase">
              {day}
            </div>
          ))}

          {/* Period Header Row */}
          <div className="sticky left-0 bg-slate-100 z-20 border-t border-slate-200" />
          {DAYS.map((day) => (
            <div key={day} className="grid border-t border-l border-slate-200" style={{ gridTemplateColumns: DAY_COLUMNS }}>
              {PERIODS.slice(0, 3).map((p) => <PeriodHeader key={p.id} p={p} day={day} />)}
              <GapHeader gapId={1} day={day} />
              {PERIODS.slice(3, 6).map((p) => <PeriodHeader key={p.id} p={p} day={day} />)}
              <GapHeader gapId={2} day={day} />
              {PERIODS.slice(6, 9).map((p) => <PeriodHeader key={p.id} p={p} day={day} />)}
            </div>
          ))}

          {/* Batch Rows */}
          {batches.map((batch) => (
            <React.Fragment key={batch}>
              <div className="sticky left-0 bg-sky-50/90 border-t border-r border-slate-200 p-2.5 font-bold text-slate-800 z-20 flex items-center shadow-sm">
                {batch}
              </div>
              {DAYS.map((day) => (
                <div key={day} className="grid border-t border-l border-slate-200" style={{ gridTemplateColumns: DAY_COLUMNS }}>
                  {BLOCK_KEYS.map((blockKey, bi) => {
                    const labs = findLabs(batch, day, blockKey);
                    const cellKey = `${day}-${blockKey}`;
                    const isOver = dragOverCell === cellKey;
                    return (
                      <React.Fragment key={blockKey}>
                        {labs.length > 0 ? (
                          <PairedLabCell
                            slots={labs}
                            span={3}
                            day={day}
                            blockKey={blockKey}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            canManage={canManage}
                            onDragStart={handleDragStart}
                            onDragOver={(e) => handleDragOver(e, cellKey)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, undefined, blockKey)}
                            isDragOver={isOver}
                            selectedSlot={selectedSlotForSwap}
                            onCellClick={handleCellClick}
                            readOnly={readOnly}
                          />
                        ) : (
                          BLOCKS[blockKey].periods.map((pid) => {
                            const cls = findClass(batch, day, pid);
                            const pCellKey = `${day}-${pid}`;
                            const isPOver = dragOverCell === pCellKey;
                            return (
                              <SlotCell
                                key={pid}
                                slot={cls}
                                span={1}
                                day={day}
                                periodId={pid}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                canManage={cls ? canManage(cls) : false}
                                onDragStart={handleDragStart}
                                onDragOver={(e) => handleDragOver(e, pCellKey)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, day, pid, undefined)}
                                isDragOver={isPOver}
                                isSelected={selectedSlotForSwap?._id === cls?._id}
                                onCellClick={handleCellClick}
                                readOnly={readOnly}
                              />
                            );
                          })
                        )}
                        {bi < 2 && <div className="bg-slate-200/80" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
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
      className="text-center py-1 border-r bg-amber-50/70 text-slate-800 leading-tight font-medium"
    >
      <div className="font-semibold text-blue-950">{p.start}</div>
      <div className="text-[10px] text-slate-500">{p.end}</div>
    </div>
  );
}

function GapHeader({ gapId, day }) {
  return <div data-role="gap-header" data-day={day} data-gap={gapId} className="bg-slate-200/80" />;
}

function SlotCell({
  slot, span, day, periodId, batch, onEdit, onDelete, canManage,
  onDragStart, onDragOver, onDragLeave, onDrop, isDragOver, isSelected, onCellClick, readOnly
}) {
  const colorClass = COLOR_CLASSES[slot?.color ?? ''] ?? COLOR_CLASSES[''];

  return (
    <div
      draggable={Boolean(!readOnly && slot && canManage)}
      onDragStart={(e) => !readOnly && onDragStart && onDragStart(e, slot)}
      onDragOver={!readOnly ? onDragOver : undefined}
      onDragLeave={!readOnly ? onDragLeave : undefined}
      onDrop={!readOnly ? onDrop : undefined}
      onClick={() => !readOnly && onCellClick && onCellClick(slot, day, periodId, undefined, batch)}
      className={`border-r p-1.5 min-h-[64px] flex flex-col justify-center items-center text-center transition-all relative group ${
        slot ? colorClass : 'bg-white'
      } ${!readOnly && !slot ? 'hover:bg-sky-50/50 cursor-pointer' : ''} ${
        !readOnly && slot && canManage ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragOver ? 'drag-over-slot' : ''} ${isSelected ? 'ring-2 ring-sky-500 ring-offset-1 z-10' : ''}`}
      style={{ gridColumn: `span ${span}` }}
    >
      {slot ? (
        <>
          {/* CT / Quiz / Lab Group Badges */}
          <div className="flex items-center gap-0.5 flex-wrap justify-center mb-0.5">
            {slot.isCT && (
              <span className="bg-amber-500 text-white font-extrabold text-[9px] px-1 py-0.2 rounded-full shadow-sm">
                📝 CT
              </span>
            )}
            {slot.isQuiz && (
              <span className="bg-purple-600 text-white font-extrabold text-[9px] px-1 py-0.2 rounded-full shadow-sm">
                ⚡ Quiz
              </span>
            )}
            {slot.labGroup && (
              <span className="bg-sky-600 text-white font-bold text-[9px] px-1 py-0.2 rounded-full">
                {slot.labGroup}
              </span>
            )}
          </div>

          <div className="font-extrabold leading-tight tracking-tight">{slot.courseCode}</div>
          <div className="text-[10px] font-medium leading-tight opacity-90">{slot.teacher}</div>
          <div className="text-[10px] leading-tight font-semibold opacity-75">{slot.room}</div>

          {!readOnly && canManage && (onEdit || onDelete) && (
            <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  className="text-[9px] bg-white/80 hover:bg-white text-slate-800 font-bold px-1.5 py-0.5 rounded border border-slate-300"
                  onClick={(e) => { e.stopPropagation(); onEdit(slot); }}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="text-[9px] bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold px-1.5 py-0.5 rounded border border-red-200"
                  onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
                >
                  Del
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        !readOnly && <span className="text-[10px] text-slate-300 group-hover:text-sky-500 font-bold" title="Click to add class">+</span>
      )}
    </div>
  );
}

// Renders one or two simultaneous labs sharing the same 2h30m block.
function PairedLabCell({
  slots, span, day, blockKey, batch, onEdit, onDelete, canManage,
  onDragStart, onDragOver, onDragLeave, onDrop, isDragOver, selectedSlot, onCellClick, readOnly
}) {
  if (slots.length === 1) {
    return (
      <SlotCell
        slot={slots[0]}
        span={span}
        day={day}
        batch={batch}
        onEdit={onEdit}
        onDelete={onDelete}
        canManage={canManage(slots[0])}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        isDragOver={isDragOver}
        isSelected={selectedSlot?._id === slots[0]._id}
        onCellClick={onCellClick}
        readOnly={readOnly}
      />
    );
  }

  const titleSummary = slots.map((s) => `${s.courseCode}${s.labGroup ? ` (${s.labGroup})` : ''}`).join(' / ');

  return (
    <div
      onDragOver={!readOnly ? onDragOver : undefined}
      onDragLeave={!readOnly ? onDragLeave : undefined}
      onDrop={!readOnly ? onDrop : undefined}
      className={`border-r flex min-h-[64px] relative rounded-lg overflow-hidden border border-slate-200 shadow-inner ${
        isDragOver ? 'drag-over-slot' : ''
      }`}
      style={{ gridColumn: `span ${span}` }}
    >
      <div className="absolute top-0 left-0 right-0 bg-blue-950/80 text-white text-[8px] font-bold text-center py-0.5 z-10 truncate px-1">
        Simultaneous: {titleSummary}
      </div>

      {slots.map((slot, i) => {
        const colorClass = COLOR_CLASSES[slot?.color ?? ''] ?? COLOR_CLASSES[''];
        const isSel = selectedSlot?._id === slot._id;

        return (
          <div
            key={slot._id || i}
            draggable={Boolean(!readOnly && canManage(slot))}
            onDragStart={(e) => !readOnly && onDragStart && onDragStart(e, slot)}
            onClick={() => !readOnly && onCellClick && onCellClick(slot, day, undefined, blockKey, batch)}
            className={`flex-1 p-1.5 pt-4 flex flex-col justify-center items-center text-center transition-all relative group ${colorClass} ${
              !readOnly && canManage(slot) ? 'cursor-grab active:cursor-grabbing' : ''
            } ${i === 0 ? 'border-r border-white/50' : ''} ${isSel ? 'ring-2 ring-sky-500 z-10' : ''}`}
          >
            <div className="flex items-center gap-0.5 flex-wrap justify-center mb-0.5">
              {slot.labGroup && (
                <span className="bg-blue-950 text-white font-extrabold text-[8px] px-1 py-0.2 rounded-full">
                  {slot.labGroup}
                </span>
              )}
              {slot.isCT && <span className="bg-amber-500 text-white text-[8px] font-bold px-1 rounded-full">CT</span>}
              {slot.isQuiz && <span className="bg-purple-600 text-white text-[8px] font-bold px-1 rounded-full">Quiz</span>}
            </div>

            <div className="font-extrabold leading-tight tracking-tight text-[11px]">{slot.courseCode}</div>
            <div className="text-[10px] font-medium leading-tight opacity-90">{slot.teacher}</div>
            <div className="text-[10px] leading-tight font-semibold opacity-75">{slot.room}</div>

            {!readOnly && canManage(slot) && (onEdit || onDelete) && (
              <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    type="button"
                    className="text-[9px] bg-white/80 hover:bg-white text-slate-800 font-bold px-1 py-0.5 rounded"
                    onClick={(e) => { e.stopPropagation(); onEdit(slot); }}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="text-[9px] bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold px-1 py-0.5 rounded"
                    onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
                  >
                    Del
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}