// scripts/reset-admin.js — run with `npm run reset-admin` to reset the
// admin account's password (or create a new admin user) from the command line.
const readline = require('node:readline');
const bcrypt = require('bcryptjs');
const db = require('../db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  const username = (await ask('Username to reset [admin]: ')).trim() || 'admin';
  const password = await ask('New password: ');

  if (!password || password.length < 4) {
    console.log('Password must be at least 4 characters.');
    rl.close();
    process.exit(1);
  }

  try {
    await db.init();
    const hash = bcrypt.hashSync(password, 10);
    const existing = await db.getUserByUsername(username);

    if (existing) {
      await db.updateUserPassword(username, hash);
      console.log(`Password updated for "${username}".`);
    } else {
      await db.insertUser({ username, password_hash: hash, display_name: username, role: 'admin' });
      console.log(`Created new admin user "${username}".`);
    }
  } catch (err) {
    console.error('Unable to reset admin password:', err);
    process.exit(1);
  } finally {
    rl.close();
  }
})();
