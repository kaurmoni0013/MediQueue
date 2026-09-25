const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';

// In production the reset link must point at the deployed site. Render
// auto-injects RENDER_EXTERNAL_URL, so we use that when CLIENT_ORIGIN is
// not explicitly configured (single-origin deploy — the API serves the SPA).
const defaultOrigin = process.env.CLIENT_ORIGIN
  || (env === 'production' ? process.env.RENDER_EXTERNAL_URL : '')
  || 'http://localhost:5173';

const config = {
  env,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue_app',
  jwtSecret: process.env.JWT_SECRET || 'mediqueue-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientOrigin: defaultOrigin,
  autoSeed: process.env.SEED_DEMO_DATA === 'true',
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
  },
};

// Never run a reachable deployment with the shipped default secret.
if (env === 'production' && config.jwtSecret === 'mediqueue-dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set to a strong, unique value when NODE_ENV=production');
}

module.exports = config;