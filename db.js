// db.js — database connection, schema setup, and first-run seeding.
// ONLY manages users. Items are now managed in Google Sheets.
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'inventory.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS built_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    count INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed a default admin user on first run only.
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(defaultPassword, 10);
  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)`
  ).run('admin', hash, 'Administrator', 'admin');
  console.log('----------------------------------------------------');
  console.log('First run: created default login');
  console.log('  username: admin');
  console.log(`  password: ${defaultPassword}`);
  console.log('----------------------------------------------------');
}

// Lightweight migration: add the email column if an older DB predates it.
try {
  const cols = db.prepare('PRAGMA table_info(users)').all();
  if (!cols.some(c => c.name === 'email')) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT;');
  }
} catch (err) {
  console.error('users table migration check failed:', err.message);
}

// Add getUserByUsername helper for auth.js
db.getUserByUsername = function(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

db.getUserByEmail = function(emailAddr) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get((emailAddr || '').toLowerCase());
}

db.createUser = function({ username, email, display_name, role = 'staff' }) {
  // Ensure username uniqueness (email local-parts can collide in theory).
  let finalUsername = username;
  let suffix = 1;
  while (db.prepare('SELECT 1 FROM users WHERE username = ?').get(finalUsername)) {
    finalUsername = `${username}${suffix++}`;
  }
  const info = db.prepare(
    `INSERT INTO users (username, email, display_name, role) VALUES (?, ?, ?, ?)`
  ).run(finalUsername, (email || '').toLowerCase(), display_name || finalUsername, role);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = db;
