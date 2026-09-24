const router = require('express').Router();
const controller = require('../controllers/doctorController');
const { requireAuth } = require('../middleware/auth');
const { query } = require('express-validator');
const { validate } = require('../middleware/validate');

router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.detail);

const availabilityRules = [
  query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
];
router.get('/:id/availability', requireAuth, validate(availabilityRules), controller.availability);

module.exports = router;