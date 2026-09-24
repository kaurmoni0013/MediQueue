const router = require('express').Router();
const controller = require('../controllers/appointmentController');
const validators = require('../validators/appointmentValidators');
const { validate } = require('../middleware/validate');
const { requireAuth, requirePatient, requireStaff, requireDoctor } = require('../middleware/auth');
const { param } = require('express-validator');

const idParam = [param('id').isMongoId().withMessage('Invalid appointment id')];

// Patient books an appointment. The backend re-verifies the slot.
router.post('/', requireAuth, requirePatient, validate(validators.bookRules), controller.book);

// Patient portal list.
router.get('/my', requireAuth, requirePatient, controller.my);

// Shared detail endpoint (patient own / staff / assigned doctor).
router.get('/:id', requireAuth, validate(idParam), controller.detail);

// Staff check-in: SCHEDULED -> WAITING.
router.patch('/:id/status', requireAuth, requireStaff, validate([...validators.idParamRules, ...validators.statusRules]), controller.status);

// Cancellation (patient own) or (staff clinic-side).
router.patch('/:id/cancel', requireAuth, validate([...validators.idParamRules, ...validators.cancelRules]), controller.cancel);

// Staff rescheduling with backend conflict detection.
router.patch('/:id/reschedule', requireAuth, requireStaff, validate([...validators.idParamRules, ...validators.rescheduleRules]), controller.reschedule);

// Doctor consultation workflow.
router.patch('/:id/start-consultation', requireAuth, requireDoctor, validate(idParam), controller.startConsultation);
router.patch('/:id/complete-consultation', requireAuth, requireDoctor, validate([...validators.idParamRules, ...validators.consultationRules]), controller.completeConsultation);

// Status / audit history.
router.get('/:id/history', requireAuth, validate(idParam), controller.history);

module.exports = router;