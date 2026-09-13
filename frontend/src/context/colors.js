// Single source of truth for slot highlight colours, shared by RoutineForm,
// DynamicRoutine and RoutineGrid so the dropdown options and the rendered
// swatches never drift out of sync. "blue" is the default for new slots.

export const DEFAULT_COLOR = 'blue';

export const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue (default)' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'gray', label: 'Gray' },
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'red', label: 'Red' },
  { value: 'teal', label: 'Teal' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'rose', label: 'Rose' },
  { value: 'lime', label: 'Lime' },
  { value: 'neutral', label: 'Neutral gray' },
  { value: '', label: 'None (white)' },
];

// Literal Tailwind class strings (never built dynamically) so Tailwind's
// JIT compiler always picks them up.
export const COLOR_CLASSES = {
  '': 'bg-white',
  blue: 'bg-sky-500 text-white',
  yellow: 'bg-yellow-300',
  cyan: 'bg-cyan-200',
  gray: 'bg-slate-400 text-white',
  orange: 'bg-orange-400 text-white',
  neutral: 'bg-gray-100',
  green: 'bg-emerald-400 text-white',
  purple: 'bg-purple-400 text-white',
  pink: 'bg-pink-300',
  red: 'bg-red-400 text-white',
  teal: 'bg-teal-400 text-white',
  indigo: 'bg-indigo-400 text-white',
  rose: 'bg-rose-300',
  lime: 'bg-lime-300',
};
