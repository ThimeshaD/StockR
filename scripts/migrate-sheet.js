const { sheets, SPREADSHEET_ID } = require('../sheets');

async function migrateSheet() {
  try {
    console.log('Fetching existing data...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Availability!A1:Z100',
    });
    
    const rows = response.data.values || [];
    if (rows.length < 2) {
      console.log('No data found to migrate.');
      return;
    }

    const items = [];
    let nextId = 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let currentLeftSubcategory = 'Uncategorized';
    let currentRightSubcategory = 'Uncategorized';

    // Skip row 0 (headers). Process row 1 onwards.
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Update current subcategories if present
      if (row[0] && row[0].trim()) {
        currentLeftSubcategory = row[0].trim();
      }
      if (row[8] && row[8].trim()) {
        currentRightSubcategory = row[8].trim();
      }

      // Left Table (Table Unit)
      // B(1): Name, C(2): Qty, D(3): Avail, E(4): Devices, G(6): Link
      const leftName = row[1] ? row[1].trim() : '';
      if (leftName) {
        items.push([
          nextId++,
          leftName,
          'table_unit',
          currentLeftSubcategory,
          Number(row[2]) || 0,
          Number(row[3]) || 0,
          Number(row[4]) || 0,
          row[6] ? row[6].trim() : '',
          now,
          now
        ]);
      }

      // Right Table (Counter Unit)
      // J(9): Name, K(10): Qty, L(11): Avail, M(12): Devices, O(14): Link
      const rightName = row[9] ? row[9].trim() : '';
      if (rightName) {
        items.push([
          nextId++,
          rightName,
          'counter_unit',
          currentRightSubcategory,
          Number(row[10]) || 0,
          Number(row[11]) || 0,
          Number(row[12]) || 0,
          row[14] ? row[14].trim() : '',
          now,
          now
        ]);
      }
    }

    console.log(`Extracted ${items.length} items. Flattening sheet...`);

    // Clear the entire sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Availability!A:Z',
    });

    // Write new headers
    const headers = [
      'id', 'name', 'category', 'subcategory', 'qty_per_device', 'availability', 'devices', 'link', 'created_at', 'updated_at'
    ];

    const newValues = [headers, ...items];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Availability!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newValues,
      },
    });

    console.log('Migration complete! Subcategories preserved.');

  } catch (err) {
    console.error('Failed to migrate sheet:', err.message);
  }
}

migrateSheet();
