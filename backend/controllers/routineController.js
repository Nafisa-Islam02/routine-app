const Routine = require('../models/Routine');
const ChangeLog = require('../models/ChangeLog');
const { findConflict } = require('../utils/conflictCheck');
const { resolveSlotTimes, DAYS, PERIODS } = require('../utils/schedule');
const { timesOverlap } = require('../utils/conflictCheck');

function conflictMessage(conflict) {
  return `Conflict with existing slot: ${conflict.courseCode} (${conflict.startTime}-${conflict.endTime}, Room ${conflict.room}, ${conflict.teacher})`;
}

function canManage(user, routine) {
  if (user.role === 'admin') return true;
  return user.role === 'teacher' && String(routine.createdBy) === String(user.userId);
}

// GET /api/routines?department=ECE&batch=...&section=A
exports.getRoutines = async (req, res) => {
  try {
    const { department, batch, section } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (batch) filter.batch = batch;
    if (section) filter.section = section;

    const routines = await Routine.find(filter).sort({ day: 1, startTime: 1 });
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch routines', error: err.message });
  }
};

// POST /api/routines
exports.createRoutine = async (req, res) => {
  try {
    const { department, batch, section, day, type, period, block, courseCode, courseTitle, teacher, room, color } = req.body;

    if (!department || !batch || !day || !type || !courseCode || !teacher || !room) {
      return res.status(400).json({ message: 'Department, batch, day, type, course code, teacher and room are all required' });
    }
    if (!DAYS.includes(day)) {
      return res.status(400).json({ message: 'Invalid day' });
    }
    if (!['class', 'lab'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "class" or "lab"' });
    }

    const times = resolveSlotTimes({ type, period, block });
    if (!times) {
      return res.status(400).json({
        message: type === 'class'
          ? 'Select a valid period (1-9). Classes run 8:00-10:30, 10:50-1:20 or 2:30-5:00 only — the break (10:30-10:50) and lunch gap (1:20-2:30) are never available.'
          : 'Select a valid lab block (A, B or C). Labs run the full 2h30m block only.',
      });
    }

    const conflict = await findConflict({ day, startTime: times.startTime, endTime: times.endTime, room, teacher, batch });
    if (conflict) {
      return res.status(409).json({ message: conflictMessage(conflict), conflict });
    }

    const routine = await Routine.create({
      department,
      batch,
      section,
      day,
      type,
      period: type === 'class' ? Number(period) : undefined,
      block: type === 'lab' ? block : undefined,
      startTime: times.startTime,
      endTime: times.endTime,
      courseCode,
      courseTitle,
      teacher,
      room,
      color: color || '',
      createdBy: req.user.userId,
    });

    await ChangeLog.create({
      routineId: routine._id,
      editedBy: req.user.userId,
      changeType: 'created',
      newValue: routine.toObject(),
    });

    req.io.emit('routineUpdated', { department, batch, type: 'created', routine });
    res.status(201).json(routine);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create routine', error: err.message });
  }
};

// PUT /api/routines/:id
exports.updateRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Routine.findById(id);
    if (!existing) return res.status(404).json({ message: 'Routine slot not found' });

    if (!canManage(req.user, existing)) {
      return res.status(403).json({ message: 'You can only edit slots you created' });
    }

    const merged = { ...existing.toObject(), ...req.body };
    const { day, type, period, block, room, teacher, batch } = merged;

    if (!DAYS.includes(day)) {
      return res.status(400).json({ message: 'Invalid day' });
    }
    const times = resolveSlotTimes({ type, period, block });
    if (!times) {
      return res.status(400).json({
        message: type === 'class'
          ? 'Select a valid period (1-9). The break (10:30-10:50) and lunch gap (1:20-2:30) are never available.'
          : 'Select a valid lab block (A, B or C). Labs run the full 2h30m block only.',
      });
    }

    const conflict = await findConflict({
      day, startTime: times.startTime, endTime: times.endTime, room, teacher, batch, excludeId: id,
    });
    if (conflict) {
      return res.status(409).json({ message: conflictMessage(conflict), conflict });
    }

    const oldValue = existing.toObject();
    Object.assign(existing, req.body, {
      startTime: times.startTime,
      endTime: times.endTime,
      period: type === 'class' ? Number(period) : undefined,
      block: type === 'lab' ? block : undefined,
    });
    await existing.save();

    await ChangeLog.create({
      routineId: existing._id,
      editedBy: req.user.userId,
      changeType: 'updated',
      oldValue,
      newValue: existing.toObject(),
    });

    req.io.emit('routineUpdated', {
      department: existing.department,
      batch: existing.batch,
      type: 'updated',
      routine: existing,
    });

    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update routine', error: err.message });
  }
};

// DELETE /api/routines/:id
exports.deleteRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Routine.findById(id);
    if (!existing) return res.status(404).json({ message: 'Routine slot not found' });

    if (!canManage(req.user, existing)) {
      return res.status(403).json({ message: 'You can only delete slots you created' });
    }

    await existing.deleteOne();

    await ChangeLog.create({
      routineId: id,
      editedBy: req.user.userId,
      changeType: 'deleted',
      oldValue: existing.toObject(),
    });

    req.io.emit('routineUpdated', {
      department: existing.department,
      batch: existing.batch,
      type: 'deleted',
      routineId: id,
    });

    res.json({ message: 'Routine slot deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete routine', error: err.message });
  }
};

// GET /api/routines/:id/history
exports.getHistory = async (req, res) => {
  try {
    const logs = await ChangeLog.find({ routineId: req.params.id })
      .populate('editedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history', error: err.message });
  }
};


// ── Dynamic Routine (auto-scheduler) ────────────────────────────────────────
// Lets a teacher/admin submit just the class details (course, teacher, room,
// batch, type, which day(s)) with NO time slot chosen. The algorithm below
// picks the earliest valid period/block for each day, obeying three rules:
//   1. No double-booking of the same teacher, room, or batch (reuses the same
//      timesOverlap check as the manual conflict checker).
//   2. Only the real class periods / lab blocks from schedule.js are ever
//      used, so the 10:30-10:50 break and 1:20-2:30 lunch gap are impossible.
//   3. A teacher is never given 3 back-to-back 50-minute classes in a row
//      (labs are a single continuous session so they don't count toward this).

// Returns true if adding `candidatePeriodId` to a teacher's existing class
// periods for that day would create a run of 3+ consecutive periods.
function wouldCreateThreeInARow(existingPeriodIds, candidatePeriodId) {
  const ids = [...existingPeriodIds, candidatePeriodId].sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < ids.length; i++) {
    if (ids[i] === ids[i - 1] + 1) {
      run += 1;
      if (run >= 3) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

// POST /api/routines/dynamic
// body: { classes: [ { department, batch, section, teacher, room, courseCode,
//                       courseTitle, type: 'class'|'lab', color, days: ['Saturday', ...] } ] }
exports.generateDynamicRoutine = async (req, res) => {
  try {
    const { classes } = req.body;
    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ message: 'Provide at least one class in "classes".' });
    }

    for (const spec of classes) {
      const { department, batch, teacher, room, courseCode, type, days } = spec;
      if (!department || !batch || !teacher || !room || !courseCode) {
        return res.status(400).json({ message: 'Each class needs department, batch, teacher, room and courseCode.' });
      }
      if (!['class', 'lab'].includes(type)) {
        return res.status(400).json({ message: `Invalid type for ${courseCode}. Must be "class" or "lab".` });
      }
      if (!Array.isArray(days) || days.length === 0 || !days.every((d) => DAYS.includes(d))) {
        return res.status(400).json({ message: `Pick at least one valid day for ${courseCode}.` });
      }
    }

    const created = [];
    const skipped = [];

    // Pull every existing routine for the involved department(s), grouped by day,
    // then keep updating this in-memory copy as we schedule new slots — so slot 2
    // of a multi-class request already "sees" slot 1 that was just placed.
    const departments = [...new Set(classes.map((c) => c.department))];
    const dayBuckets = {};
    for (const day of DAYS) {
      dayBuckets[day] = await Routine.find({ day, department: { $in: departments } }).lean();
    }

    function slotConflicts(day, startTime, endTime, teacher, room, batch) {
      return dayBuckets[day].some(
        (r) =>
          (r.teacher === teacher || r.room === room || r.batch === batch) &&
          timesOverlap(startTime, endTime, r.startTime, r.endTime)
      );
    }

    function teacherClassPeriodIds(day, teacher) {
      return dayBuckets[day]
        .filter((r) => r.teacher === teacher && r.type === 'class')
        .map((r) => Number(r.period));
    }

    for (const spec of classes) {
      const { department, batch, section, teacher, room, courseCode, courseTitle, type, color, days } = spec;

      for (const day of days) {
        let placed = null;

        if (type === 'lab') {
          for (const blockKey of ['A', 'B', 'C']) {
            const times = resolveSlotTimes({ type: 'lab', block: blockKey });
            if (slotConflicts(day, times.startTime, times.endTime, teacher, room, batch)) continue;
            placed = { block: blockKey, ...times };
            break;
          }
        } else {
          for (const p of PERIODS) {
            const times = resolveSlotTimes({ type: 'class', period: p.id });
            if (slotConflicts(day, times.startTime, times.endTime, teacher, room, batch)) continue;
            const existingIds = teacherClassPeriodIds(day, teacher);
            if (wouldCreateThreeInARow(existingIds, p.id)) continue;
            placed = { period: p.id, ...times };
            break;
          }
        }

        if (!placed) {
          skipped.push({
            courseCode, day, teacher, room, batch,
            reason: 'No free slot that day without a room/teacher/batch conflict, or it would give this teacher 3 classes in a row.',
          });
          continue;
        }

        const routine = await Routine.create({
          department, batch, section, day, type,
          period: type === 'class' ? placed.period : undefined,
          block: type === 'lab' ? placed.block : undefined,
          startTime: placed.startTime,
          endTime: placed.endTime,
          courseCode, courseTitle, teacher, room,
          color: color || '',
          createdBy: req.user.userId,
        });

        await ChangeLog.create({
          routineId: routine._id,
          editedBy: req.user.userId,
          changeType: 'created',
          newValue: routine.toObject(),
        });

        dayBuckets[day].push(routine.toObject());
        created.push(routine);
      }
    }

    if (created.length > 0) {
      req.io.emit('routineUpdated', { type: 'bulk-created', count: created.length });
    }

    res.status(201).json({ created, skipped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate dynamic routine', error: err.message });
  }
};
