const Routine = require('../models/Routine');

// Two time ranges overlap if start1 < end2 AND start2 < end1
function timesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

/**
 * Checks whether a new/updated routine slot clashes with an existing one
 * on the same day, in the same room, with the same teacher, OR for the
 * same batch (a batch of students can't be in two places at once even if
 * the room and teacher both differ).
 * excludeId: pass the routine's own _id when updating, so it doesn't conflict with itself.
 */
async function findConflict({ day, startTime, endTime, room, teacher, batch, excludeId }) {
  const query = { day };
  if (excludeId) query._id = { $ne: excludeId };

  const candidates = await Routine.find({
    ...query,
    $or: [{ room }, { teacher }, { batch }],
  });

  return candidates.find((slot) =>
    timesOverlap(startTime, endTime, slot.startTime, slot.endTime)
  );
}

module.exports = { findConflict, timesOverlap };
