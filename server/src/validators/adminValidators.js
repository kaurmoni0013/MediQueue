const { body } = require('express-validator');

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[a-zA-Z]/)
  .withMessage('Password must contain at least one letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

const doctorRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  passwordRule,
  body('phone').optional({ values: 'falsy' }).isLength({ max: 20 }).withMessage('Phone number is too long'),
  body('specialization').trim().isLength({ min: 2, max: 100 }).withMessage('Specialization is required'),
  body('experienceYears').optional().isInt({ min: 0, max: 60 }).withMessage('Invalid experience'),
  body('consultationDuration').optional().isInt({ min: 5, max: 240 }).withMessage('Consultation duration must be 5–240 minutes'),
  body('fees').optional().isInt({ min: 0 }).withMessage('Invalid fee'),
  body('bio').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Bio is too long'),
  body('qualification').optional({ values: 'falsy' }).isLength({ max: 200 }).withMessage('Qualification is too long'),
  body('availability').optional().isArray().withMessage('Availability must be an array'),
];

const doctorUpdateRules = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).isLength({ max: 20 }).withMessage('Phone number is too long'),
  body('specialization').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Specialization is required'),
  body('experienceYears').optional().isInt({ min: 0, max: 60 }).withMessage('Invalid experience'),
  body('consultationDuration').optional().isInt({ min: 5, max: 240 }).withMessage('Consultation duration must be 5–240 minutes'),
  body('fees').optional().isInt({ min: 0 }).withMessage('Invalid fee'),
  body('bio').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Bio is too long'),
  body('qualification').optional({ values: 'falsy' }).isLength({ max: 200 }).withMessage('Qualification is too long'),
  body('availability').optional().isArray().withMessage('Availability must be an array'),
];

const staffRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  passwordRule,
  body('phone').optional({ values: 'falsy' }).isLength({ max: 20 }).withMessage('Phone number is too long'),
];

const staffUpdateRules = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).isLength({ max: 20 }).withMessage('Phone number is too long'),
];

module.exports = { doctorRules, doctorUpdateRules, staffRules, staffUpdateRules };