const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const StatusHistory = require('../models/StatusHistory');
const ApiError = require('../utils/ApiError');
const {
  ROLES,
  ERROR_CODES,
  ACTIVE_STATUSES,
  SLOT_FREE_STATUSES,
  TRANSITIONS,
  TRANSITION_ACTORS,
  CANCELLATION_RULES,
} = require('../utils/constants');
const { dateKey } = require('../utils/time');
const { assertValidSlot, findActiveBooking } = require('./doctorService');
const { buildQueueForDoctor } = require('./queueService');

const BASE_POPULATE = [
  { path: 'patient', select: 'name email phone' },
  { path: 'doctor', select: 'name email' },
  { path: 'doctorProfile', select: 'specialization consultationDuration experienceYears' },
];

const todayKey = (now = new Date()) => dateKey(now);

/* ------------------------------ serialization ----------------------------- */

function serialize(appt, queueMeta = null, viewerRole = null) {
  const isCompleted = appt.status === 'COMPLETED';
  // Clinical fields are only exposed to a patient after the consultation is
  // completed. Staff and the assigned doctor always see them.
  const hideClinical = viewerRole === ROLES.PATIENT && !isCompleted;

  return {
    id: String(appt._id),
    patient: appt.patient
      ? { id: String(appt.patient._id), name: appt.patient.name, phone: appt.patient.phone || '', email: appt.patient.email }
      : null,
    doctor: appt.doctor
      ? {
          id: String(appt.doctor._id),
          name: appt.doctor.name,
          specialization: (appt.doctorProfile && appt.doctorProfile.specialization) || '',
          durationMinutes: (appt.doctorProfile && appt.doctorProfile.consultationDuration) || 15,
        }
      : null,
    date: appt.date,
    startTime: appt.startTime,
    endTime: appt.endTime,
    status: appt.status,
    reason: appt.reason || '',
    notes: hideClinical ? '' : appt.notes || '',
    prescription: hideClinical ? '' : appt.prescription || '',
    followUp: hideClinical ? '' : appt.followUp || '',
    cancellationReason: appt.cancellationReason || '',
    checkedInAt: appt.checkedInAt || null,
    consultStartedAt: appt.consultStartedAt || null,
    completedAt: appt.completedAt || null,
    createdAt: appt.createdAt,
    updatedAt: appt.updatedAt,
    queuePosition: queueMeta ? queueMeta.position : null,
    estimatedWait: queueMeta ? queueMeta.estimatedWait : null,
  };
}

/** Attach queue position + wait to a list of appointments in one pass. */
async function attachQueue(appointments) {
  const groups = new Map();
  appointments.forEach((a) => {
    const key = `${String(a.doctor._id)}|${a.date}`;
    if (!groups.has(key)) groups.set(key, { doctorId: a.doctor._id, date: a.date, ids: [] });
    groups.get(key).ids.push(String(a._id));
  });

  const metaById = new Map();
  for (const group of groups.values()) {
    const q = await buildQueueForDoctor(group.doctorId, group.date);
    group.ids.forEach((id) => {
      const entry = q.queue.find((e) => e.appointmentId === id) || null;
      metaById.set(id, entry);
    });
  }
  return appointments.map((a) => serialize(a, metaById.get(String(a._id)) || null));
}

async function attachQueueTo(appt, viewerRole = null) {
  const doctorId = appt.doctor && appt.doctor._id ? appt.doctor._id : appt.doctor;
  let meta = null;
  if (ACTIVE_STATUSES.includes(appt.status)) {
    const q = await buildQueueForDoctor(doctorId, appt.date);
    const entry = q.queue.find((e) => e.appointmentId === String(appt._id));
    meta = entry || null;
  }
  return serialize(appt, meta, viewerRole);
}

/* --------------------------- history helper ------------------------------- */

async function recordHistory(appointmentId, previousStatus, newStatus, changedBy, note = '') {
  await StatusHistory.create({ appointment: appointmentId, previousStatus, newStatus, changedBy, note });
}

async function getHistory(appointmentId) {
  return StatusHistory.find({ appointment: appointmentId }).sort('createdAt');
}

/* ------------------------------ booking ----------------------------------- */

async function bookAppointment({ viewer, doctorId, date, startTime, reason }) {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, 'Select a valid doctor', ERROR_CODES.VALIDATION_ERROR);
  }

  if (date < todayKey()) {
    throw new ApiError(409, 'Cannot book an appointment in the past', ERROR_CODES.DOCTOR_NOT_AVAILABLE);
  }

  const { profile, slot } = await assertValidSlot(doctorId, date, startTime);

  // Server-side conflict check: two patients can never hold the same slot.
  const clash = await findActiveBooking(doctorId, date, slot);
  if (clash) {
    throw new ApiError(409, 'Selected appointment slot is no longer available', ERROR_CODES.SLOT_CONFLICT);
  }

  let appointment;
  try {
    appointment = await Appointment.create({
      patient: viewer._id,
      doctor: profile.user._id,
      doctorProfile: profile._id,
      date,
      startTime: slot.start,
      endTime: slot.end,
      reason: reason || '',
      status: 'SCHEDULED',
    });
  } catch (err) {
    // Unique (doctor,date,startTime) partial index protects against a
    // simultaneous booking race even if both queries pass the check above.
    if (err && err.code === 11000) {
      throw new ApiError(409, 'Selected appointment slot is no longer available', ERROR_CODES.SLOT_CONFLICT);
    }
    throw err;
  }

  await recordHistory(appointment._id, null, 'SCHEDULED', viewer._id, 'Appointment booked');

  const populated = await Appointment.findById(appointment._id).populate(BASE_POPULATE).lean();
  return attachQueueTo(populated, ROLES.PATIENT);
}

/* ------------------------------ patient side ------------------------------ */

async function getMyAppointments(userId, tab = 'upcoming') {
  const today = todayKey();
  const filter = { patient: userId };
  if (tab === 'upcoming') filter.status = { $in: ['SCHEDULED', 'WAITING', 'IN_CONSULT'] };
  if (tab === 'completed') filter.status = 'COMPLETED';
  if (tab === 'cancelled') filter.status = 'CANCELLED';

  const sort = tab === 'completed' ? { date: -1, startTime: 1 } : { date: 1, startTime: 1 };

  const rows = await Appointment.find(filter).sort(sort).limit(200).populate(BASE_POPULATE).lean();

  if (tab === 'upcoming') {
    const withQueue = await attachQueue(rows);
    return withQueue.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      return dateDiff !== 0 ? dateDiff : a.startTime.localeCompare(b.startTime);
    });
  }
  return rows.map((a) => serialize(a, null, ROLES.PATIENT));
}

async function getAppointmentById(appointmentId, requester) {
  const appt = await Appointment.findById(appointmentId).populate(BASE_POPULATE).lean();
  if (!appt) throw new ApiError(404, 'Appointment not found', ERROR_CODES.APPOINTMENT_NOT_FOUND);

  if (requester.role === ROLES.PATIENT && String(appt.patient._id) !== String(requester._id)) {
    throw new ApiError(403, 'This appointment does not belong to you', ERROR_CODES.FORBIDDEN);
  }
  if (requester.role === ROLES.DOCTOR && String(appt.doctor._id) !== String(requester._id)) {
    throw new ApiError(403, 'This appointment is not assigned to you', ERROR_CODES.FORBIDDEN);
  }
  return attachQueueTo(appt, requester.role);
}

/* --------------------------- status transitions --------------------------- */

async function applyTransition(appointmentId, actor, newStatus, note = '') {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw new ApiError(404, 'Appointment not found', ERROR_CODES.APPOINTMENT_NOT_FOUND);

  const edge = `${appt.status}->${newStatus}`;
  const allowed = TRANSITIONS[appt.status] || [];
  const allowedActors = TRANSITION_ACTORS[edge] || [];

  if (!allowed.includes(newStatus) || allowedActors.length === 0) {
    throw new ApiError(
      409,
      'Invalid appointment status transition',
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      { currentStatus: appt.status, requestedStatus: newStatus }
    );
  }
  if (!allowedActors.includes(actor.role)) {
    throw new ApiError(403, 'You are not authorized for this transition', ERROR_CODES.FORBIDDEN);
  }
  if (actor.role === ROLES.DOCTOR && String(appt.doctor) !== String(actor._id)) {
    throw new ApiError(403, 'This appointment is not assigned to you', ERROR_CODES.FORBIDDEN);
  }

  const previous = appt.status;
  const now = new Date();
  if (newStatus === 'WAITING') appt.checkedInAt = now;
  if (newStatus === 'IN_CONSULT') appt.consultStartedAt = now;
  if (newStatus === 'COMPLETED') appt.completedAt = now;
  appt.status = newStatus;
  await appt.save();
  await recordHistory(appt._id, previous, newStatus, actor._id, note);

  const populated = await Appointment.findById(appt._id).populate(BASE_POPULATE).lean();
  return attachQueueTo(populated, actor.role);
}

/* ------------------------------ cancellation ------------------------------ */

async function cancelAppointment(appointmentId, actor, reason) {
  const appt = await Appointment.findById(appointmentId).populate(BASE_POPULATE);
  if (!appt) throw new ApiError(404, 'Appointment not found', ERROR_CODES.APPOINTMENT_NOT_FOUND);
  if (appt.status === 'CANCELLED') {
    throw new ApiError(409, 'This appointment is already cancelled', ERROR_CODES.APPOINTMENT_ALREADY_CANCELLED);
  }
  if (appt.status === 'COMPLETED') {
    throw new ApiError(400, 'Completed appointments cannot be cancelled', ERROR_CODES.APPOINTMENT_ALREADY_COMPLETED);
  }

  const allowedStatuses = CANCELLATION_RULES[actor.role] || [];
  if (actor.role === ROLES.PATIENT && String(appt.patient._id) !== String(actor._id)) {
    throw new ApiError(403, 'This appointment does not belong to you', ERROR_CODES.FORBIDDEN);
  }
  if (!allowedStatuses.includes(appt.status)) {
    throw new ApiError(
      409,
      'Only scheduled appointments can be cancelled at this stage',
      ERROR_CODES.CANNOT_CANCEL
    );
  }

  const previous = appt.status;
  appt.status = 'CANCELLED';
  appt.cancellationReason = reason;
  appt.cancelledBy = actor._id;
  await appt.save();
  await recordHistory(appt._id, previous, 'CANCELLED', actor._id, `Cancelled: ${reason}`);

  const lean = appt.toObject();
  return serialize(lean, null, actor.role);
}

/* ------------------------------ rescheduling ------------------------------ */

async function rescheduleAppointment(appointmentId, actor, { date, startTime }) {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw new ApiError(404, 'Appointment not found', ERROR_CODES.APPOINTMENT_NOT_FOUND);
  if (!['SCHEDULED', 'WAITING'].includes(appt.status)) {
    throw new ApiError(
      409,
      'Only scheduled or waiting appointments can be rescheduled',
      ERROR_CODES.INVALID_STATUS_TRANSITION
    );
  }
  if (date < todayKey()) {
    throw new ApiError(409, 'Cannot reschedule into the past', ERROR_CODES.DOCTOR_NOT_AVAILABLE);
  }

  const { slot } = await assertValidSlot(String(appt.doctor), date, startTime);
  const clash = await findActiveBooking(String(appt.doctor), date, slot, appt._id);
  if (clash) {
    throw new ApiError(409, 'Selected appointment slot is no longer available', ERROR_CODES.SLOT_CONFLICT);
  }

  appt.date = date;
  appt.startTime = slot.start;
  appt.endTime = slot.end;
  await appt.save();
  await recordHistory(appt._id, appt.status, appt.status, actor._id, `Rescheduled to ${date} ${slot.start}`);

  const populated = await Appointment.findById(appt._id).populate(BASE_POPULATE).lean();
  return attachQueueTo(populated, ROLES.STAFF);
}

/* ------------------------------ consultation ------------------------------ */

/** Doctor finishes an active consultation: saves clinical output, completes it. */
async function completeConsultation(appointmentId, actor, { notes, prescription, followUp } = {}) {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw new ApiError(404, 'Appointment not found', ERROR_CODES.APPOINTMENT_NOT_FOUND);
  if (String(appt.doctor) !== String(actor._id)) {
    throw new ApiError(403, 'This appointment is not assigned to you', ERROR_CODES.FORBIDDEN);
  }
  if (appt.status !== 'IN_CONSULT') {
    throw new ApiError(
      409,
      'Invalid appointment status transition',
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      { currentStatus: appt.status, requestedStatus: 'COMPLETED' }
    );
  }
  if (!notes && !prescription) {
    throw new ApiError(
      400,
      'Please add clinical notes or a prescription before completing the consultation',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  appt.notes = notes || '';
  appt.prescription = prescription || '';
  appt.followUp = followUp || '';
  appt.status = 'COMPLETED';
  appt.completedAt = new Date();
  await appt.save();
  await recordHistory(appt._id, 'IN_CONSULT', 'COMPLETED', actor._id, 'Consultation completed');

  const populated = await Appointment.findById(appt._id).populate(BASE_POPULATE).lean();
  return attachQueueTo(populated, ROLES.DOCTOR);
}

/* ------------------------------- staff ops -------------------------------- */

async function getStaffToday() {
  const date = todayKey();
  const dbRows = await Appointment.find({ date }).populate(BASE_POPULATE).sort('startTime').lean();

  const summary = { scheduled: 0, waiting: 0, inConsult: 0, completed: 0, cancelled: 0 };
  dbRows.forEach((a) => {
    const key =
      a.status === 'WAITING' ? 'waiting'
      : a.status === 'IN_CONSULT' ? 'inConsult'
      : a.status === 'COMPLETED' ? 'completed'
      : a.status === 'CANCELLED' ? 'cancelled'
      : 'scheduled';
    summary[key] += 1;
  });
  summary.total = dbRows.length;

  const appointments = await attachQueue(dbRows);

  // What each doctor is currently handling.
  const nowServing = {};
  for (const a of appointments) {
    if (a.status === 'IN_CONSULT' && !nowServing[a.doctor.id]) {
      nowServing[a.doctor.id] = a;
    }
  }

  return { date, summary, nowServing, appointments };
}

async function getStaffAppointments({ date, status, doctorId, search, page = 1, limit = 50 }) {
  const filter = {};
  const cleanPage = Math.max(1, parseInt(page, 10) || 1);
  const cleanLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  if (date) filter.date = date;
  if (status) filter.status = status;
  if (doctorId) filter.doctor = doctorId;
  if (search) {
    if (mongoose.Types.ObjectId.isValid(search)) {
      filter._id = search;
    } else {
      const patientIds = await User.find({ name: { $regex: search, $options: 'i' } })
        .select('_id')
        .limit(100)
        .lean();
      filter.patient = { $in: patientIds.map((u) => u._id) };
    }
  }

  const total = await Appointment.countDocuments(filter);
  const rows = await Appointment.find(filter)
    .sort({ date: -1, startTime: 1 })
    .skip((cleanPage - 1) * cleanLimit)
    .limit(cleanLimit)
    .populate(BASE_POPULATE)
    .lean();

  const appointments = await attachQueue(rows);
  return { appointments, total, page: cleanPage, limit: cleanLimit };
}

/* ------------------------------ doctor ops -------------------------------- */

async function getDoctorToday(doctorId) {
  const date = todayKey();
  const rows = await Appointment.find({ doctor: doctorId, date })
    .populate(BASE_POPULATE)
    .sort('startTime')
    .lean();

  const summary = { scheduled: 0, waiting: 0, inConsult: 0, completed: 0, cancelled: 0 };
  rows.forEach((a) => {
    const key =
      a.status === 'WAITING' ? 'waiting'
      : a.status === 'IN_CONSULT' ? 'inConsult'
      : a.status === 'COMPLETED' ? 'completed'
      : a.status === 'CANCELLED' ? 'cancelled'
      : 'scheduled';
    summary[key] += 1;
  });

  const appointments = await attachQueue(rows);
  const active = appointments.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const nowServing = appointments.find((a) => a.status === 'IN_CONSULT') || active[0] || null;
  const nextUp = active.find((a) => a.status !== 'IN_CONSULT') || null;

  return { date, summary, nowServing, nextUp, appointments };
}

async function getPatientHistoryForDoctor(doctorId, patientId) {
  const patient = await User.findOne({ _id: patientId, role: ROLES.PATIENT }).select('name email phone gender dateOfBirth');
  if (!patient) throw new ApiError(404, 'Patient not found', ERROR_CODES.NOT_FOUND);

  const total = await Appointment.countDocuments({ doctor: doctorId, patient: patientId });
  const rows = await Appointment.find({ doctor: doctorId, patient: patientId })
    .populate(BASE_POPULATE)
    .sort({ date: -1, startTime: 1 })
    .limit(100)
    .lean();

  return {
    patient: { id: String(patient._id), name: patient.name, phone: patient.phone || '', email: patient.email },
    appointments: rows.map((a) => serialize(a, null, ROLES.DOCTOR)),
    total,
  };
}

/* ------------------------------- patients --------------------------------- */

async function listPatients({ search = '', page = 1, limit = 50 }) {
  const cleanPage = Math.max(1, parseInt(page, 10) || 1);
  const cleanLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const filter = { role: ROLES.PATIENT };
  if (search) {
    const s = search.trim();
    const re = { $regex: s, $options: 'i' };
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const total = await User.countDocuments(filter);
  const rows = await User.find(filter)
    .sort('name')
    .skip((cleanPage - 1) * cleanLimit)
    .limit(cleanLimit)
    .lean();
  return {
    patients: rows.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      gender: u.gender || '',
      dateOfBirth: u.dateOfBirth || '',
      createdAt: u.createdAt,
    })),
    total,
    page: cleanPage,
    limit: cleanLimit,
  };
}

async function getStaffSummary() {
  const date = todayKey();
  const summaryDocs = await Appointment.aggregate([
    { $match: { date } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = { SCHEDULED: 0, WAITING: 0, IN_CONSULT: 0, COMPLETED: 0, CANCELLED: 0 };
  summaryDocs.forEach((r) => {
    counts[r._id] = r.count;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Per-doctor operating view for today.
  const doctors = await User.find({ role: ROLES.DOCTOR }).select('name').lean();
  const perDoctor = [];
  for (const doc of doctors) {
    const q = await buildQueueForDoctor(doc._id, date);
    const countsForDoc = await Appointment.aggregate([
      { $match: { doctor: doc._id, date } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const dCounts = { SCHEDULED: 0, WAITING: 0, IN_CONSULT: 0, COMPLETED: 0, CANCELLED: 0 };
    countsForDoc.forEach((r) => {
      dCounts[r._id] = r.count;
    });
    perDoctor.push({
      doctorId: String(doc._id),
      name: doc.name,
      waiting: dCounts.WAITING,
      inConsult: dCounts.IN_CONSULT,
      total: Object.values(dCounts).reduce((a, b) => a + b, 0),
      queueLength: q.queue.length,
    });
  }

  return {
    date,
    total,
    scheduled: counts.SCHEDULED,
    waiting: counts.WAITING,
    inConsult: counts.IN_CONSULT,
    completed: counts.COMPLETED,
    cancelled: counts.CANCELLED,
    perDoctor,
  };
}

module.exports = {
  serialize,
  attachQueue,
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  applyTransition,
  completeConsultation,
  cancelAppointment,
  rescheduleAppointment,
  getStaffToday,
  getStaffAppointments,
  getStaffSummary,
  getDoctorToday,
  getPatientHistoryForDoctor,
  listPatients,
  getHistory,
};