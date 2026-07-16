const { google } = require('googleapis');
const path = require('node:path');
const { sheets, SPREADSHEET_ID } = require('./sheets');

async function migrate() {
  try {
    console.log('Fetching data from old tabs...');
    
    // Fetch data from old tabs
    const tableRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Table Unit'!A2:H",
    });
    const counterRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Counter Unit'!A2:H",
    });

    const tableRows = tableRes.data.values || [];
    const counterRows = counterRes.data.values || [];

    // Consolidation map: item name (lowercase) -> merged item
    const merged = new Map();
    let nextId = 1;

    function processRow(row, isTable) {
      if (!row || !row[1]) return; // Skip empty rows
      
      const name = row[1].trim();
      const lowerName = name.toLowerCase();
      
      if (!merged.has(lowerName)) {
        merged.set(lowerName, {
          id: nextId++,
          name: name,
          subcategory: row[2] || 'Uncategorized',
          availability: Number(row[4]) || 0,
          table_unit_qty: 0,
          counter_unit_qty: 0,
          link: row[5] || '',
          created_at: row[6] || new Date().toISOString(),
          updated_at: row[7] || new Date().toISOString()
        });
      }

      const item = merged.get(lowerName);
      const qty = Number(row[3]) || 0;
      
      if (isTable) {
        item.table_unit_qty = qty;
      } else {
        item.counter_unit_qty = qty;
      }
      
      // Keep the highest availability if there's a mismatch between tabs
      const avail = Number(row[4]) || 0;
      if (avail > item.availability) {
        item.availability = avail;
      }
    }

    tableRows.forEach(row => processRow(row, true));
    counterRows.forEach(row => processRow(row, false));

    console.log(`Consolidated into ${merged.size} unique items.`);

    // Check if UnifiedInventory exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    let unifiedSheetId = null;
    
    for (const sheet of spreadsheet.data.sheets) {
      if (sheet.properties.title === 'UnifiedInventory') {
        unifiedSheetId = sheet.properties.sheetId;
        break;
      }
    }

    // Create UnifiedInventory if it doesn't exist
    if (unifiedSheetId === null) {
      console.log('Creating UnifiedInventory tab...');
      const addSheetRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'UnifiedInventory',
                  gridProperties: { columnCount: 9 }
                }
              }
            }
          ]
        }
      });
      unifiedSheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;
    } else {
      console.log('Clearing existing UnifiedInventory tab...');
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: 'UnifiedInventory',
      });
    }

    // Format headers and freeze top row
    console.log('Applying formatting and formulas...');
    
    const headers = [
      'ID', 'Name', 'Subcategory', 'Availability', 
      'Table Unit Qty', 'Counter Unit Qty', 'Link', 'Created At', 'Updated At'
    ];

    const rowsData = [headers];
    
    Array.from(merged.values()).forEach((item, index) => {
      const rowNum = index + 2;

      rowsData.push([
        item.id,
        item.name,
        item.subcategory,
        item.availability,
        item.table_unit_qty,
        item.counter_unit_qty,
        item.link,
        item.created_at,
        item.updated_at
      ]);
    });

    // Write all data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'UnifiedInventory!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rowsData,
      },
    });

    // Format header row bold and freeze it
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: unifiedSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId: unifiedSheetId,
                gridProperties: { frozenRowCount: 1 }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: unifiedSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 9
              }
            }
          }
        ]
      }
    });

    console.log('Migration complete! The UnifiedInventory tab is fully populated and formatted.');
    
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
