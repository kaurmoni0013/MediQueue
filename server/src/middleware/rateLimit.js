const rateLimit = require('express-rate-limit');

/** Generous global guard so individual endpoints stay reliable. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
});

/** Tight window on credential endpoints to block brute-force login. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again in 15 minutes.' },
});

module.exports = { apiLimiter, authLimiter };