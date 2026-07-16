// services/emailService.js — sends mail via Gmail SMTP (app password).
// Configure with SMTP_USER + SMTP_PASS (a Google App Password) in .env.
const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

let transporter = null;

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null; // not configured
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function isConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    // Dev fallback: log to console instead of failing hard.
    console.log('----------------------------------------------------');
    console.log('[email not configured] would have sent:');
    console.log('  to:', to);
    console.log('  subject:', subject);
    console.log('  text:', text || html);
    console.log('----------------------------------------------------');
    return { skipped: true };
  }
  return t.sendMail({ from: SMTP_FROM, to, subject, html, text });
}

async function sendMagicLink(email, token) {
  const link = `${APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const subject = 'Your Stockroom sign-in link';
  const text =
    `Sign in to Stockroom by opening this link:\n\n${link}\n\n` +
    `This link expires in 15 minutes. If you didn't request it, ignore this email.`;
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#14181D;margin:0 0 8px">Sign in to Stockroom</h2>
      <p style="color:#5C6370;font-size:14px;line-height:1.5">
        Click the button below to sign in. This link expires in 15 minutes.
      </p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#2F7D5A;color:#fff;text-decoration:none;
           padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block">
          Sign in
        </a>
      </p>
      <p style="color:#8A909B;font-size:12px;word-break:break-all">
        Or paste this URL into your browser:<br>${link}
      </p>
      <p style="color:#8A909B;font-size:12px">If you didn't request this, you can ignore this email.</p>
    </div>`;
  return sendMail({ to: email, subject, html, text });
}

async function sendLowStockReport(recipients, lowItems) {
  if (!recipients || recipients.length === 0) {
    throw new Error('No reporter emails configured.');
  }
  const subject = `Stockroom low-stock alert — ${lowItems.length} item(s) need ordering`;
  const rowsHtml = lowItems.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#5C6370">${escapeHtml(i.subcategory || '')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${i.availability}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#C97A0C;font-weight:700">${i.total_to_order}</td>
    </tr>`).join('');

  const text = lowItems.map(i =>
    `${i.name} (${i.subcategory || '-'}) — have ${i.availability}, order ${i.total_to_order}`
  ).join('\n');

  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <h2 style="color:#14181D;margin:0 0 4px">Low-stock report</h2>
      <p style="color:#5C6370;font-size:14px">${lowItems.length} item(s) at or below their order target.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
        <thead>
          <tr style="text-align:left;color:#8A909B;font-size:11px;text-transform:uppercase;letter-spacing:.05em">
            <th style="padding:8px 12px">Item</th>
            <th style="padding:8px 12px">Sub-category</th>
            <th style="padding:8px 12px;text-align:right">Available</th>
            <th style="padding:8px 12px;text-align:right">To order</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;

  return sendMail({ to: recipients.join(','), subject, html, text });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = {
  isConfigured,
  sendMail,
  sendMagicLink,
  sendLowStockReport,
  APP_URL,
};
