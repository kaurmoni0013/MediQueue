const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES, ROLES, ACTIVE_STATUSES } = require('../utils/constants');
const { dateKey } = require('../utils/time');

/* ------------------------------ helpers ------------------------------ */

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function ensureEmailFree(email, excludeId) {
  const exists = excludeId
    ? await User.exists({ email, _id: { $ne: excludeId } })
    : await User.exists({ email });
  if (exists) throw new ApiError(409, 'An account with this email already exists', ERROR_CODES.EMAIL_IN_USE);
}

function normalizeAvailability(availability) {
  if (!Array.isArray(availability) || availability.length === 0) return [];
  const seen = new Set();
  return availability
    .filter((slot) => {
      const day = Number(slot.day);
      const ok = day >= 0 && day <= 6 && Array.isArray(slot.ranges) && slot.ranges.length > 0 && !seen.has(day);
      if (ok) seen.add(day);
      return ok;
    })
    .map((slot) => ({
      day: Number(slot.day),
      ranges: slot.ranges
        .filter((r) => /^\d{2}:\d{2}$/.test(r.start) && /^\d{2}:\d{2}$/.test(r.end))
        .map((r) => ({ start: r.start, end: r.end })),
    }));
}

/* ------------------------------ doctors ------------------------------- */

async function listDoctors() {
  const profiles = await DoctorProfile.find().populate('user', 'name email phone isActive').sort('specialization name').lean();
  return profiles.map((p) => ({
    id: String(p.user ? p.user._id : p.user),
    userId: String(p.user ? p.user._id : p.user),
    profileId: String(p._id),
    name: p.user ? p.user.name : '',
    email: p.user ? p.user.email : '',
    phone: p.user ? p.user.phone : '',
    isActive: p.user ? p.user.isActive : false,
    specialization: p.specialization,
    qualification: p.qualification,
    experienceYears: p.experienceYears,
    consultationDuration: p.consultationDuration,
    bio: p.bio,
    fees: p.fees,
    availability: p.availability.map((a) => ({ day: a.day, ranges: a.ranges })),
  }));
}

async function getDoctor(id) {
  const profile = await DoctorProfile.findOne({ user: id }).populate('user', 'name email phone isActive');
  if (!profile || !profile.user) throw new ApiError(404, 'Doctor not found', ERROR_CODES.NOT_FOUND);
  return {
    id: String(profile.user._id),
    userId: String(profile.user._id),
    profileId: String(profile._id),
    name: profile.user.name,
    email: profile.user.email,
    phone: profile.user.phone || '',
    isActive: profile.user.isActive,
    specialization: profile.specialization,
    qualification: profile.qualification,
    experienceYears: profile.experienceYears,
    consultationDuration: profile.consultationDuration,
    bio: profile.bio,
    fees: profile.fees,
    availability: profile.availability.map((a) => ({ day: a.day, ranges: a.ranges })),
  };
}

async function createDoctor(payload) {
  await ensureEmailFree(payload.email);
  const { name, email, password, phone, ...profileFields } = payload;

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: ROLES.DOCTOR,
    phone: phone || '',
  });

  await DoctorProfile.create({
    user: user._id,
    specialization: profileFields.specialization || 'General Medicine',
    qualification: profileFields.qualification || '',
    experienceYears: Number(profileFields.experienceYears) || 0,
    consultationDuration: Number(profileFields.consultationDuration) || 15,
    bio: profileFields.bio || '',
    fees: Number(profileFields.fees) || 0,
    availability: normalizeAvailability(profileFields.availability),
  });

  return getDoctor(user._id);
}

async function updateDoctor(id, payload) {
  const profile = await DoctorProfile.findOne({ user: id }).populate('user', 'name email phone');
  if (!profile || !profile.user) throw new ApiError(404, 'Doctor not found', ERROR_CODES.NOT_FOUND);

  if (payload.email && payload.email !== profile.user.email) {
    await ensureEmailFree(payload.email, profile.user._id);
  }

  const userUpdates = {};
  if (payload.name) userUpdates.name = payload.name;
  if (payload.email) userUpdates.email = payload.email;
  if (typeof payload.phone === 'string') userUpdates.phone = payload.phone;
  if (Object.keys(userUpdates).length) await User.updateOne({ _id: profile.user._id }, userUpdates);

  const profileUpdates = {};
  if (payload.specialization) profileUpdates.specialization = payload.specialization;
  if (typeof payload.qualification === 'string') profileUpdates.qualification = payload.qualification;
  if (payload.experienceYears !== undefined) profileUpdates.experienceYears = Number(payload.experienceYears);
  if (payload.consultationDuration !== undefined) profileUpdates.consultationDuration = Number(payload.consultationDuration);
  if (typeof payload.bio === 'string') profileUpdates.bio = payload.bio;
  if (payload.fees !== undefined) profileUpdates.fees = Number(payload.fees);
  if (payload.availability !== undefined) profileUpdates.availability = normalizeAvailability(payload.availability);

  if (Object.keys(profileUpdates).length) await DoctorProfile.updateOne({ _id: profile._id }, profileUpdates);

  return getDoctor(id);
}

async function setDoctorActive(id, isActive) {
  const user = await User.findOne({ _id: id, role: ROLES.DOCTOR }).select('name');
  if (!user) throw new ApiError(404, 'Doctor not found', ERROR_CODES.NOT_FOUND);
  await User.updateOne({ _id: id }, { isActive: !!isActive });
  return { id, name: user.name, isActive: !!isActive };
}

/* ------------------------------- staff -------------------------------- */

async function listStaff() {
  const staff = await User.find({ role: ROLES.STAFF })
    .select('name email phone isActive createdAt')
    .sort('name')
    .lean();
  return staff.map((u) => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone || '', isActive: u.isActive, createdAt: u.createdAt }));
}

async function createStaff({ name, email, password, phone }) {
  await ensureEmailFree(email);
  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role: ROLES.STAFF, phone: phone || '' });
  return { id: String(user._id), name: user.name, email: user.email, phone: user.phone || '', isActive: true, createdAt: user.createdAt };
}

async function updateStaff(id, payload) {
  const user = await User.findOne({ _id: id, role: ROLES.STAFF }).select('name email phone isActive');
  if (!user) throw new ApiError(404, 'Staff member not found', ERROR_CODES.NOT_FOUND);
  if (payload.email && payload.email !== user.email) await ensureEmailFree(payload.email, id);
  const updates = {};
  if (payload.name) updates.name = payload.name;
  if (payload.email) updates.email = payload.email;
  if (typeof payload.phone === 'string') updates.phone = payload.phone;
  if (Object.keys(updates).length) await User.updateOne({ _id: id }, updates);
  return listStaff().then((rows) => rows.find((r) => r.id === String(id)));
}

async function setStaffActive(id, isActive) {
  const user = await User.findOne({ _id: id, role: ROLES.STAFF }).select('name');
  if (!user) throw new ApiError(404, 'Staff member not found', ERROR_CODES.NOT_FOUND);
  await User.updateOne({ _id: id }, { isActive: !!isActive });
  return { id, name: user.name, isActive: !!isActive };
}

/* ------------------------------ patients ------------------------------ */

async function listPatients(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const search = (query.search || '').trim();

  const filter = { role: ROLES.PATIENT };
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }

  const [rows, total] = await Promise.all([
    User.find(filter).select('name email phone dateOfBirth gender isActive createdAt').sort('name').skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    patients: rows.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      dateOfBirth: u.dateOfBirth || '',
      gender: u.gender || '',
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function setPatientActive(id, isActive) {
  const user = await User.findOne({ _id: id, role: ROLES.PATIENT }).select('name');
  if (!user) throw new ApiError(404, 'Patient not found', ERROR_CODES.NOT_FOUND);
  await User.updateOne({ _id: id }, { isActive: !!isActive });
  return { id, name: user.name, isActive: !!isActive };
}

/* ------------------------------- summary ------------------------------ */

async function summary() {
  const today = dateKey(new Date());
  const [totalDoctors, totalStaff, totalPatients, todayAppointments, todayByStatus] = await Promise.all([
    User.countDocuments({ role: ROLES.DOCTOR }),
    User.countDocuments({ role: ROLES.STAFF }),
    User.countDocuments({ role: ROLES.PATIENT }),
    Appointment.countDocuments({ date: today }),
    Appointment.aggregate([{ $match: { date: today } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const statusCounts = { SCHEDULED: 0, WAITING: 0, IN_CONSULT: 0, COMPLETED: 0, CANCELLED: 0 };
  todayByStatus.forEach((row) => {
    statusCounts[row._id] = row.count;
  });

  const activeToday = ACTIVE_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0);

  return {
    counts: { doctors: totalDoctors, staff: totalStaff, patients: totalPatients },
    today: {
      total: todayAppointments,
      active: activeToday,
      byStatus: statusCounts,
    },
  };
}

module.exports = {
  listDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  setDoctorActive,
  listStaff,
  createStaff,
  updateStaff,
  setStaffActive,
  listPatients,
  setPatientActive,
  summary,
};