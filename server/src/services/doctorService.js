const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES, ACTIVE_STATUSES, SLOT_FREE_STATUSES } = require('../utils/constants');
const { toMinutes, fromMinutes, dateKey } = require('../utils/time');

function serializeProfile(profile) {
  const doctor = profile.user;
  return {
    id: String(doctor ? doctor._id : profile.user), // doctor's User id (matches Appointment.doctor + booking payloads)
    name: doctor ? doctor.name : '',
    email: doctor ? doctor.email : '',
    phone: doctor ? doctor.phone : '',
    profileId: String(profile._id),
    specialization: profile.specialization,
    qualification: profile.qualification,
    experienceYears: profile.experienceYears,
    consultationDuration: profile.consultationDuration,
    bio: profile.bio,
    fees: profile.fees,
    availability: profile.availability.map((a) => ({
      day: a.day,
      ranges: a.ranges.map((r) => ({ start: r.start, end: r.end })),
    })),
    availableDays: profile.availability.map((a) => a.day),
  };
}

function isDoctorAvailableOnDay(profile, key) {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return profile.availability.some((slot) => slot.day === dow);
}

async function listDoctors() {
  const profiles = await DoctorProfile.find().populate('user', 'name email phone').sort('specialization name').lean();
  return profiles.map(serializeProfile);
}

async function getDoctor(id) {
  const profile = await DoctorProfile.findOne({ user: id }).populate('user', 'name email phone');
  if (!profile) throw new ApiError(404, 'Doctor not found', ERROR_CODES.NOT_FOUND);
  return serializeProfile(profile);
}

/**
 * Slot discovery for a doctor + date.
 * Candidate slots are generated from the doctor's schedule at
 * consultationDuration intervals. A slot is "available" only when no active
 * appointment overlaps it. Availability is decided here AND re-verified at
 * booking time.
 */
async function getAvailability(doctorId, date, now = new Date()) {
  const profile = await DoctorProfile.findOne({ user: doctorId }).populate('user', 'name email phone');
  if (!profile) throw new ApiError(404, 'Doctor not found', ERROR_CODES.NOT_FOUND);

  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const daySchedule = profile.availability.find((slot) => slot.day === dow);
  const duration = profile.consultationDuration;

  if (!daySchedule) {
    return {
      doctor: serializeProfile(profile),
      date,
      dayOfWeek: dow,
      durationMinutes: duration,
      availableToday: false,
      slots: [],
    };
  }

  const candidates = [];
  daySchedule.ranges.forEach((range) => {
    let t = toMinutes(range.start);
    const end = toMinutes(range.end);
    while (t + duration <= end) {
      candidates.push({ start: fromMinutes(t), end: fromMinutes(t + duration) });
      t += duration;
    }
  });

  const booked = await Appointment.find({
    doctor: profile.user._id,
    date,
    status: { $in: ACTIVE_STATUSES },
  })
    .select('startTime endTime status')
    .lean();

  const overlaps = (a, b) => a.start < b.end && a.end > b.start;

  const isPast = (slot) => {
    const slotStart = new Date(y, m - 1, d, ...slot.start.split(':').map(Number));
    return slotStart <= now;
  };

  const slots = candidates.map((slot) => {
    const clash = booked.find((b) => overlaps(slot, { start: b.startTime, end: b.endTime }));
    return {
      start: slot.start,
      end: slot.end,
      available: !clash && !isPast(slot),
      bookedBy: clash ? clash.status : null,
    };
  });

  return {
    doctor: serializeProfile(profile),
    date,
    dayOfWeek: dow,
    durationMinutes: duration,
    availableToday: true,
    slots,
  };
}

/** Confirm doctor works on `date` and that the slot aligns to their grid. */
async function assertValidSlot(doctorId, date, startTime) {
  const profile = await DoctorProfile.findOne({ user: doctorId }).populate('user', 'name email phone');
  if (!profile) throw new ApiError(404, 'Doctor not found', ERROR_CODES.NOT_FOUND);

  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const daySchedule = profile.availability.find((slot) => slot.day === dow);
  if (!daySchedule) {
    throw new ApiError(409, 'Doctor is not available on this date', ERROR_CODES.DOCTOR_NOT_AVAILABLE);
  }

  const duration = profile.consultationDuration;
  const t = toMinutes(startTime);
  const valid = daySchedule.ranges.some((range) => {
    const from = toMinutes(range.start);
    const to = toMinutes(range.end);
    return t >= from && t + duration <= to && (t - from) % duration === 0;
  });
  if (!valid) {
    throw new ApiError(409, 'Selected time is outside this doctor\u2019s available schedule', ERROR_CODES.DOCTOR_NOT_AVAILABLE);
  }

  const slot = {
    start: startTime,
    end: fromMinutes(t + duration),
  };

  // Reject slots that have already started (only relevant for today).
  const slotStart = new Date(y, m - 1, d, ...startTime.split(':').map(Number));
  if (dateKey(new Date()) === date && slotStart <= new Date()) {
    throw new ApiError(409, 'This time slot has already started', ERROR_CODES.DOCTOR_NOT_AVAILABLE);
  }
  return { profile, slot };
}

/**
 * Conflict detection — the core booking rule:
 *   newStart < existingEnd && newEnd > existingStart
 * CANCELLED and COMPLETED appointments release their slot.
 */
async function findActiveBooking(doctorId, date, slot, excludeId) {
  const query = {
    doctor: doctorId,
    date,
    status: { $nin: SLOT_FREE_STATUSES },
    startTime: { $lt: slot.end },
    endTime: { $gt: slot.start },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Appointment.findOne(query).lean();
}

module.exports = {
  serializeProfile,
  listDoctors,
  getDoctor,
  getAvailability,
  assertValidSlot,
  findActiveBooking,
  isDoctorAvailableOnDay,
};