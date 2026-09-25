const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const staffRoutes = require('./routes/staffRoutes');
const doctorWorkspaceRoutes = require('./routes/doctorWorkspaceRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (config.env !== 'test') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, service: 'mediqueue-api', time: new Date().toISOString() }));

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/doctor', doctorWorkspaceRoutes);
app.use('/api/admin', adminRoutes);

// In production, serve the built React client and route non-API GETs to it
// (SPA fallback). Keeps the whole app on a single origin, so the client's
// default relative "/api" base URL works without extra configuration.
if (config.env === 'production') {
  const dist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    console.warn('[api] client build not found — serving API only (production)');
  }
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;