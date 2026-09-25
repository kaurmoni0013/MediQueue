const config = require('../config/env');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends the password-reset email through the Brevo transactional email API.
 * When no API key is configured (local development / free demo), the reset
 * link is logged to the console instead so the flow is still usable.
 * Delivery failures are logged but never surfaced to the requesting client —
 * reporting success either way avoids leaking which email addresses hold
 * accounts.
 */
async function sendPasswordResetEmail({ email, resetUrl }) {
  if (!config.brevo.apiKey || !config.brevo.from) {
    console.log(`[mail] DEMO MODE — password reset for ${email}:`);
    console.log(`[mail] ${resetUrl}`);
    return;
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.brevo.apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'MediQueue', email: config.brevo.from },
        to: [{ email, name: email }],
        subject: 'Reset your MediQueue password',
        textContent:
          `A password reset was requested for your MediQueue account.\n\n` +
          `Open this link to choose a new password (valid for 30 minutes):\n${resetUrl}\n\n` +
          `If you did not request this, you can safely ignore this email.`,
        htmlContent:
          `<p>A password reset was requested for your MediQueue account.</p>` +
          `<p><a href="${resetUrl}">Choose a new password</a> (the link is valid for 30 minutes).</p>` +
          `<p style="color:#777">If you did not request this, you can safely ignore this email.</p>`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[mail] Brevo rejected the email (${res.status}): ${body}`);
      return;
    }
    console.log(`[mail] reset email accepted by Brevo for ${email}`);
  } catch (err) {
    console.error('[mail] failed to send password reset email:', err.message);
  }
}

module.exports = { sendPasswordResetEmail };