import teacherLegend from '../data/teacherLegend.json';

// Sorted alphabetically by full name. The dropdown stores/selects the
// initial (e.g. "MFA") since that's what the routine grid displays.
export const TEACHERS = [...teacherLegend].sort((a, b) => a.name.localeCompare(b.name));
