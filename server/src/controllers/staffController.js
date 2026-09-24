const User = require('../models/User');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointmentService');
const { buildQueueForDoctor } = require('../services/queueService');
const { dateKey } = require('../utils/time');

const today = asyncHandler(async (_req, res) => {
  const result = await appointmentService.getStaffToday();
  res.json({ success: true, ...result });
});

const queue = asyncHandler(async (req, res) => {
  const date = req.query.date || dateKey(new Date());
  const doctorId = req.query.doctorId || null;
  const result = await buildQueueForDoctor(doctorId, date);
  res.json({ success: true, ...result });
});

const appointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getStaffAppointments(req.query);
  res.json({ success: true, ...result });
});

const patients = asyncHandler(async (req, res) => {
  const result = await appointmentService.listPatients(req.query);
  res.json({ success: true, ...result });
});

/** Staff can view the full appointment history of any patient. */
const patientHistory = asyncHandler(async (req, res) => {
  const patient = await User.findOne({ _id: req.params.id, role: 'PATIENT' }).select('name email phone');
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found', code: 'NOT_FOUND' });
  }

  const rows = await Appointment.find({ patient: patient._id })
    .populate([
      { path: 'patient', select: 'name email phone' },
      { path: 'doctor', select: 'name email' },
      { path: 'doctorProfile', select: 'specialization consultationDuration' },
    ])
    .sort({ date: -1, startTime: 1 })
    .limit(200)
    .lean();

  res.json({
    success: true,
    patient: {
      id: String(patient._id),
      name: patient.name,
      email: patient.email,
      phone: patient.phone || '',
    },
    appointments: rows.map((a) => appointmentService.serialize(a, null, null)),
  });
});

const summary = asyncHandler(async (_req, res) => {
  const result = await appointmentService.getStaffSummary();
  res.json({ success: true, ...result });
});

module.exports = { today, queue, appointments, patients, patientHistory, summary };