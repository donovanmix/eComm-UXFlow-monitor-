// =============================================================================
// Dashboard Server
// Serves the team dashboard + REST API for test results
// =============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { runAllTests } = require('../tests/checkout-monitor');
const { sendEmailAlert, sendTelegramAlert } = require('./notify');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- Middleware ---------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// --- API: Get latest results -------------------------------------------------
app.get('/api/results/latest', (req, res) => {
  const file = path.join(DATA_DIR, 'latest-results.json');
  if (!fs.existsSync(file)) {
    return res.json({ message: 'No results yet. Run a test first.', sites: [] });
  }
  res.json(JSON.parse(fs.readFileSync(file, 'utf-8')));
});

// --- API: Get history --------------------------------------------------------
app.get('/api/results/history', (req, res) => {
  const file = path.join(DATA_DIR, 'history.json');
  if (!fs.existsSync(file)) {
    return res.json([]);
  }
  const history = JSON.parse(fs.readFileSync(file, 'utf-8'));
  // Return last N entries based on query param
  const limit = parseInt(req.query.limit) || 30;
  res.json(history.slice(0, limit));
});

// --- API: Get screenshot -----------------------------------------------------
app.get('/api/screenshots/:filename', (req, res) => {
  const file = path.join(DATA_DIR, 'screenshots', req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).send('Not found');
  res.sendFile(file);
});

// --- API: Trigger manual test ------------------------------------------------
let isRunning = false;
app.post('/api/run-test', async (req, res) => {
  if (isRunning) {
    return res.status(429).json({ message: 'Test already running. Please wait.' });
  }

  isRunning = true;
  res.json({ message: 'Test started. Refresh dashboard in 2-3 minutes.' });

  try {
const results = await runAllTests();
    // Send notifications every time (pass or fail)
    await sendEmailAlert(results);
    await sendTelegramAlert(results);
    }
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    isRunning = false;
  }
});

// --- API: Get status ---------------------------------------------------------
app.get('/api/status', (req, res) => {
  res.json({ isRunning, serverTime: new Date().toISOString() });
});

// --- API: Get config (non-sensitive) -----------------------------------------
app.get('/api/config', (req, res) => {
  res.json({
    sites: [
      { name: 'Slumberland', url: 'https://slumberland.com.my' },
      { name: 'Vono', url: 'https://vono.com.my' },
    ],
    schedule: '8:00 AM MYT daily',
    notifications: {
      email: !!process.env.SMTP_USER,
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    },
  });
});

// --- Scheduled daily run at 8 AM MYT (UTC+8 = 00:00 UTC) --------------------
cron.schedule('0 8 * * *', async () => {
  console.log('\n[CRON] Starting scheduled daily test...');
  isRunning = true;
  try {
    const results = await runAllTests();
    // Always send notification for scheduled runs
    await sendEmailAlert(results);
    await sendTelegramAlert(results);
    console.log('[CRON] Scheduled test complete.');
  } catch (err) {
    console.error('[CRON] Error:', err);
  } finally {
    isRunning = false;
  }
}, {
  timezone: 'Asia/Kuala_Lumpur',
});

// --- Serve dashboard for all other routes ------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- Start server ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n  ┌──────────────────────────────────────────┐`);
  console.log(`  │  Checkout Monitor Dashboard               │`);
  console.log(`  │  http://localhost:${PORT}                    │`);
  console.log(`  │  Daily tests at 8:00 AM MYT               │`);
  console.log(`  └──────────────────────────────────────────┘\n`);
});
