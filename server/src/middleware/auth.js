const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

async function findUser(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) return null;
  return user;
}

/** Verifies the JWT and attaches the current user to req.user. */
async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new ApiError(401, 'Authentication required', ERROR_CODES.UNAUTHORIZED);
    }
    const user = await findUser(token);
    if (!user) {
      throw new ApiError(401, 'Session is invalid or expired', ERROR_CODES.UNAUTHORIZED);
    }
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Session is invalid or expired', ERROR_CODES.UNAUTHORIZED));
  }
}

/** Allowed roles guard — enforced on the server, never only in the UI. */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', ERROR_CODES.UNAUTHORIZED));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You are not authorized to perform this action', ERROR_CODES.FORBIDDEN));
    }
    next();
  };
}

const requirePatient = requireRole('PATIENT');
const requireStaff = requireRole('STAFF');
const requireDoctor = requireRole('DOCTOR');

// Explicitly scoped guard for patient-level routes.
const requirePatientOnly = requirePatient;

module.exports = { requireAuth, requireRole, requirePatient, requireStaff, requireDoctor, requirePatientOnly };