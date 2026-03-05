# 🛒 E-Commerce Checkout Monitor — Team Dashboard

**Automated daily checkout flow testing** for **slumberland.com.my** and **vono.com.my** with a shared team dashboard, email alerts, and Telegram notifications.

---

## ✨ Features

- **Web Dashboard** — Share a single URL with your team to see real-time results
- **Daily Auto-Testing** — Runs every day at 8:00 AM MYT automatically
- **Manual Trigger** — Click "Run Test Now" anytime from the dashboard
- **Email Alerts** — Team gets notified when something breaks
- **Telegram Alerts** — Instant notifications to your team group chat
- **30-Day History** — Visual timeline of all past test runs
- **Failure Screenshots** — Automatic screenshots when a step fails

---

## 🔄 What It Tests

| Step | Action | Checks |
|------|--------|--------|
| 1 | Opens homepage | Site is online, no server errors |
| 2 | Opens product page | Product loads, "Add to Cart" button visible |
| 3 | Clicks Add to Cart | Item successfully added |
| 4 | Opens cart page | Cart has items, "Proceed to Checkout" works |
| 5 | Opens checkout page | Form loads, billing fields work, payment section visible |
| 🛑 | **STOPS** | Does NOT click Place Order — never reaches iPay88 |

---

## 🚀 Setup Guide

### Step 1: Install on your server

```bash
# Clone/download the project
cd ecommerce-monitor

# Install Node.js dependencies
npm install

# Install Playwright browser
npx playwright install chromium
npx playwright install-deps chromium
```

### Step 2: Configure notifications

```bash
# Copy the example config
cp .env.example .env

# Edit with your details
nano .env
```

Fill in your `.env` file:

```env
# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAILS=alice@company.com,bob@company.com

# Telegram (optional)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
TELEGRAM_CHAT_ID=-100123456789
```

### Step 3: Start the dashboard

```bash
# Start the server
npm start
```

Open **http://your-server-ip:3000** — share this URL with your team! 🎉

---

## 🐳 Deploy with Docker (Recommended)

```bash
# Copy and fill in config
cp .env.example .env
nano .env

# Start everything with one command
docker-compose up -d

# View logs
docker-compose logs -f
```

The dashboard will be available at **http://your-server-ip:3000**

---

## 📧 Gmail App Password Setup

1. Go to [Google Account → Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Search for **App Passwords** in account settings
4. Generate a new app password for "Mail"
5. Use the 16-character password as `SMTP_PASS`

---

## 🤖 Telegram Bot Setup

1. Open Telegram → search for **@BotFather**
2. Send `/newbot` → follow the steps → copy the **bot token**
3. Create a group chat → add your bot to the group
4. Send a message in the group
5. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
6. Find `"chat":{"id":-100xxxxx}` — that's your **chat ID**

---

## 🌐 Deploy Online (Free/Cheap Options)

| Platform | Cost | How |
|----------|------|-----|
| **Railway.app** | Free tier / ~$5/mo | Connect GitHub repo → auto-deploys |
| **Render.com** | Free tier | New Web Service → connect repo |
| **DigitalOcean** | ~$6/mo | Create a Droplet → Docker setup |
| **Your own server** | Existing | Just run `docker-compose up -d` |

### Deploy on Railway (easiest):
1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Done! You get a public URL like `checkout-monitor.up.railway.app`

---

## 📁 Project Structure

```
ecommerce-monitor/
├── server/
│   ├── index.js          # Express server + cron scheduler
│   └── notify.js         # Email & Telegram notifications
├── tests/
│   └── checkout-monitor.js   # Playwright test engine
├── public/
│   └── index.html        # Team dashboard (single page app)
├── data/                 # Auto-created: results & screenshots
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Customization

### Change test schedule
Edit `server/index.js` — find the cron line:
```javascript
// Run at 9 AM MYT instead
cron.schedule('0 9 * * *', async () => { ... });

// Run twice daily (8 AM and 5 PM)
cron.schedule('0 8,17 * * *', async () => { ... });

// Weekdays only
cron.schedule('0 8 * * 1-5', async () => { ... });
```

### Change products being tested
Edit `tests/checkout-monitor.js` — update the `SITES` array:
```javascript
testProductUrl: 'https://slumberland.com.my/product/YOUR-PRODUCT/',
```

### Add more sites
Add another object to the `SITES` array in `tests/checkout-monitor.js`.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Browser won't install | Run `npx playwright install-deps chromium` for system dependencies |
| Tests timeout | Increase timeout in `checkout-monitor.js` (currently 30s per step) |
| Bot detection | Update user agent in `checkout-monitor.js` |
| Checkout form fields changed | Inspect the site and update CSS selectors |
| Docker build fails | Ensure you're using the Playwright Docker base image |
| Telegram not working | Verify bot is added to group and chat ID is correct |

---

## 👥 Team Access

Simply share your dashboard URL with team members. No login required for viewing results. If you want to add authentication, consider putting it behind:
- **Cloudflare Access** (free for small teams)
- **Nginx basic auth**
- **A simple password middleware** (ask me and I can add this!)
