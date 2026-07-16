const express = require('express');
const { sheets, SPREADSHEET_ID } = require('../sheets');
const { getAllItems, itemToRow } = require('../services/inventoryService');
const { getSettings, updateSettings } = require('../services/settingsService');
const movements = require('../services/stockMovementService');

const router = express.Router();

// Helper to get build logs
async function getBuildLogs() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'BuildLog!A2:F',
  });
  
  const rows = response.data.values || [];
  return rows.map((row, index) => {
    let components = [];
    try {
      components = JSON.parse(row[5] || '[]');
    } catch (e) {
      console.error('Error parsing components for build', row[0]);
    }
    return {
      _rowIndex: index + 2,
      id: row[0] || '',
      name: row[1] || '',
      date: row[2] || '',
      category: row[3] || '',
      count: parseInt(row[4], 10) || 0,
      components: components
    };
  });
}

// GET /api/builds
router.get('/', async (req, res) => {
  try {
    const builds = await getBuildLogs();
    // Sort by date descending (assuming dates are ISO strings)
    builds.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(builds);
  } catch (err) {
    console.error('Error fetching build logs:', err);
    res.status(500).json({ error: 'Could not fetch build logs.' });
  }
});

// DELETE /api/builds/:id
router.delete('/:id', async (req, res) => {
  try {
    const buildId = req.params.id;
    const builds = await getBuildLogs();
    const build = builds.find(b => b.id === buildId);
    
    if (!build) {
      return res.status(404).json({ error: 'Build not found.' });
    }

    // 1. Restock components
    if (build.components && build.components.length > 0) {
      const allItems = await getAllItems();
      const itemsToUpdate = [];
      const movementEntries = [];
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      for (const comp of build.components) {
        const item = allItems.find(i => i.id === comp.id);
        if (item) {
          const before = item.availability;
          item.availability += comp.qty_deducted;
          item.updated_at = now;
          itemsToUpdate.push(item);
          movementEntries.push({
            item_id: item.id, item_name: item.name, type: movements.TYPES.BUILD_UNDO,
            before, after: item.availability,
            reason: `Build "${build.name}" deleted — components restocked`, user: 'system',
          });
        }
      }

      if (itemsToUpdate.length > 0) {
        const data = itemsToUpdate.map(item => ({
          range: `UnifiedInventory!A${item._rowIndex}:M${item._rowIndex}`,
          values: [itemToRow(item)],
        }));

        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { valueInputOption: 'USER_ENTERED', data },
        });

        await movements.logMovements(movementEntries);
      }
    }

    // 2. Delete the row from BuildLog
    // We need the sheetId for BuildLog to use deleteDimension
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const buildLogSheet = sheetMeta.data.sheets.find(s => s.properties.title === 'BuildLog');
    
    if (buildLogSheet) {
      const sheetId = buildLogSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: build._rowIndex - 1,
                  endIndex: build._rowIndex
                }
              }
            }
          ]
        }
      });
    } else {
      // Fallback: clear the row if we can't find sheetId (unlikely)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `BuildLog!A${build._rowIndex}:F${build._rowIndex}`
      });
    }

    // 3. Restore Target
    const settings = await getSettings();
    const isTable = build.category === 'table_unit';
    const numDevices = build.count;
    if (isTable) {
      const newTarget = settings.table_unit_target + numDevices;
      await updateSettings({ table_unit_target: newTarget });
    } else if (build.category === 'counter_unit') {
      const newTarget = settings.counter_unit_target + numDevices;
      await updateSettings({ counter_unit_target: newTarget });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting build:', err);
    res.status(500).json({ error: 'Could not delete build.' });
  }
});

module.exports = router;
