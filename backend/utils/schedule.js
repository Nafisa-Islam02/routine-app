// Single source of truth for the class schedule shape.
// A "class" occupies exactly one 50-minute period.
// A "lab" occupies an entire 2h30m block (periods 1-3, 4-6, or 7-9).
// The gaps between blocks (10:30-10:50 break, 1:20-2:30 lunch gap) are never
// selectable because they simply don't appear as periods below.

const PERIODS = [
  { id: 1, block: 'A', start: '08:00', end: '08:50' },
  { id: 2, block: 'A', start: '08:50', end: '09:40' },
  { id: 3, block: 'A', start: '09:40', end: '10:30' },
  { id: 4, block: 'B', start: '10:50', end: '11:40' },
  { id: 5, block: 'B', start: '11:40', end: '12:30' },
  { id: 6, block: 'B', start: '12:30', end: '13:20' },
  { id: 7, block: 'C', start: '14:30', end: '15:20' },
  { id: 8, block: 'C', start: '15:20', end: '16:10' },
  { id: 9, block: 'C', start: '16:10', end: '17:00' },
];

const BLOCKS = {
  A: { start: '08:00', end: '10:30', periods: [1, 2, 3] },
  B: { start: '10:50', end: '13:20', periods: [4, 5, 6] },
  C: { start: '14:30', end: '17:00', periods: [7, 8, 9] },
};

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];

function getPeriod(id) {
  return PERIODS.find((p) => p.id === Number(id));
}

// Resolves the canonical startTime/endTime for a slot, or null if the
// type/period/block combination is not a valid, schedulable slot.
function resolveSlotTimes({ type, period, block }) {
  if (type === 'lab') {
    const b = BLOCKS[block];
    if (!b) return null;
    return { startTime: b.start, endTime: b.end };
  }
  if (type === 'class') {
    const p = getPeriod(period);
    if (!p) return null;
    return { startTime: p.start, endTime: p.end };
  }
  return null;
}

module.exports = { PERIODS, BLOCKS, DAYS, getPeriod, resolveSlotTimes };
