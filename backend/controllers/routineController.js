const Routine = require('../models/Routine');
const ChangeLog = require('../models/ChangeLog');
const Notification = require('../models/Notification');
const { findConflict } = require('../utils/conflictCheck');
const { resolveSlotTimes, DAYS } = require('../utils/schedule');

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

    const note = await Notification.create({
      message: `${courseCode} added to ${batch} (${day}) by ${req.user.role}.`,
      source: 'routine',
      actionType: 'created',
      actor: req.user.userId,
      department,
    });
    const populatedNote = await note.populate('actor', 'name role');
    req.io.emit('notification', populatedNote);
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

    const note = await Notification.create({
      message: `${existing.courseCode} updated on ${existing.batch} (${existing.day}) by ${req.user.role}.`,
      source: 'routine',
      actionType: 'updated',
      actor: req.user.userId,
      department: existing.department,
    });
    const populatedNote = await note.populate('actor', 'name role');
    req.io.emit('notification', populatedNote);
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

    const note = await Notification.create({
      message: `${existing.courseCode} removed from ${existing.batch} (${existing.day}) by ${req.user.role}.`,
      source: 'routine',
      actionType: 'deleted',
      actor: req.user.userId,
      department: existing.department,
    });
    const populatedNote = await note.populate('actor', 'name role');
    req.io.emit('notification', populatedNote);
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

// PUT /api/routines/swap
exports.swapRoutine = async (req, res) => {
  try {
    const { sourceId, targetDay, targetPeriod, targetBlock } = req.body;
    const sourceSlot = await Routine.findById(sourceId);
    if (!sourceSlot) return res.status(404).json({ message: 'Source slot not found' });

    if (!canManage(req.user, sourceSlot)) {
      return res.status(403).json({ message: 'You can only move slots you created' });
    }

    if (!DAYS.includes(targetDay)) {
      return res.status(400).json({ message: 'Invalid target day' });
    }

    const type = sourceSlot.type;
    const times = resolveSlotTimes({
      type,
      period: type === 'class' ? Number(targetPeriod) : undefined,
      block: type === 'lab' ? targetBlock : undefined,
    });

    if (!times) {
      return res.status(400).json({ message: 'Invalid target period or block timing' });
    }

    const targetFilter = {
      department: sourceSlot.department,
      batch: sourceSlot.batch,
      day: targetDay,
      type,
    };
    if (type === 'class') targetFilter.period = Number(targetPeriod);
    else targetFilter.block = targetBlock;

    const targetSlot = await Routine.findOne(targetFilter);

    if (targetSlot) {
      const srcDay = sourceSlot.day;
      const srcPeriod = sourceSlot.period;
      const srcBlock = sourceSlot.block;
      const srcStart = sourceSlot.startTime;
      const srcEnd = sourceSlot.endTime;

      sourceSlot.day = targetSlot.day;
      sourceSlot.period = targetSlot.period;
      sourceSlot.block = targetSlot.block;
      sourceSlot.startTime = targetSlot.startTime;
      sourceSlot.endTime = targetSlot.endTime;
      await sourceSlot.save();

      targetSlot.day = srcDay;
      targetSlot.period = srcPeriod;
      targetSlot.block = srcBlock;
      targetSlot.startTime = srcStart;
      targetSlot.endTime = srcEnd;
      await targetSlot.save();

      const noteMsg = `Swapped class [${sourceSlot.courseCode}] with [${targetSlot.courseCode}] on ${targetDay} for ${sourceSlot.batch}.`;
      const note = await Notification.create({
        message: noteMsg,
        source: 'routine',
        actionType: 'updated',
        actor: req.user.userId,
        department: sourceSlot.department,
      });
      const populated = await note.populate('actor', 'name role');
      req.io.emit('notification', populated);
      req.io.emit('routineUpdated', { type: 'swapped', sourceSlot, targetSlot });

      return res.json({ message: 'Swapped successfully', sourceSlot, targetSlot });
    } else {
      sourceSlot.day = targetDay;
      sourceSlot.period = type === 'class' ? Number(targetPeriod) : undefined;
      sourceSlot.block = type === 'lab' ? targetBlock : undefined;
      sourceSlot.startTime = times.startTime;
      sourceSlot.endTime = times.endTime;
      await sourceSlot.save();

      const noteMsg = `Moved class [${sourceSlot.courseCode}] to ${targetDay} (${times.startTime}-${times.endTime}) in Room ${sourceSlot.room} for ${sourceSlot.batch}.`;
      const note = await Notification.create({
        message: noteMsg,
        source: 'routine',
        actionType: 'updated',
        actor: req.user.userId,
        department: sourceSlot.department,
      });
      const populated = await note.populate('actor', 'name role');
      req.io.emit('notification', populated);
      req.io.emit('routineUpdated', { type: 'moved', sourceSlot });

      return res.json({ message: 'Moved successfully', sourceSlot });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to swap or move slot', error: err.message });
  }
};


