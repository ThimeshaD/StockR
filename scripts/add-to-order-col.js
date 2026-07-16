const { sheets, SPREADSHEET_ID } = require('../sheets');

async function addToOrderColumn() {
  try {
    console.log('Fetching sheet info...');
    // 1. Get the sheet ID for 'Availability'
    const res = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheet = res.data.sheets.find(s => s.properties.title === 'Availability');
    if (!sheet) throw new Error("Availability sheet not found");
    const sheetId = sheet.properties.sheetId;

    console.log('Inserting new column at index 7 (Column H)...');
    // 2. Insert a new column at index 7 (after devices which is at index 6)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 7,
                endIndex: 8
              },
              inheritFromBefore: true
            }
          }
        ]
      }
    });

    console.log('Fetching all data to populate formulas...');
    // 3. Fetch all rows to know how many there are
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Availability!A1:A',
    });
    const rowCount = dataRes.data.values.length;

    // 4. Prepare updates for the new column H (index 7)
    const newColValues = [['To order']]; // Header
    for (let i = 2; i <= rowCount; i++) {
      // Formula: =10*E2-F2 (Qty is E, Avail is F)
      newColValues.push([`=10*E${i}-F${i}`]);
    }

    console.log(`Writing formulas to Availability!H1:H${rowCount}...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Availability!H1:H${rowCount}`,
      valueInputOption: 'USER_ENTERED', // Evaluates formulas
      requestBody: {
        values: newColValues
      }
    });

    console.log('Successfully added "To order" column with formulas!');
  } catch (e) {
    console.error(e);
  }
}
addToOrderColumn();
