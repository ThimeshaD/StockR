const { google } = require('googleapis');
const path = require('node:path');

// Initialize Google Sheets API client
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1uGR4k6IQDNJsdT39YVAyyB8DW4ZR0JSXjU-T1awQILA';

module.exports = {
  sheets,
  SPREADSHEET_ID
};
