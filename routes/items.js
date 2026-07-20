// routes/items.js — item CRUD + stock movements + per-item history.
// Availability changes are always logged to StockMovements for a full audit trail.
const express = require('express');
const crypto = require('node:crypto');
const { sheets, SPREADSHEET_ID } = require('../sheets');
const db = require('../db');
const {
  withCalc, rowToItem, itemToRow, getAllItems, SHEET_RANGE,
} = require('../services/inventoryService');
const { getSettings, updateSettings } = require('../services/settingsService');
const movements = require('../services/stockMovementService');

const router = express.Router();

const VALID_CATEGORIES = ['table_unit', 'counter_unit'];

const SUBCATEGORY_ORDER = [
  'major components',
  'battery pack',
  'electronics',
  'charger',
  'charging station',
  'enclosure',
  'miscellaneous',
  'packaging and logistics',
  'services outsourced'
];

function getSubRank(sub) {
  const index = SUBCATEGORY_ORDER.indexOf((sub || '').toLowerCase().trim());
  return index === -1 ? 999 : index;
}

function nowStr() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function userLabel(req) {
  return (req.user && (req.user.displayName || req.user.username || req.user.email)) || 'system';
}

// GET /api/items?search=
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    let list = items;

    if (search) {
      const lowerSearch = search.toLowerCase();
      list = list.filter(item =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.subcategory.toLowerCase().includes(lowerSearch) ||
        (item.supplier || '').toLowerCase().includes(lowerSearch) ||
        (item.stock_location || '').toLowerCase().includes(lowerSearch)
      );
    }

    list.sort((a, b) => {
      const rankA = getSubRank(a.subcategory);
      const rankB = getSubRank(b.subcategory);
      if (rankA !== rankB) return rankA - rankB;
      const subCompare = a.subcategory.localeCompare(b.subcategory, undefined, { sensitivity: 'base' });
      if (subCompare !== 0) return subCompare;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    res.json(list.map(i => withCalc(i, settings)));
  } catch (err) {
    console.error('Error fetching items from Google Sheets:', err);
    res.status(500).json({ error: 'Could not fetch items.' });
  }
});

// GET /api/items/:id/history — stock movement log for one item
router.get('/:id/history', async (req, res) => {
  try {
    const history = await movements.getMovements({ itemId: Number(req.params.id) });
    res.json(history);
  } catch (err) {
    console.error('Error fetching item history:', err);
    res.status(500).json({ error: 'Could not fetch item history.' });
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    const item = items.find(i => i.id === Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    res.json(withCalc(item, settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch item.' });
  }
});

// POST /api/items
router.post('/', async (req, res) => {
  const {
    name, description, subcategory, table_unit_qty, counter_unit_qty,
    availability, link, stock_location, supplier, pending_receive, unit,
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'Name is required.' });
  const sub = (subcategory || 'Uncategorized').trim();

  try {
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    const newId = items.length > 0 ? Math.max(0, ...items.map(i => Number(i.id) || 0)) + 1 : 1;
    const now = nowStr();
    const avail = Number(availability) || 0;

    const newItem = {
      id: newId,
      name: name.trim(),
      description: (description || '').trim(),
      subcategory: sub,
      availability: avail,
      table_unit_qty: Number(table_unit_qty) || 0,
      counter_unit_qty: Number(counter_unit_qty) || 0,
      link: (link || '').trim(),
      created_at: now,
      updated_at: now,
      restocked_date: '',
      stock_location: (stock_location || '').trim(),
      supplier: (supplier || '').trim(),
      pending_receive: Number(pending_receive) || 0,
      unit: (unit || '').trim(),
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'UnifiedInventory!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [itemToRow(newItem)] },
    });

    // Log opening balance
    if (avail > 0) {
      await movements.logMovement({
        item_id: newId, item_name: newItem.name, type: movements.TYPES.ITEM_CREATE,
        before: 0, after: avail, reason: 'Item created with opening stock', user: userLabel(req),
      });
    }

    res.status(201).json(withCalc(newItem, settings));
  } catch (err) {
    console.error('Error creating item in Google Sheets:', err);
    res.status(500).json({ error: 'Could not create the item.' });
  }
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    name, description, subcategory, table_unit_qty, counter_unit_qty,
    availability, link, stock_location, supplier, pending_receive,
    is_restock_action, movement_reason, unit,
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'Name is required.' });

  try {
    const [items, settings] = await Promise.all([getAllItems(), getSettings()]);
    const item = items.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    const sub = subcategory !== undefined ? subcategory.trim() : item.subcategory;
    const now = nowStr();
    const beforeAvail = item.availability;
    const newAvail = Number(availability);
    const finalAvail = Number.isFinite(newAvail) ? newAvail : beforeAvail;
    const finalPending = pending_receive !== undefined ? Number(pending_receive) : item.pending_receive;
    const restocked_date = is_restock_action ? now : item.restocked_date;

    const updated = {
      id,
      name: name.trim(),
      description: description !== undefined ? description.trim() : item.description,
      subcategory: sub,
      availability: finalAvail,
      table_unit_qty: Number(table_unit_qty) || 0,
      counter_unit_qty: Number(counter_unit_qty) || 0,
      link: (link || '').trim(),
      created_at: item.created_at,
      updated_at: now,
      restocked_date,
      stock_location: stock_location !== undefined ? stock_location.trim() : item.stock_location,
      supplier: supplier !== undefined ? supplier.trim() : item.supplier,
      pending_receive: finalPending,
      unit: unit !== undefined ? unit.trim() : item.unit,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `UnifiedInventory!A${item._rowIndex}:O${item._rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [itemToRow(updated)] },
    });

    // Log a movement only if availability actually changed.
    if (finalAvail !== beforeAvail) {
      const delta = finalAvail - beforeAvail;
      let type;
      let reason = movement_reason || '';
      if (is_restock_action) {
        type = movements.TYPES.STOCK_IN;
        reason = reason || 'Restock';
      } else if (delta > 0) {
        type = movements.TYPES.STOCK_IN;
        reason = reason || 'Manual adjustment (increase)';
      } else {
        type = movements.TYPES.STOCK_OUT;
        reason = reason || 'Manual adjustment (decrease)';
      }
      await movements.logMovement({
        item_id: id, item_name: updated.name, type,
        before: beforeAvail, after: finalAvail, reason, user: userLabel(req),
      });
    }

    res.json(withCalc(updated, settings));
  } catch (err) {
    console.error('Error updating item in Google Sheets:', err);
    res.status(500).json({ error: 'Could not update item.' });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const items = await getAllItems();
    const item = items.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['UnifiedInventory'],
    });
    const sheetId = sheetMeta.data.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: item._rowIndex - 1,
              endIndex: item._rowIndex,
            }
          }
        }]
      }
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting item from Google Sheets:', err);
    res.status(500).json({ error: 'Could not delete item.' });
  }
});

// POST /api/items/build-device
router.post('/build-device', async (req, res) => {
  const { category, count, selectedItemIds, buildName } = req.body || {};

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }
  const numDevices = Number(count);
  if (!numDevices || numDevices < 1 || !Number.isInteger(numDevices)) {
    return res.status(400).json({ error: 'Count must be a positive integer.' });
  }

  try {
    const allItems = await getAllItems();
    const isTable = category === 'table_unit';
    let categoryItems = allItems.filter(i => isTable ? (i.table_unit_qty > 0) : (i.counter_unit_qty > 0));

    if (Array.isArray(selectedItemIds)) {
      categoryItems = categoryItems.filter(i => selectedItemIds.includes(i.id));
    }
    if (categoryItems.length === 0) {
      return res.status(400).json({ error: 'No items required for this device.' });
    }

    const shortages = [];
    for (const item of categoryItems) {
      const needed = (isTable ? item.table_unit_qty : item.counter_unit_qty) * numDevices;
      if (needed > item.availability) {
        shortages.push({ name: item.name, available: item.availability, needed, short: needed - item.availability });
      }
    }
    if (shortages.length > 0) {
      const shortList = shortages.map(s => `${s.name} (need ${s.needed}, have ${s.available})`).join(', ');
      return res.status(400).json({ error: `Not enough stock for ${numDevices} device(s). Shortages: ${shortList}`, shortages });
    }

    const data = [];
    const movementEntries = [];
    const now = nowStr();
    for (const item of categoryItems) {
      const qty = isTable ? item.table_unit_qty : item.counter_unit_qty;
      const before = item.availability;
      const after = before - (qty * numDevices);
      const updated = { ...item, availability: after, updated_at: now };
      data.push({ range: `UnifiedInventory!A${item._rowIndex}:O${item._rowIndex}`, values: [itemToRow(updated)] });
      movementEntries.push({
        item_id: item.id, item_name: item.name, type: movements.TYPES.BUILD,
        before, after, reason: `Built ${numDevices} ${isTable ? 'Table' : 'Counter'} Unit(s)`, user: userLabel(req),
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    });

    const settings = await getSettings();
    if (isTable) {
      const newTarget = Math.max(0, settings.table_unit_target - numDevices);
      await updateSettings({ table_unit_target: newTarget });
    } else {
      const newTarget = Math.max(0, settings.counter_unit_target - numDevices);
      await updateSettings({ counter_unit_target: newTarget });
    }

    const buildId = crypto.randomUUID();
    const buildDate = new Date().toISOString();
    const finalBuildName = buildName ? buildName.trim() : (isTable ? 'Table Unit' : 'Counter Unit');
    const componentsUsed = categoryItems.map(item => ({
      id: item.id,
      qty_deducted: (isTable ? item.table_unit_qty : item.counter_unit_qty) * numDevices,
    }));

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'BuildLog!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[buildId, finalBuildName, buildDate, category, numDevices, JSON.stringify(componentsUsed)]] },
    });

    await movements.logMovements(movementEntries);

    res.json({ ok: true, devicesBuilt: numDevices, itemsUpdated: categoryItems.length });
  } catch (err) {
    console.error('Error building device:', err);
    res.status(500).json({ error: 'Could not process device build.' });
  }
});

// POST /api/items/undo-build-device
router.post('/undo-build-device', async (req, res) => {
  const { category, count, selectedItemIds } = req.body || {};

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }
  const numDevices = Number(count);
  if (!numDevices || numDevices < 1 || !Number.isInteger(numDevices)) {
    return res.status(400).json({ error: 'Count must be a positive integer.' });
  }

  try {
    const allItems = await getAllItems();
    const isTable = category === 'table_unit';
    let categoryItems = allItems.filter(i => isTable ? (i.table_unit_qty > 0) : (i.counter_unit_qty > 0));
    if (Array.isArray(selectedItemIds)) {
      categoryItems = categoryItems.filter(i => selectedItemIds.includes(i.id));
    }
    if (categoryItems.length === 0) {
      return res.status(400).json({ error: 'No items required for this device.' });
    }

    const data = [];
    const movementEntries = [];
    const now = nowStr();
    for (const item of categoryItems) {
      const qty = isTable ? item.table_unit_qty : item.counter_unit_qty;
      const before = item.availability;
      const after = before + (qty * numDevices);
      const updated = { ...item, availability: after, updated_at: now };
      data.push({ range: `UnifiedInventory!A${item._rowIndex}:O${item._rowIndex}`, values: [itemToRow(updated)] });
      movementEntries.push({
        item_id: item.id, item_name: item.name, type: movements.TYPES.BUILD_UNDO,
        before, after, reason: `Undo build of ${numDevices} ${isTable ? 'Table' : 'Counter'} Unit(s)`, user: userLabel(req),
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    });

    const settings = await getSettings();
    if (isTable) {
      const newTarget = settings.table_unit_target + numDevices;
      await updateSettings({ table_unit_target: newTarget });
    } else {
      const newTarget = settings.counter_unit_target + numDevices;
      await updateSettings({ counter_unit_target: newTarget });
    }

    await movements.logMovements(movementEntries);

    res.json({ ok: true, devicesUndone: numDevices, itemsUpdated: categoryItems.length });
  } catch (err) {
    console.error('Error undoing device build:', err);
    res.status(500).json({ error: 'Could not undo device build.' });
  }
});

module.exports = router;
module.exports.getAllItems = getAllItems;
