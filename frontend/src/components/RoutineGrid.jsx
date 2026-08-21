import React, { useMemo } from 'react';
import { DAYS, BLOCKS, PERIODS } from '../schedule';

const BLOCK_KEYS = ['A', 'B', 'C'];

// Matches the highlight colours used on the original department routine:
// yellow = sessional/elective, cyan = lab session, blue = HBK-taught
// sessional, gray = theory highlight, orange = project course,
// neutral = admin/non-class block (e.g. departmental meeting).
const COLOR_CLASSES = {
  yellow: 'bg-yellow-300',
  cyan: 'bg-cyan-200',
  gray: 'bg-slate-400 text-white',
  blue: 'bg-sky-500 text-white',
  orange: 'bg-orange-400 text-white',
  neutral: 'bg-gray-100',
  '': 'bg-white',
};

// The canonical order the original sheet uses for the batch rows.
const BATCH_ORDER = [
  '1st Year Odd Semester 2025 Series',
  '2nd Year Odd Semester 2024 Series',
  '2nd Year Even Semester 2023 Series',
  '3rd Year Even Semester 2022 Series',
  '4th Year Odd Semester 2021 Series',
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

// routines: array of routine objects from the API
// onEdit/onDelete + currentUser: optional — only passed by the teacher's editor page
export default function RoutineGrid({ routines, onEdit, onDelete, currentUser }) {
  const batches = useMemo(() => {
    const set = new Set(routines.map((r) => r.batch));
    return sortBatches(Array.from(set));
  }, [routines]);

  function findClass(batch, day, periodId) {
    return routines.find(
      (r) => r.batch === batch && r.day === day && r.type === 'class' && Number(r.period) === periodId
    );
  }
  function findLab(batch, day, blockKey) {
    return routines.find((r) => r.batch === batch && r.day === day && r.type === 'lab' && r.block === blockKey);
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
    <div className="overflow-x-auto border rounded">
      <div className="grid text-[11px] min-w-max" style={{ gridTemplateColumns: `190px repeat(${DAYS.length}, minmax(600px,1fr))` }}>
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
            {PERIODS.slice(0, 3).map((p) => <PeriodHeader key={p.id} p={p} />)}
            <GapHeader />
            {PERIODS.slice(3, 6).map((p) => <PeriodHeader key={p.id} p={p} />)}
            <GapHeader />
            {PERIODS.slice(6, 9).map((p) => <PeriodHeader key={p.id} p={p} />)}
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
                  const lab = findLab(batch, day, blockKey);
                  return (
                    <React.Fragment key={blockKey}>
                      {lab ? (
                        <SlotCell slot={lab} span={3} onEdit={onEdit} onDelete={onDelete} canManage={canManage(lab)} />
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

function PeriodHeader({ p }) {
  return (
    <div className="text-center py-1 border-r bg-amber-50 text-blue-900 leading-tight">
      <div>{p.start}</div>
      <div>{p.end}</div>
    </div>
  );
}

function GapHeader() {
  return <div className="bg-gray-200" />;
}

function SlotCell({ slot, span, onEdit, onDelete, canManage }) {
  const colorClass = COLOR_CLASSES[slot?.color || ''] || COLOR_CLASSES[''];
  return (
    <div
      className={`border-r p-1 min-h-[58px] flex flex-col justify-center items-center text-center ${slot ? colorClass : 'bg-white'}`}
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
