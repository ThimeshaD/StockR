const { sheets, SPREADSHEET_ID } = require('../sheets');

async function setupSheet() {
  try {
    const headers = [
      'id',
      'name',
      'category',
      'qty_per_device',
      'availability',
      'devices',
      'link',
      'created_at',
      'updated_at'
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Availability!A1:I1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    console.log('Successfully set up headers in Google Sheet!');
  } catch (err) {
    console.error('Failed to setup sheet:', err.message);
  }
}

setupSheet();
