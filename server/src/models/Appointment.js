const mongoose = require('mongoose');
const { APPOINTMENT_STATUS } = require('../utils/constants');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.SCHEDULED,
      index: true,
    },
    reason: { type: String, default: '', maxlength: 500 }, // patient complaint / reason for visit
    notes: { type: String, default: '', maxlength: 2000 }, // clinical notes
    prescription: { type: String, default: '', maxlength: 2000 },
    followUp: { type: String, default: '', maxlength: 1000 },
    cancellationReason: { type: String, default: '', maxlength: 500 },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: { type: Date },
    consultStartedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Query-friendly indexes (doctor+date for conflict/queue, patient+date for
// portal history, status+date for ops dashboards).
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ patient: 1, date: -1 });
appointmentSchema.index({ status: 1, date: 1 });

// Safety net for the "two patients booking the same slot" race condition:
// even if two requests both pass the overlap query, only one create can
// succeed because active appointments must be unique on (doctor,date,startTime).
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['SCHEDULED', 'WAITING', 'IN_CONSULT'] } } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);