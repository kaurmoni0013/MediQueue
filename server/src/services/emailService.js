const nodemailer = require('nodemailer');
const config = require('../config/env');

const { smtp } = config;

function getTransporter() {
  if (!smtp.host) return null;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

/**
 * Sends the password-reset email. When no SMTP provider is configured (local
 * development / free demo), the reset link is logged to the console instead so
 * the flow is still usable. Delivery failures are logged but never surfaced to
 * the requesting client — reporting success either way avoids leaking which
 * email addresses hold accounts.
 */
async function sendPasswordResetEmail({ email, resetUrl }) {
  if (!smtp.host) {
    console.log(`[mail] DEMO MODE — password reset for ${email}:`);
    console.log(`[mail] ${resetUrl}`);
    return;
  }

  try {
    const transporter = getTransporter();
    const from = smtp.from || smtp.user;
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your MediQueue password',
      text:
        `A password reset was requested for your MediQueue account.\n\n` +
        `Open this link to choose a new password (valid for 30 minutes):\n${resetUrl}\n\n` +
        `If you did not request this, you can safely ignore this email.`,
      html:
        `<p>A password reset was requested for your MediQueue account.</p>` +
        `<p><a href="${resetUrl}">Choose a new password</a> (the link is valid for 30 minutes).</p>` +
        `<p style="color:#777">If you did not request this, you can safely ignore this email.</p>`,
    });
  } catch (err) {
    console.error('[mail] failed to send password reset email:', err.message);
  }
}

module.exports = { sendPasswordResetEmail };