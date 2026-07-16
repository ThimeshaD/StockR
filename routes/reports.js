// routes/reports.js — CSV exports + emailed low-stock report.
const express = require('express');
const { getAllItems, withCalc } = require('../services/inventoryService');
const { getSettings } = require('../services/settingsService');
const movements = require('../services/stockMovementService');
const emailService = require('../services/emailService');

const router = express.Router();

function csvCell(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(headers, rows) {
  const head = headers.map(csvCell).join(',');
  const body = rows.map(r => r.map(csvCell).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

// GET /api/reports/inventory.csv — full inventory with calculated order figures
router.get('/inventory.csv', async (req, res) => {
  try {
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    const decorated = items.map(i => withCalc(i, settings));
    const headers = [
      'ID', 'Name', 'Description', 'Sub-category', 'Available',
      'Table Unit Qty', 'Counter Unit Qty', 'Max Table', 'Max Counter',
      'Total To Order', 'Stock Location', 'Supplier', 'Link',
      'Restocked Date', 'Created', 'Updated',
    ];
    const rows = decorated.map(i => [
      i.id, i.name, i.description, i.subcategory, i.availability,
      i.table_unit_qty, i.counter_unit_qty, i.max_table, i.max_counter,
      i.total_to_order, i.stock_location, i.supplier, i.link,
      i.restocked_date, i.created_at, i.updated_at,
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-${Date.now()}.csv"`);
    res.send(toCsv(headers, rows));
  } catch (err) {
    console.error('Error exporting inventory CSV:', err);
    res.status(500).json({ error: 'Could not export inventory.' });
  }
});

// GET /api/reports/order.csv — only items that need ordering
router.get('/order.csv', async (req, res) => {
  try {
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    const decorated = items.map(i => withCalc(i, settings)).filter(i => i.total_to_order > 0);
    const headers = ['ID', 'Name', 'Sub-category', 'Available', 'To Order', 'Supplier', 'Stock Location', 'Link'];
    const rows = decorated.map(i => [
      i.id, i.name, i.subcategory, i.availability, i.total_to_order, i.supplier, i.stock_location, i.link,
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="purchase-order-${Date.now()}.csv"`);
    res.send(toCsv(headers, rows));
  } catch (err) {
    console.error('Error exporting order CSV:', err);
    res.status(500).json({ error: 'Could not export order list.' });
  }
});

// GET /api/reports/movements.csv — full stock transaction history
router.get('/movements.csv', async (req, res) => {
  try {
    const history = await movements.getMovements();
    const headers = ['Date', 'Item ID', 'Item', 'Type', 'Change', 'Before', 'After', 'Reason', 'User'];
    const rows = history.map(m => [
      m.created_at, m.item_id, m.item_name, m.type, m.change, m.before, m.after, m.reason, m.user,
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stock-movements-${Date.now()}.csv"`);
    res.send(toCsv(headers, rows));
  } catch (err) {
    console.error('Error exporting movements CSV:', err);
    res.status(500).json({ error: 'Could not export movements.' });
  }
});

// POST /api/reports/send-low-stock — email reporters the current low-stock list
router.post('/send-low-stock', async (req, res) => {
  try {
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    const lowItems = items.map(i => withCalc(i, settings)).filter(i => i.total_to_order > 0);

    if (!settings.reporter_emails || settings.reporter_emails.length === 0) {
      return res.status(400).json({ error: 'No reporter emails set. Add them in Settings first.' });
    }
    if (lowItems.length === 0) {
      return res.status(400).json({ error: 'Nothing is low on stock right now.' });
    }

    await emailService.sendLowStockReport(settings.reporter_emails, lowItems);
    res.json({
      ok: true,
      recipients: settings.reporter_emails,
      count: lowItems.length,
      email_configured: emailService.isConfigured(),
    });
  } catch (err) {
    console.error('Error sending low-stock report:', err);
    res.status(500).json({ error: err.message || 'Could not send low-stock report.' });
  }
});

module.exports = router;
