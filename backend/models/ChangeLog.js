const mongoose = require('mongoose');

const changeLogSchema = new mongoose.Schema(
  {
    routineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine' },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changeType: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    oldValue: { type: Object, default: null },
    newValue: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChangeLog', changeLogSchema);
