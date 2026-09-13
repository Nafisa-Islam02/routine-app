import labLegend from '../data/labLegend.json';

// The four regular classrooms. Edit this array if room numbers change.
export const CLASSROOMS = ['R-401', 'R-402', 'R-403', 'R-404'];

// Lab rooms are pulled straight from your existing labLegend.json reference
// file, so it stays as the single source of truth for lab names.
export const LAB_ROOMS = labLegend.map((l) => l.id);

// Returns the right room list for the given slot type.
export function roomsFor(type) {
  return type === 'lab' ? LAB_ROOMS : CLASSROOMS;
}
