// routes/dashboard.js — summary stats for the dashboard view.
// Uses configurable per-device targets from settings (no hardcoded 10).
const express = require('express');
const { getAllItems, withCalc } = require('../services/inventoryService');
const { getSettings } = require('../services/settingsService');
const { sheets, SPREADSHEET_ID } = require('../sheets');

const router = express.Router();

function calcDeviceSummary(items, isTable, target) {
  let totalToOrder = 0;
  let itemsNeedingOrder = 0;
  let totalAvailability = 0;
  let possibleDevices = -1;
  let totalItemsCount = 0;

  for (const item of items) {
    const qty = isTable ? item.table_unit_qty : item.counter_unit_qty;
    if (qty > 0) {
      totalItemsCount++;
      const needed = target * qty;
      const toOrder = Math.max(0, needed - (item.availability || 0));
      if (toOrder > 0) {
        totalToOrder += toOrder;
        itemsNeedingOrder += 1;
      }
      totalAvailability += (item.availability || 0);
      const canBuild = Math.floor((item.availability || 0) / qty);
      if (possibleDevices === -1 || canBuild < possibleDevices) possibleDevices = canBuild;
    }
  }
  if (possibleDevices === -1) possibleDevices = 0;

  return {
    totalItems: totalItemsCount,
    totalToOrder: Math.round(totalToOrder),
    itemsNeedingOrder,
    totalAvailability: Math.round(totalAvailability),
    possibleDevices,
  };
}

function calcAllSummary(items, settings) {
  let totalAvailability = 0;
  let itemsNeedingOrder = 0;

  for (const item of items) {
    totalAvailability += (item.availability || 0);
    const tableNeeded = settings.table_unit_target * (item.table_unit_qty || 0);
    const counterNeeded = settings.counter_unit_target * (item.counter_unit_qty || 0);
    const maxNeeded = Math.max(tableNeeded, counterNeeded);
    if (maxNeeded > (item.availability || 0)) itemsNeedingOrder += 1;
  }

  return {
    totalItems: items.length,
    totalAvailability: Math.round(totalAvailability),
    itemsNeedingOrder,
    totalToOrder: 0,
    possibleDevices: 0,
  };
}

router.get('/summary', async (req, res) => {
  try {
    const [allItems, settings] = await Promise.all([getAllItems(), getSettings()]);

    let builtData = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'BuildLog!A2:E',
      });
      builtData = response.data.values || [];
    } catch (e) {
      console.error('Error fetching BuildLog for summary', e);
    }

    const builtMap = { table_unit: 0, counter_unit: 0 };
    builtData.forEach(row => {
      const cat = row[3];
      const count = parseInt(row[4], 10) || 0;
      if (cat) builtMap[cat] = (builtMap[cat] || 0) + count;
    });

    res.json({
      targets: {
        table_unit_target: settings.table_unit_target,
        counter_unit_target: settings.counter_unit_target,
      },
      all: {
        ...calcAllSummary(allItems, settings),
        builtDevices: (builtMap['table_unit'] || 0) + (builtMap['counter_unit'] || 0),
      },
      table_unit: {
        ...calcDeviceSummary(allItems, true, settings.table_unit_target),
        builtDevices: builtMap['table_unit'] || 0,
        target: settings.table_unit_target,
      },
      counter_unit: {
        ...calcDeviceSummary(allItems, false, settings.counter_unit_target),
        builtDevices: builtMap['counter_unit'] || 0,
        target: settings.counter_unit_target,
      },
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: 'Could not fetch dashboard summary.' });
  }
});

module.exports = router;
