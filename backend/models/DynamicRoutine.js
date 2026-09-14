const mongoose = require('mongoose');

// Mirrors Routine.js, plus two fields the auto-scheduler needs:
//  - credit: used to make sure two labs paired into the same slot match credit
//  - pairId: shared by both halves of a paired lab so they can be edited/
//    deleted together as one unit
const dynamicRoutineSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    batch: { type: String, required: true, trim: true },
    day: {
      type: String,
      required: true,
      enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    type: { type: String, enum: ['class', 'lab'], required: true, default: 'class' },
    period: { type: Number, min: 1, max: 9 },
    block: { type: String, enum: ['A', 'B', 'C'] },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    courseCode: { type: String, required: true, trim: true },
    courseTitle: { type: String, default: '', trim: true },
    credit: { type: Number, default: null },
    teacher: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
    // Keep this list in sync with frontend/src/context/colors.js.
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
    pairId: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DynamicRoutine', dynamicRoutineSchema);
