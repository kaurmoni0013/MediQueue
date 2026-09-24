const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const { ACTIVE_STATUSES } = require('../utils/constants');

/**
 * Queue computation.
 *
 * For a doctor+date the queue is the list of active appointments
 * (SCHEDULED / WAITING / IN_CONSULT) ordered chronologically by startTime.
 * Position is the 1-based rank in that list. Estimated wait for an entry is
 * the number of active patients strictly ahead multiplied by the doctor's
 * average consultation duration. This is derived from live data and never
 * stored, so it can never become stale.
 */
async function buildQueueForDoctor(doctorId, date) {
  const [active, profile] = await Promise.all([
    Appointment.find({ doctor: doctorId, date, status: { $in: ACTIVE_STATUSES } })
      .sort({ startTime: 1, createdAt: 1 })
      .select('_id status startTime patient doctor')
      .lean(),
    DoctorProfile.findOne({ user: doctorId }).select('consultationDuration').lean(),
  ]);

  const duration = (profile && profile.consultationDuration) || 15;

  const queue = active.map((appt, idx) => ({
    appointmentId: String(appt._id),
    patientId: appt.patient ? String(appt.patient) : null,
    status: appt.status,
    startTime: appt.startTime,
    position: idx + 1,
    aheadActive: idx,
    estimatedWait: idx * duration,
  }));

  return {
    doctorId: String(doctorId),
    date,
    durationMinutes: duration,
    nowServing: queue.length ? queue[0] : null,
    queue,
  };
}

function findQueueEntry(queue, appointmentId) {
  const id = String(appointmentId);
  return queue.queue.find((entry) => entry.appointmentId === id) || null;
}

function positionLabel(queue, appointmentId) {
  const entry = findQueueEntry(queue, appointmentId);
  return entry ? entry.position : null;
}

module.exports = { buildQueueForDoctor, findQueueEntry, positionLabel };