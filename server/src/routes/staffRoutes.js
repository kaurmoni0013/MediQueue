const router = require('express').Router();
const controller = require('../controllers/staffController');
const { requireAuth, requireStaff } = require('../middleware/auth');

router.use(requireAuth, requireStaff);

router.get('/appointments/today', controller.today);
router.get('/queue', controller.queue);
router.get('/appointments', controller.appointments);
router.get('/patients', controller.patients);
router.get('/patients/:id/history', controller.patientHistory);
router.get('/summary', controller.summary);

module.exports = router;