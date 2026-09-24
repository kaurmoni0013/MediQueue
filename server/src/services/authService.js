const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function register({ name, email, password, phone }) {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists', ERROR_CODES.EMAIL_IN_USE);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, phone: phone || '', role: 'PATIENT' });

  const token = signToken(user);
  return { token, user: user.toSafeJSON() };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated', ERROR_CODES.FORBIDDEN);
  }
  const token = signToken(user);
  return { token, user: user.toSafeJSON() };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'Session is invalid or expired', ERROR_CODES.UNAUTHORIZED);
  const safe = user.toSafeJSON();
  if (user.role === 'DOCTOR') {
    const profile = await DoctorProfile.findOne({ user: user._id }).lean();
    if (profile) {
      safe.doctorProfileId = String(profile._id);
      safe.specialization = profile.specialization;
    }
  }
  return safe;
}

module.exports = { register, login, getMe };