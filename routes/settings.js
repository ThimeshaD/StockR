// routes/settings.js — configurable order targets + reporter emails.
const express = require('express');
const { getSettings, updateSettings, ALLOWED_DOMAIN } = require('../services/settingsService');
const emailService = require('../services/emailService');

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await getSettings(true);
    res.json({ ...settings, allowed_domain: ALLOWED_DOMAIN, email_configured: emailService.isConfigured() });
  } catch (err) {
    console.error('Error reading settings:', err);
    res.status(500).json({ error: 'Could not load settings.' });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const { table_unit_target, counter_unit_target, reporter_emails } = req.body || {};
  try {
    const updated = await updateSettings({ table_unit_target, counter_unit_target, reporter_emails });
    res.json({ ...updated, allowed_domain: ALLOWED_DOMAIN, email_configured: emailService.isConfigured() });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(400).json({ error: err.message || 'Could not update settings.' });
  }
});

module.exports = router;
