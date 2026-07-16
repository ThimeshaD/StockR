const { sheets, SPREADSHEET_ID } = require('../sheets');

async function removeColumnH() {
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = res.data.sheets.find(s => s.properties.title === 'Availability').properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 7, // Column H
                endIndex: 8
              }
            }
          }
        ]
      }
    });
    console.log("Successfully removed the extra column H.");
  } catch (e) {
    console.error(e);
  }
}
removeColumnH();
