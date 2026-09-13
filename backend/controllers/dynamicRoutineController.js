const mongoose = require('mongoose');
const DynamicRoutine = require('../models/DynamicRoutine');
const Notification = require('../models/Notification');
const { timesOverlap } = require('../utils/conflictCheck');
const { PERIODS, DAYS, resolveSlotTimes } = require('../utils/schedule');

// True if adding `candidatePeriodId` to a teacher's existing class periods
// for that day would create a run of 3+ consecutive periods. Labs are a
// single continuous session so they never count toward this.
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

// GET /api/dynamic-routines?department=&batch=
exports.getDynamicRoutines = async (req, res) => {
  try {
    const { department, batch } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (batch) filter.batch = batch;
    const routines = await DynamicRoutine.find(filter).sort({ day: 1, startTime: 1 });
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dynamic routines', error: err.message });
  }
};

// POST /api/dynamic-routines/generate
// body: { classes: [ { department, batch, teacher, room, courseCode, courseTitle,
//                       credit, type: 'class'|'lab', color, days: [...],
//                       pair?: { teacher, room, courseCode, courseTitle, credit, color } } ] }
exports.generateDynamicRoutine = async (req, res) => {
  try {
    const { classes } = req.body;
    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ message: 'Provide at least one class in "classes".' });
    }

    for (const spec of classes) {
      const { department, batch, teacher, room, courseCode, type, days, pair } = spec;
      if (!department || !batch || !teacher || !room || !courseCode) {
        return res.status(400).json({ message: 'Each class needs a series, teacher, room and course code.' });
      }
      if (!['class', 'lab'].includes(type)) {
        return res.status(400).json({ message: `Invalid type for ${courseCode}.` });
      }
      if (!Array.isArray(days) || days.length === 0 || !days.every((d) => DAYS.includes(d))) {
        return res.status(400).json({ message: `Pick at least one valid day for ${courseCode}.` });
      }
      if (pair) {
        if (type !== 'lab') {
          return res.status(400).json({ message: `Only labs can be paired in one slot (${courseCode}).` });
        }
        if (!pair.teacher || !pair.room || !pair.courseCode) {
          return res.status(400).json({ message: `The paired lab for ${courseCode} needs a teacher, room and course code.` });
        }
        if (Number(spec.credit) !== Number(pair.credit)) {
          return res.status(400).json({
            message: `Paired labs must have matching credit: ${courseCode} is ${spec.credit} Cr but ${pair.courseCode} is ${pair.credit} Cr.`,
          });
        }
      }
    }

    const created = [];
    const skipped = [];

    const departments = [...new Set(classes.map((c) => c.department))];
    const dayBuckets = {};
    for (const day of DAYS) {
      dayBuckets[day] = await DynamicRoutine.find({ day, department: { $in: departments } }).lean();
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
      const { department, batch, teacher, room, courseCode, courseTitle, credit, type, color, days, pair } = spec;

      for (const day of days) {
        let placed = null;

        if (type === 'lab') {
          for (const blockKey of ['A', 'B', 'C']) {
            const times = resolveSlotTimes({ type: 'lab', block: blockKey });
            const primaryConflict = slotConflicts(day, times.startTime, times.endTime, teacher, room, batch);
            const pairConflict = pair
              ? slotConflicts(day, times.startTime, times.endTime, pair.teacher, pair.room, batch)
              : false;
            if (primaryConflict || pairConflict) continue;
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
            courseCode,
            day,
            teacher,
            room,
            batch,
            reason:
              type === 'class'
                ? 'No free period that day without a conflict, or it would give this teacher 3 classes in a row.'
                : pair
                ? 'No free lab block that day without a conflict for both paired labs.'
                : 'No free lab block that day without a conflict.',
          });
          continue;
        }

        const pairId = pair ? new mongoose.Types.ObjectId().toString() : null;

        const doc1 = await DynamicRoutine.create({
          department,
          batch,
          day,
          type,
          period: type === 'class' ? placed.period : undefined,
          block: type === 'lab' ? placed.block : undefined,
          startTime: placed.startTime,
          endTime: placed.endTime,
          courseCode,
          courseTitle,
          credit,
          teacher,
          room,
          color: color || 'blue',
          pairId,
          createdBy: req.user.userId,
        });
        dayBuckets[day].push(doc1.toObject());
        created.push(doc1);

        if (pair) {
          const doc2 = await DynamicRoutine.create({
            department,
            batch,
            day,
            type,
            block: placed.block,
            startTime: placed.startTime,
            endTime: placed.endTime,
            courseCode: pair.courseCode,
            courseTitle: pair.courseTitle,
            credit: pair.credit,
            teacher: pair.teacher,
            room: pair.room,
            color: pair.color || 'blue',
            pairId,
            createdBy: req.user.userId,
          });
          dayBuckets[day].push(doc2.toObject());
          created.push(doc2);
        }
      }
    }

    if (created.length > 0) {
      const note = await Notification.create({
        message: `Dynamic routine: ${created.length} slot(s) generated by ${req.user.role}.`,
        source: 'dynamic-routine',
        actionType: 'created',
        actor: req.user.userId,
        department: departments[0] || '',
      });
      const populated = await note.populate('actor', 'name role');
      req.io.emit('notification', populated);
      req.io.emit('dynamicRoutineUpdated', { count: created.length });
    }

    res.status(201).json({ created, skipped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate dynamic routine', error: err.message });
  }
};

// DELETE /api/dynamic-routines/:id  (deletes both halves of a pair together)
exports.deleteDynamicRoutine = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await DynamicRoutine.findById(id);
    if (!existing) return res.status(404).json({ message: 'Slot not found' });

    if (req.user.role !== 'admin' && String(existing.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'You can only delete slots you created' });
    }

    const toDelete = existing.pairId
      ? await DynamicRoutine.find({ pairId: existing.pairId })
      : [existing];
    await DynamicRoutine.deleteMany({ _id: { $in: toDelete.map((d) => d._id) } });

    const note = await Notification.create({
      message: `Dynamic routine: ${existing.courseCode} removed by ${req.user.role}.`,
      source: 'dynamic-routine',
      actionType: 'deleted',
      actor: req.user.userId,
      department: existing.department,
    });
    const populated = await note.populate('actor', 'name role');
    req.io.emit('notification', populated);
    req.io.emit('dynamicRoutineUpdated', { count: toDelete.length });

    res.json({ message: 'Deleted', count: toDelete.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete slot', error: err.message });
  }
};

// DELETE /api/dynamic-routines?department=  (clear-all / start fresh)
exports.clearDynamicRoutines = async (req, res) => {
  try {
    const { department } = req.query;
    const filter = {};
    if (department) filter.department = department;
    // Teachers can only clear their own slots; admins can clear everything in scope.
    if (req.user.role !== 'admin') filter.createdBy = req.user.userId;

    const result = await DynamicRoutine.deleteMany(filter);

    const note = await Notification.create({
      message: `Dynamic routine cleared (${result.deletedCount} slot(s)) by ${req.user.role}.`,
      source: 'dynamic-routine',
      actionType: 'deleted',
      actor: req.user.userId,
      department: department || '',
    });
    const populated = await note.populate('actor', 'name role');
    req.io.emit('notification', populated);
    req.io.emit('dynamicRoutineUpdated', { count: result.deletedCount });

    res.json({ message: 'Cleared', count: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear dynamic routine', error: err.message });
  }
};
