// services/stockMovementService.js — records a row every time an item's
// availability changes, so there's a full audit trail of *why* a number moved.
// Stored in a "StockMovements" sheet.
//
// Columns: A id | B item_id | C item_name | D type | E change | F before | G after
//          H reason | H+? user | J created_at
const crypto = require('node:crypto');
const { sheets, SPREADSHEET_ID } = require('../sheets');

const RANGE = 'StockMovements!A2:J';

// Movement types
const TYPES = {
  STOCK_IN: 'stock_in',       // restock / manual add
  STOCK_OUT: 'stock_out',     // manual removal / consumption
  SET_COUNT: 'set_count',     // manual recount (absolute)
  BUILD: 'build',             // deducted by building a device
  BUILD_UNDO: 'build_undo',   // restored by undoing/deleting a build
  ITEM_CREATE: 'item_create', // opening balance when item created
};

function nowStr() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToMovement(row, rowIndex) {
  return {
    _rowIndex: rowIndex,
    id: row[0] || '',
    item_id: Number(row[1]) || 0,
    item_name: row[2] || '',
    type: row[3] || '',
    change: Number(row[4]) || 0,
    before: Number(row[5]) || 0,
    after: Number(row[6]) || 0,
    reason: row[7] || '',
    user: row[8] || '',
    created_at: row[9] || '',
  };
}

async function logMovement({ item_id, item_name, type, before, after, reason, user }) {
  try {
    const change = Number(after) - Number(before);
    const row = [
      crypto.randomUUID(),
      item_id,
      item_name || '',
      type,
      change,
      Number(before) || 0,
      Number(after) || 0,
      reason || '',
      user || '',
      nowStr(),
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'StockMovements!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  } catch (err) {
    // Never let logging failure break the actual stock operation.
    console.error('Failed to log stock movement:', err.message);
  }
}

// Log several movements in one append call (used by build/undo).
async function logMovements(entries) {
  if (!entries || entries.length === 0) return;
  try {
    const values = entries.map(e => ([
      crypto.randomUUID(),
      e.item_id,
      e.item_name || '',
      e.type,
      Number(e.after) - Number(e.before),
      Number(e.before) || 0,
      Number(e.after) || 0,
      e.reason || '',
      e.user || '',
      nowStr(),
    ]));
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'StockMovements!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (err) {
    console.error('Failed to log stock movements:', err.message);
  }
}

async function getMovements({ itemId } = {}) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });
  const rows = res.data.values || [];
  let movements = rows.map((r, i) => rowToMovement(r, i + 2));
  if (itemId != null) {
    movements = movements.filter(m => m.item_id === Number(itemId));
  }
  // newest first
  movements.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return movements;
}

module.exports = {
  TYPES,
  logMovement,
  logMovements,
  getMovements,
};
