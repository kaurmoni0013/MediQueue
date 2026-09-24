const mongoose = require('mongoose');

/**
 * Doctor schedule. Availability is expressed per day-of-week (0=Sunday..6=Saturday)
 * with one or more time ranges. Slots are derived from ranges using the doctor's
 * consultationDuration, and verified again at booking time on the backend.
 */
const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    specialization: { type: String, required: true, trim: true },
    qualification: { type: String, default: '', trim: true },
    experienceYears: { type: Number, required: true, min: 0 },
    consultationDuration: { type: Number, required: true, min: 5, default: 15 },
    bio: { type: String, default: '', maxlength: 500 },
    fees: { type: Number, min: 0, default: 0 },
    availability: [
      {
        day: { type: Number, min: 0, max: 6, required: true },
        ranges: [
          {
            start: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
            end: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
          },
        ],
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

doctorProfileSchema.index({ user: 1 }, { unique: true });
doctorProfileSchema.index({ specialization: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);