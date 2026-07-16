// routes/auth.js — passwordless magic-link sign-in, restricted to the
// @attune-integrations.com domain. A short-lived signed token is emailed;
// clicking it sets the long-lived session cookie.
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { JWT_SECRET, COOKIE_SECURE } = require('../config');
const { requireAuth } = require('../middleware/auth');
const email = require('../services/emailService');

const router = express.Router();

const ALLOWED_DOMAIN = 'attune-integrations.com';
const MAGIC_TTL = '15m';
const SESSION_TTL = '7d';

function isCompanyEmail(addr) {
  return typeof addr === 'string' &&
    /^[^\s@]+@attune-integrations\.com$/i.test(addr.trim());
}

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/request-link  { email }
// Sends a magic sign-in link if the email is a company address.
router.post('/request-link', async (req, res) => {
  let { email: addr } = req.body || {};
  addr = (addr || '').trim().toLowerCase();

  if (!addr) return res.status(400).json({ error: 'Enter your email address.' });
  if (!isCompanyEmail(addr)) {
    return res.status(403).json({ error: `Only @${ALLOWED_DOMAIN} email addresses can sign in.` });
  }

  try {
    // Sign a short-lived token that encodes the email + a purpose claim.
    const magicToken = jwt.sign(
      { email: addr, purpose: 'magic-link' },
      JWT_SECRET,
      { expiresIn: MAGIC_TTL }
    );
    await email.sendMagicLink(addr, magicToken);
    res.json({ ok: true, message: `A sign-in link has been sent to ${addr}. It expires in 15 minutes.` });
  } catch (err) {
    console.error('Failed to send magic link:', err);
    res.status(500).json({ error: 'Could not send the sign-in email. Try again shortly.' });
  }
});

// GET /api/auth/verify?token=...
// Validates the magic token, upserts the user, sets the session, redirects to app.
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token.');

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== 'magic-link' || !isCompanyEmail(payload.email)) {
      return res.status(400).send('Invalid sign-in link.');
    }

    const emailAddr = payload.email.toLowerCase();
    const username = emailAddr.split('@')[0];

    // Upsert user record (users sheet/table still used for profile + role).
    let user = await db.getUserByEmail(emailAddr);
    if (!user) {
      user = db.createUser({
        username,
        email: emailAddr,
        display_name: username,
        role: 'staff',
      });
    }

    setSessionCookie(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    });

    res.redirect('/');
  } catch (err) {
    console.error('Magic link verify failed:', err.message);
    res.status(400).send('This sign-in link is invalid or has expired. Please request a new one.');
  }
});

// Legacy password login kept for the seeded admin account (optional fallback).
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Enter a username and password.' });
  }
  try {
    const user = await db.getUserByUsername(username);
    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }
    setSessionCookie(res, {
      id: user.id, username: user.username, email: user.email,
      displayName: user.display_name, role: user.role,
    });
    res.json({ id: user.id, username: user.username, displayName: user.display_name, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to authenticate.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
