// Kept in sync with backend/utils/schedule.js by hand.
// A "class" is one 50-minute period. A "lab" is a full 2h30m block.
// The break (10:30-10:50) and lunch gap (1:20-2:30) never appear as options
// because they simply aren't periods below — so they can never be booked.

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  if (hours > 12) {
    hours = hours - 12;
  } else if (hours === 0) {
    hours = 12;
  }
  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hStr}:${minutes}`;
}

export const PERIODS = [
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

export const BLOCKS = {
  A: { start: '08:00', end: '10:30', periods: [1, 2, 3] },
  B: { start: '10:50', end: '13:20', periods: [4, 5, 6] },
  C: { start: '14:30', end: '17:00', periods: [7, 8, 9] },
};

export const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
