# Stockroom — simple inventory tracker

A small, self-hosted inventory tracker for a single location and a small team:
add items, log stock in/out/counts, and see what's low or out of stock at a
glance. Real backend, real SQLite database, sign-in required.

## What's inside

- **Backend:** Node.js + Express
- **Database:** SQLite, via Node's built-in `node:sqlite` module — no separate
  database server to install, and no native module compilation (this is why
  it needs a fairly recent Node version, see below).
- **Frontend:** plain HTML/CSS/JS, served by the same server. No build step.
- **Auth:** passwordless magic-link sign-in restricted to
  `@attune-integrations.com` email addresses (sessions via an httpOnly cookie).

## Requirements

- Node.js **22.5.0 or later** (for built-in SQLite support). Check with `node -v`.
  If you're on an older Node, install the current LTS from nodejs.org first.

## Setup

```bash
npm install
npm start
```

Then open **http://localhost:3000** in a browser.

On the very first run, the app creates its database (in `data/inventory.db`)
and prints a default login to the terminal:

```
username: admin
password: admin123
```

**Sign in and change this password immediately** — run `npm run reset-admin`
any time to set a new password (or recover access if you get locked out).

## Configuration

Copy `.env.example` to `.env` to override any of these (all optional):

| Variable                 | Default    | Notes                                                             |
|---------------------------|------------|--------------------------------------------------------------------|
| `PORT`                    | `3000`     | Port the server listens on                                         |
| `COOKIE_SECURE`           | `false`    | Set `true` only if served over HTTPS — otherwise login will fail   |
| `DEFAULT_ADMIN_PASSWORD`  | `admin123` | Only used the very first time the database is created              |

`JWT_SECRET` is generated automatically into `.env` on first run — you don't
need to set it yourself, just don't delete it (that would sign everyone out).

## First-time setup for the new features

After `npm install`, run the one-time migration that adds the new sheet tabs
and columns (safe to run again later):

```bash
npm run setup-new-features
```

This creates/updates:
- `UnifiedInventory` columns **L (stock_location)** and **M (supplier)**
- a **Settings** sheet (order targets + reporter emails)
- a **StockMovements** sheet (the stock transaction audit log)

### Email (magic-link login + low-stock reports)

Sign-in links and low-stock report emails are sent over **Gmail SMTP** using an
App Password. Add these to `.env` (see `.env.example`):

```
SMTP_USER=you@attune-integrations.com
SMTP_PASS=your-16-char-app-password       # Google Account → Security → App passwords
SMTP_FROM=Stockroom <you@attune-integrations.com>
APP_URL=https://stockroom.yourcompany.com  # public base URL used in the magic links
```

If SMTP isn't configured, the app still runs — emails are printed to the server
console instead of being delivered (handy for local testing).

## What's new in this version

- **Passwordless sign-in** — enter your `@attune-integrations.com` email, get a
  15-minute magic link, click it, you're in. No passwords to manage.
- **Stock transaction history** — every quantity change (restock, manual
  adjustment, build, undo) is logged with before/after, reason and user. Click
  the history icon on any inventory row to see the full trail.
- **Configurable order targets** — set separate Table Unit / Counter Unit
  targets on the Settings page instead of a hardcoded number.
- **Supplier & stock location** — new fields on every item, searchable and
  included in exports.
- **Reports page** — download CSV exports (full inventory, purchase-order list,
  movement history) and email the current low-stock list to your reporters.
- **Reporter management** — manage the low-stock email recipients on Settings.
- **Clickable dashboard** — each stat card and device metric jumps to the
  relevant filtered view.

## Using it

- **Dashboard** — total items, healthy/low/out-of-stock counts, and a quick
  list of anything that needs attention.
- **Items** — add, edit, search, and filter by category. Each row shows a
  stock-level bar: the fill is the current quantity, the dark tick mark is
  the reorder threshold, and the color tells you the status at a glance.
- **Adjust stock** — every quantity change goes through here (stock in, stock
  out, or "set count" for a manual recount), so there's always a history of
  *why* a number changed, not just what it is now. Click "View history" on
  that dialog to see the full log for an item.
- **Alerts** — everything at or below its reorder threshold, in one list.

Editing an item's details (name, category, threshold, location) never
changes its quantity — that's intentional, so stock levels can only move
through a recorded transaction.

## Deploying for your team

This runs as a normal Node process, so it works on most VPS providers,
a Raspberry Pi on your office network, or a small cloud instance:

1. Copy this folder to the server.
2. `npm install`
3. Set `PORT` and, if you put a reverse proxy with HTTPS in front of it
   (recommended if it's reachable outside your office), set
   `COOKIE_SECURE=true`.
4. Run it with a process manager so it restarts on crashes/reboots, e.g.:
   ```bash
   npm install -g pm2
   pm2 start server.js --name stockroom
   pm2 save
   ```
5. Back up the `data/` folder regularly — it's the entire database, as a
   single SQLite file.

For a team that's only ever on the same office network, running it on a
spare machine or Raspberry Pi with no HTTPS at all (`COOKIE_SECURE=false`,
the default) is perfectly fine.

## Project structure

```
server.js              App entry point
config.js               Env vars + auto-generated JWT secret
db.js                    Schema + first-run seeding
middleware/auth.js       Session-cookie check
routes/auth.js           Sign in / out / current user
routes/items.js          Item CRUD + stock movements + history
routes/dashboard.js      Summary stats + category list
scripts/reset-admin.js   CLI password reset
public/                  Frontend (HTML/CSS/JS, no build step)
data/inventory.db        SQLite database (created on first run)
```

## Adding more users

There's no "add user" screen yet — for a small team, the quickest way is to
run `npm run reset-admin` and give it a new username, which creates that
account if it doesn't already exist. Let me know if you'd like a proper
user-management screen added.
