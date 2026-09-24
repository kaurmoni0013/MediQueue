const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

const summary = asyncHandler(async (_req, res) => {
  const result = await adminService.summary();
  res.json({ success: true, ...result });
});

const listDoctors = asyncHandler(async (_req, res) => {
  const doctors = await adminService.listDoctors();
  res.json({ success: true, doctors });
});

const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await adminService.getDoctor(req.params.id);
  res.json({ success: true, doctor });
});

const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await adminService.createDoctor(req.body);
  res.status(201).json({ success: true, doctor });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await adminService.updateDoctor(req.params.id, req.body);
  res.json({ success: true, doctor });
});

const toggleDoctorActive = asyncHandler(async (req, res) => {
  const result = await adminService.setDoctorActive(req.params.id, req.body.isActive);
  res.json({ success: true, ...result });
});

const listStaff = asyncHandler(async (_req, res) => {
  const staff = await adminService.listStaff();
  res.json({ success: true, staff });
});

const createStaff = asyncHandler(async (req, res) => {
  const member = await adminService.createStaff(req.body);
  res.status(201).json({ success: true, member });
});

const updateStaff = asyncHandler(async (req, res) => {
  const member = await adminService.updateStaff(req.params.id, req.body);
  res.json({ success: true, member });
});

const toggleStaffActive = asyncHandler(async (req, res) => {
  const result = await adminService.setStaffActive(req.params.id, req.body.isActive);
  res.json({ success: true, ...result });
});

const listPatients = asyncHandler(async (req, res) => {
  const result = await adminService.listPatients(req.query);
  res.json({ success: true, ...result });
});

const togglePatientActive = asyncHandler(async (req, res) => {
  const result = await adminService.setPatientActive(req.params.id, req.body.isActive);
  res.json({ success: true, ...result });
});

module.exports = {
  summary,
  listDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  toggleDoctorActive,
  listStaff,
  createStaff,
  updateStaff,
  toggleStaffActive,
  listPatients,
  togglePatientActive,
};