const { body, param, query } = require('express-validator');

const mongoId = (loc, name, msg) =>
  loc(name).isMongoId().withMessage(msg);

const hhmm = (value) => /^\d{2}:\d{2}$/.test(value) && value >= '00:00' && value <= '23:59';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const bookRules = [
  mongoId(body, 'doctorId', 'Select a valid doctor'),
  body('date').matches(DATE_RE).withMessage('Date must be in YYYY-MM-DD format'),
  body('startTime').custom(hhmm).withMessage('Start time must be HH:MM (24h)'),
  body('reason').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Reason is too long'),
];

const cancelRules = [
  body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Cancellation reason is required'),
];

const rescheduleRules = [
  body('date').matches(DATE_RE).withMessage('Date must be in YYYY-MM-DD format'),
  body('startTime').custom(hhmm).withMessage('Start time must be HH:MM (24h)'),
];

const statusRules = [
  body('newStatus').isIn(['WAITING', 'IN_CONSULT', 'COMPLETED']).withMessage('Invalid status value'),
];

const idParamRules = [param('id').isMongoId().withMessage('Invalid appointment id')];

const consultationRules = [
  body('notes').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  body('prescription').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  body('followUp').optional({ values: 'falsy' }).isString().isLength({ max: 1000 }),
];

const listRules = [
  query('date').optional().matches(DATE_RE).withMessage('Date must be in YYYY-MM-DD format'),
  query('status').optional().isIn(['SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED', 'CANCELLED']),
  query('doctorId').optional().isMongoId().withMessage('Invalid doctor id'),
];

module.exports = {
  bookRules,
  cancelRules,
  rescheduleRules,
  statusRules,
  consultationRules,
  idParamRules,
  listRules,
};