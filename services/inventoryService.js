const { sheets, SPREADSHEET_ID } = require('../sheets');
const { getSettings } = require('./settingsService');

// Sheet columns:
// A id | B name | C description | D subcategory | E availability
// F table_unit_qty | G counter_unit_qty | H link | I created_at
// J updated_at | K restocked_date | L stock_location | M supplier | N pending_receive
const SHEET_RANGE = 'UnifiedInventory!A2:N'; // A..N = 14 columns

// withCalc now takes the configurable targets. Falls back to 10/10 if omitted.
function withCalc(item, targets = { table_unit_target: 10, counter_unit_target: 10 }) {
  const tTarget = Number(targets.table_unit_target) || 10;
  const cTarget = Number(targets.counter_unit_target) || 10;

  const table_needed = tTarget * (item.table_unit_qty || 0);
  const table_to_order = Math.max(0, table_needed - (item.availability || 0));
  const max_table = item.table_unit_qty ? Math.floor((item.availability || 0) / item.table_unit_qty) : 0;

  const counter_needed = cTarget * (item.counter_unit_qty || 0);
  const counter_to_order = Math.max(0, counter_needed - (item.availability || 0));
  const max_counter = item.counter_unit_qty ? Math.floor((item.availability || 0) / item.counter_unit_qty) : 0;

  // Total to order = the combined shortfall for building BOTH targets simultaneously.
  const total_needed = table_needed + counter_needed;
  const total_to_order = Math.max(0, total_needed - (item.availability || 0));

  return { ...item, table_to_order, counter_to_order, max_table, max_counter, total_to_order };
}

function rowToItem(row, rowIndex) {
  return {
    id: Number(row[0]),
    name: row[1] || '',
    description: row[2] || '',
    subcategory: row[3] || 'Uncategorized',
    availability: Number(row[4]) || 0,
    table_unit_qty: Number(row[5]) || 0,
    counter_unit_qty: Number(row[6]) || 0,
    link: row[7] || '',
    created_at: row[8] || '',
    updated_at: row[9] || '',
    restocked_date: row[10] || '',
    stock_location: row[11] || '',
    supplier: row[12] || '',
    pending_receive: Number(row[13]) || 0,
    _rowIndex: rowIndex,
  };
}

// Build the 13-column row array for writing back to the sheet.
function itemToRow(item) {
  return [
    item.id,
    item.name,
    item.description,
    item.subcategory,
    item.availability,
    item.table_unit_qty,
    item.counter_unit_qty,
    item.link,
    item.created_at,
    item.updated_at,
    item.restocked_date || '',
    item.stock_location || '',
    item.supplier || '',
    item.pending_receive || 0,
  ];
}

async function getAllItems() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_RANGE,
  });
  const rows = response.data.values || [];
  return rows.map((row, index) => rowToItem(row, index + 2));
}

// Convenience: fetch items already decorated with calc using live targets.
async function getAllItemsWithCalc() {
  const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
  return items.map(i => withCalc(i, settings));
}

module.exports = {
  withCalc,
  rowToItem,
  itemToRow,
  getAllItems,
  getAllItemsWithCalc,
  SHEET_RANGE,
};
