const router = require('express').Router();
const controller = require('../controllers/adminController');
const { validate, handleValidationErrors } = require('../middleware/validate');
const { doctorRules, doctorUpdateRules, staffRules, staffUpdateRules } = require('../validators/adminValidators');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/summary', controller.summary);

// Doctors
router.get('/doctors', controller.listDoctors);
router.get('/doctors/:id', controller.getDoctor);
router.post('/doctors', validate(doctorRules), controller.createDoctor);
router.patch('/doctors/:id', validate(doctorUpdateRules), controller.updateDoctor);
router.patch('/doctors/:id/active', controller.toggleDoctorActive);

// Staff
router.get('/staff', controller.listStaff);
router.post('/staff', validate(staffRules), controller.createStaff);
router.patch('/staff/:id', validate(staffUpdateRules), controller.updateStaff);
router.patch('/staff/:id/active', controller.toggleStaffActive);

// Patients
router.get('/patients', controller.listPatients);
router.patch('/patients/:id/active', controller.togglePatientActive);

module.exports = router;