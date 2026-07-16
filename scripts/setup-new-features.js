// scripts/setup-new-features.js
// Adds the sheets and columns needed by the new features:
//   - UnifiedInventory columns L (stock_location) + M (supplier) headers
//   - "Settings" sheet (key/value)
//   - "StockMovements" sheet (audit log)
// Safe to run multiple times.
const { sheets, SPREADSHEET_ID } = require('../sheets');

async function ensureSheet(title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    console.log(`Created sheet: ${title}`);
  } else {
    console.log(`Sheet already exists: ${title}`);
  }
}

async function run() {
  try {
    // 1. Inventory header row for L + M
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'UnifiedInventory!L1:M1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['stock_location', 'supplier']] },
    });
    console.log('Set UnifiedInventory L1:M1 headers (stock_location, supplier).');

    // 2. Settings sheet
    await ensureSheet('Settings');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Settings!A1:B1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['key', 'value']] },
    });
    // Seed defaults only if empty
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Settings!A2:B',
    });
    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Settings!A2:B4',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['table_unit_target', '10'],
            ['counter_unit_target', '10'],
            ['reporter_emails', ''],
          ],
        },
      });
      console.log('Seeded default Settings.');
    }

    // 3. StockMovements sheet
    await ensureSheet('StockMovements');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'StockMovements!A1:J1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'id', 'item_id', 'item_name', 'type', 'change',
          'before', 'after', 'reason', 'user', 'created_at',
        ]],
      },
    });
    console.log('Set StockMovements headers.');

    console.log('\nAll new-feature sheets/columns are ready.');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  }
}

run();
