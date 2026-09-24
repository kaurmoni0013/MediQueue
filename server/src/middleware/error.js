const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

/** Centralised 404 / error handler. Returns consistent-shaped errors. */
function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, ERROR_CODES.NOT_FOUND));
}

function errorHandler(err, _req, res, _next) {
  let error = err;

  if (error instanceof mongoose.Error.CastError) {
    error = new ApiError(400, 'Invalid identifier', ERROR_CODES.VALIDATION_ERROR);
  }
  if (error.name === 'ValidationError') {
    error = new ApiError(400, Object.values(error.errors)[0].message, ERROR_CODES.VALIDATION_ERROR);
  }
  if (error.code === 11000) {
    error = new ApiError(409, 'A record with that value already exists', ERROR_CODES.EMAIL_IN_USE);
  }
  if (!(error instanceof ApiError)) {
    console.error('[raw error]', error && error.stack ? error.stack : error);
    error = new ApiError(500, 'Internal server error', 'INTERNAL_ERROR');
  }
  if (error.statusCode >= 500) console.error('[error]', error);

  const body = {
    success: false,
    message: error.message,
    code: error.code || 'INTERNAL_ERROR',
  };
  if (error.details) body.details = error.details;
  res.status(error.statusCode).json(body);
}

module.exports = { notFound, errorHandler };