const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    // e.g. "2nd Year Odd Semester 2024 Series" — the row label in the grid
    batch: { type: String, required: true, trim: true },
    section: { type: String, default: '', trim: true },
    day: {
      type: String,
      required: true,
      enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    type: { type: String, enum: ['class', 'lab'], required: true, default: 'class' },
    // required when type === 'class': which 50-min period (1-9)
    period: { type: Number, min: 1, max: 9 },
    // required when type === 'lab': which 2h30m block ('A' | 'B' | 'C')
    block: { type: String, enum: ['A', 'B', 'C'] },
    // startTime/endTime are always derived server-side from period/block,
    // never trusted from the client — kept here for fast querying/sorting.
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    courseCode: { type: String, required: true, trim: true },
    courseTitle: { type: String, default: '', trim: true },
    teacher: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
    color: {
      type: String,
      enum: [
        '', 'blue', 'yellow', 'cyan', 'gray', 'orange', 'green', 'purple',
        'pink', 'red', 'teal', 'indigo', 'rose', 'lime', 'neutral',
      ],
      default: 'blue',
    },
    labGroup: { type: String, enum: ['', '1st 30', '2nd 30', 'Both'], default: '' },
    isCT: { type: Boolean, default: false },
    isQuiz: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Routine', routineSchema);
