const mongoose = require('mongoose');

/** Audit trail: every status change on an appointment (who + when). */
const statusHistorySchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

statusHistorySchema.index({ appointment: 1, createdAt: 1 });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);