const router = require('express').Router();
const controller = require('../controllers/doctorWorkspaceController');
const { requireAuth, requireDoctor } = require('../middleware/auth');

router.use(requireAuth, requireDoctor);

router.get('/appointments/today', controller.dashboard);
router.get('/queue', controller.queue);
router.get('/appointments', controller.appointments);
router.get('/patients', controller.patients);
router.get('/patients/:id/history', controller.patientHistory);

module.exports = router;