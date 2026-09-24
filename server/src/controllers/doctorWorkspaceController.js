const User = require('../models/User');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointmentService');
const { buildQueueForDoctor } = require('../services/queueService');
const { dateKey } = require('../utils/time');

const dashboard = asyncHandler(async (req, res) => {
  const result = await appointmentService.getDoctorToday(req.user._id);
  res.json({ success: true, ...result });
});

const queue = asyncHandler(async (req, res) => {
  const result = await buildQueueForDoctor(req.user._id, dateKey(new Date()));
  res.json({ success: true, ...result });
});

const appointments = asyncHandler(async (req, res) => {
  const filter = { doctor: req.user._id };
  if (req.query.date) filter.date = req.query.date;
  if (req.query.status) filter.status = req.query.status;
  const rows = await Appointment.find(filter)
    .populate([
      { path: 'patient', select: 'name email phone gender dateOfBirth' },
      { path: 'doctorProfile', select: 'specialization consultationDuration' },
    ])
    .sort({ date: -1, startTime: 1 })
    .limit(200)
    .lean();
  const withDoctor = rows.map((a) => ({ ...a, doctor: { _id: req.user._id, name: req.user.name, email: req.user.email } }));
  const appointments = await appointmentService.attachQueue(withDoctor);
  res.json({ success: true, appointments });
});

const patientHistory = asyncHandler(async (req, res) => {
  const result = await appointmentService.getPatientHistoryForDoctor(req.user._id, req.params.id);
  res.json({ success: true, ...result });
});

const patients = asyncHandler(async (req, res) => {
  const { search } = req.query;
  // Doctors may look up patients they have seen before.
  const apps = await Appointment.distinct('patient', {
    doctor: req.user._id,
  });
  const filter = { _id: { $in: apps } };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const rows = await User.find(filter).select('name email phone gender dateOfBirth').sort('name').limit(100).lean();
  res.json({
    success: true,
    patients: rows.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      gender: u.gender || '',
      dateOfBirth: u.dateOfBirth || '',
    })),
  });
});

module.exports = { dashboard, queue, appointments, patientHistory, patients };