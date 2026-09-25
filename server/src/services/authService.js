const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/env');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('../utils/constants');
const { sendPasswordResetEmail } = require('./emailService');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, ver: user.tokenVersion || 0 }, config.jwtSecret, {
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
  // Treat legacy or malformed records like any other invalid credential.
  // Calling bcrypt with a missing hash otherwise leaks an internal 500.
  if (!user || !user.passwordHash || !(await user.comparePassword(password))) {
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

/**
 * Revokes every token issued to a user by bumping the token version.
 * All previously issued JWTs fail the version check and become invalid —
 * this is the server-side guarantee that "sign out" actually signs out.
 */
async function logout(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  return { success: true };
}

/**
 * Issues a one-time reset token for an account and emails a signed link.
 * Always reports success — even for unknown email addresses — so callers
 * cannot probe which emails have accounts.
 */
async function requestPasswordReset({ email, req }) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized });
  if (user && user.isActive) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashResetToken(token),
          passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }
    );
    // Build the reset link from the request the user actually came in on, so
    // it always matches the serving instance — even if CLIENT_ORIGIN holds a
    // stale value (e.g. an old duplicate service URL). Falls back to the
    // configured origin only when neither protocol nor host are available.
    let origin = config.clientOrigin.split(',')[0].trim();
    if (req) {
      const proto =
        req.protocol === 'https' || req.get('x-forwarded-proto') === 'https'
          ? 'https'
          : 'http';
      const host = req.get('host');
      if (proto && host) origin = `${proto}://${host}`;
    }
    const resetUrl = `${origin}/reset-password?token=${token}`;
    await sendPasswordResetEmail({ email: normalized, resetUrl });
  }
  return { success: true };
}

/**
 * Applies the new password for a valid, unexpired reset token and signs the
 * user out of any existing sessions.
 */
async function resetPassword({ token, password }) {
  const hashed = hashResetToken(String(token || ''));
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');
  if (!user) {
    throw new ApiError(400, 'This reset link is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  user.passwordHash = passwordHash;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // revoke all prior sessions
  await user.save();

  return { success: true };
}

module.exports = { register, login, getMe, logout, requestPasswordReset, resetPassword };