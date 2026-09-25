const { body } = require('express-validator');

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[a-zA-Z]/)
  .withMessage('Password must contain at least one letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  passwordRule,
  body('phone').optional({ values: 'falsy' }).isLength({ max: 20 }).withMessage('Phone number is too long'),
];

const loginRules = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isString().withMessage('Password is required'),
];

const forgotPasswordRules = [body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail()];

const resetPasswordRules = [
  body('token').isString().isLength({ min: 16, max: 256 }).withMessage('Reset token is missing or malformed'),
  passwordRule,
];

module.exports = { registerRules, loginRules, forgotPasswordRules, resetPasswordRules };