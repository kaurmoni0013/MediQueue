const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue_app',
  jwtSecret: process.env.JWT_SECRET || 'mediqueue-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

// Never run a reachable deployment with the shipped default secret.
if (env === 'production' && config.jwtSecret === 'mediqueue-dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set to a strong, unique value when NODE_ENV=production');
}

module.exports = config;