// server.js — application entry point.
const { PORT } = require('./config');
const express = require('express');
const path = require('node:path');
const cookieParser = require('cookie-parser');
const db = require('./db');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const dashboardRoutes = require('./routes/dashboard');
const buildsRoutes = require('./routes/builds');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/items', requireAuth, itemsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/builds', requireAuth, buildsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);

app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});
app.listen(PORT, () => {
  console.log(`Stockroom running at http://localhost:${PORT}`);
});
