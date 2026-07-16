// config.js — loads environment variables and ensures a stable JWT secret
// exists across restarts (auto-generated into .env on first run if missing).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ENV_PATH = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_PATH });

if (!process.env.JWT_SECRET) {
  const generated = crypto.randomBytes(48).toString('hex');
  const line = `JWT_SECRET=${generated}\n`;
  fs.appendFileSync(ENV_PATH, line, { flag: 'a' });
  process.env.JWT_SECRET = generated;
  console.log('Generated a new JWT_SECRET and saved it to .env');
}

module.exports = {
  PORT: process.env.PORT || 5174,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  GOOGLE_SHEET_WEBAPP_URL: process.env.GOOGLE_SHEET_WEBAPP_URL,
};
