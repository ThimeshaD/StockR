// services/settingsService.js — configurable app settings stored in a
// "Settings" sheet as simple key/value rows. Covers order targets and the
// list of reporter emails for low-stock notifications.
const { sheets, SPREADSHEET_ID } = require('../sheets');

const SETTINGS_RANGE = 'Settings!A2:B';

// Defaults used if the Settings sheet is empty / missing a key.
const DEFAULTS = {
  table_unit_target: 10,
  counter_unit_target: 10,
  reporter_emails: [], // list of local-parts or full @attune-integrations.com emails
};

const ALLOWED_DOMAIN = 'attune-integrations.com';

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 15 * 1000; // 15s — keeps dashboard snappy without hammering the API

function normaliseEmail(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return null;
  if (v.includes('@')) {
    return v.endsWith('@' + ALLOWED_DOMAIN) ? v : null;
  }
  // bare local-part → append the company domain
  return `${v}@${ALLOWED_DOMAIN}`;
}

async function readRaw() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SETTINGS_RANGE,
  });
  const rows = res.data.values || [];
  const map = {};
  for (const [key, value] of rows) {
    if (key) map[key.trim()] = value != null ? String(value) : '';
  }
  return map;
}

async function getSettings(force = false) {
  if (!force && cache && Date.now() - cacheTime < CACHE_TTL) {
    return cache;
  }
  let map = {};
  try {
    map = await readRaw();
  } catch (err) {
    console.error('Could not read Settings sheet, using defaults:', err.message);
  }

  const settings = {
    table_unit_target: map.table_unit_target !== undefined && map.table_unit_target !== '' && Number(map.table_unit_target) >= 0
      ? Number(map.table_unit_target)
      : DEFAULTS.table_unit_target,
    counter_unit_target: map.counter_unit_target !== undefined && map.counter_unit_target !== '' && Number(map.counter_unit_target) >= 0
      ? Number(map.counter_unit_target)
      : DEFAULTS.counter_unit_target,
    reporter_emails: (map.reporter_emails || '')
      .split(',')
      .map(normaliseEmail)
      .filter(Boolean),
  };

  cache = settings;
  cacheTime = Date.now();
  return settings;
}

async function writeKey(key, value) {
  // Read existing rows to find the key's row, else append.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SETTINGS_RANGE,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => (r[0] || '').trim() === key);

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Settings!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[key, value]] },
    });
  } else {
    const rowNumber = idx + 2; // data starts at row 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Settings!A${rowNumber}:B${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[key, value]] },
    });
  }
}

async function updateSettings(patch) {
  const writes = [];
  if (patch.table_unit_target !== undefined) {
    const n = Number(patch.table_unit_target);
    if (!Number.isFinite(n) || n < 0) throw new Error('Table Unit target must be zero or a positive number.');
    writes.push(writeKey('table_unit_target', String(n)));
  }
  if (patch.counter_unit_target !== undefined) {
    const n = Number(patch.counter_unit_target);
    if (!Number.isFinite(n) || n < 0) throw new Error('Counter Unit target must be zero or a positive number.');
    writes.push(writeKey('counter_unit_target', String(n)));
  }
  if (patch.reporter_emails !== undefined) {
    const list = Array.isArray(patch.reporter_emails)
      ? patch.reporter_emails
      : String(patch.reporter_emails).split(',');
    const cleaned = [...new Set(list.map(normaliseEmail).filter(Boolean))];
    writes.push(writeKey('reporter_emails', cleaned.join(',')));
  }
  await Promise.all(writes);
  cache = null; // bust cache
  return getSettings(true);
}

module.exports = {
  getSettings,
  updateSettings,
  normaliseEmail,
  ALLOWED_DOMAIN,
  DEFAULTS,
};
