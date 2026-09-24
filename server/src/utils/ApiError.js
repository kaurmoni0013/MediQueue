/**
 * Standardised API error. `code` maps to a machine-readable error type
 * (see backend/utils/constants.js) so the frontend can show friendly text.
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

module.exports = ApiError;