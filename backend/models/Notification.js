const mongoose = require('mongoose');

// Every create/update/delete on either the manual routine or the dynamic
// (auto-scheduled) routine writes one of these, and the server pushes it to
// every connected client over the 'notification' socket event so the bell
// icon in the navbar lights up in real time.
const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    source: { type: String, enum: ['routine', 'dynamic-routine'], required: true },
    actionType: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
