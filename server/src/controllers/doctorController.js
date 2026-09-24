const asyncHandler = require('../utils/asyncHandler');
const doctorService = require('../services/doctorService');

const list = asyncHandler(async (_req, res) => {
  const doctors = await doctorService.listDoctors();
  res.json({ success: true, doctors });
});

const detail = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctor(req.params.id);
  res.json({ success: true, doctor });
});

const availability = asyncHandler(async (req, res) => {
  const date = req.query.date;
  const result = await doctorService.getAvailability(req.params.id, date);
  res.json({ success: true, ...result });
});

module.exports = { list, detail, availability };