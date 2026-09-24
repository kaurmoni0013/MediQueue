const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

/** Runs express-validator rules and normalises failures into ApiError. */
function validate(rules) {
  return [
    ...rules,
    (req, _res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(
          new ApiError(
            400,
            errors.array()[0].msg,
            ERROR_CODES.VALIDATION_ERROR,
            errors.array().map((e) => ({ field: e.path, message: e.msg }))
          )
        );
      }
      next();
    },
  ];
}

module.exports = { validate };