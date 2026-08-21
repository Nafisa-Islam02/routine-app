// One-off / re-runnable seed script.
//
// Loads the exact RUET ECE department routine (transcribed from the official
// routine image, effective 10/01/2026) into MongoDB, so it shows up
// immediately for every student and teacher the moment they log in — no
// manual data entry needed.
//
// Usage (from backend/):
//   node scripts/seedRuetEceRoutine.js
//
// It is safe to re-run: it first deletes every existing "ECE" department
// routine slot, then re-inserts the full set from data/routineData.json.
// Anything a teacher added for OTHER departments is left untouched.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Routine = require('../models/Routine');
const { resolveSlotTimes, DAYS } = require('../utils/schedule');
const raw = require('../data/routineData.json');

const DEPARTMENT = 'ECE';

async function seed() {
  await connectDB();

  const removed = await Routine.deleteMany({ department: DEPARTMENT });
  console.log(`Cleared ${removed.deletedCount} existing ${DEPARTMENT} slot(s).`);

  const docs = [];
  const errors = [];

  raw.forEach((entry, i) => {
    if (!DAYS.includes(entry.day)) {
      errors.push(`Row ${i}: invalid day "${entry.day}"`);
      return;
    }
    const times = resolveSlotTimes({ type: entry.type, period: entry.period, block: entry.block });
    if (!times) {
      errors.push(`Row ${i}: could not resolve time for ${entry.courseCode} on ${entry.day}`);
      return;
    }
    docs.push({
      department: DEPARTMENT,
      batch: entry.batch,
      section: entry.section || '',
      day: entry.day,
      type: entry.type,
      period: entry.type === 'class' ? entry.period : undefined,
      block: entry.type === 'lab' ? entry.block : undefined,
      startTime: times.startTime,
      endTime: times.endTime,
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle || '',
      teacher: entry.teacher,
      room: entry.room,
      color: entry.color || '',
    });
  });

  if (errors.length) {
    console.warn('Skipped some rows due to errors:\n' + errors.join('\n'));
  }

  const inserted = await Routine.insertMany(docs);
  console.log(`Inserted ${inserted.length} routine slot(s) for ${DEPARTMENT}.`);

  await mongoose.disconnect();
  console.log('Done. Log in as any student or teacher to see the routine.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
