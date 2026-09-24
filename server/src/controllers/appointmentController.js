const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointmentService');

const book = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.bookAppointment({
    viewer: req.user,
    doctorId: req.body.doctorId,
    date: req.body.date,
    startTime: req.body.startTime,
    reason: req.body.reason,
  });
  res.status(201).json({ success: true, appointment });
});

const my = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getMyAppointments(req.user._id, req.query.tab || 'upcoming');
  res.json({ success: true, tab: req.query.tab || 'upcoming', appointments });
});

const detail = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(req.params.id, req.user);
  res.json({ success: true, appointment });
});

const status = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.applyTransition(
    req.params.id,
    req.user,
    req.body.newStatus
  );
  res.json({ success: true, appointment });
});

const cancel = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id, req.user, req.body.reason);
  res.json({ success: true, appointment });
});

const reschedule = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.rescheduleAppointment(req.params.id, req.user, {
    date: req.body.date,
    startTime: req.body.startTime,
  });
  res.json({ success: true, appointment });
});

const startConsultation = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.applyTransition(
    req.params.id,
    req.user,
    'IN_CONSULT',
    'Consultation started'
  );
  res.json({ success: true, appointment });
});

const completeConsultation = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.completeConsultation(
    req.params.id,
    req.user,
    {
      notes: req.body.notes,
      prescription: req.body.prescription,
      followUp: req.body.followUp,
    }
  );
  res.json({ success: true, appointment });
});

const history = asyncHandler(async (req, res) => {
  const history = await appointmentService.getHistory(req.params.id);
  res.json({ success: true, history });
});

module.exports = { book, my, detail, status, cancel, reschedule, startConsultation, completeConsultation, history };