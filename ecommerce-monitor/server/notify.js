// =============================================================================
// Notification Module - Email + Telegram
// =============================================================================

const nodemailer = require('nodemailer');

// --- Email Notification ------------------------------------------------------
async function sendEmailAlert(results) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipients = process.env.ALERT_EMAILS; // comma-separated

  if (!smtpUser || !smtpPass || !recipients) {
    console.log('[EMAIL] Skipped — SMTP_USER, SMTP_PASS, or ALERT_EMAILS not set');
    return;
  }

  const allPassed = results.summary.failed === 0;
  const icon = allPassed ? '✅' : '🚨';
  const status = allPassed ? 'ALL PASSED' : `${results.summary.failed} SITE(S) FAILED`;
  const dateStr = new Date().toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });

  const subject = `${icon} Checkout Monitor: ${status} — ${dateStr}`;

  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${allPassed ? '#059669' : '#DC2626'}; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">${icon} Checkout Monitor</h2>
        <p style="margin: 5px 0 0; opacity: 0.9;">${dateStr} — ${status}</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
  `;

  for (const site of results.sites) {
    const siteIcon = site.overallStatus === 'passed' ? '✅' : '❌';
    html += `
      <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 10px;">${siteIcon} ${site.site} <span style="font-weight: normal; color: #6b7280; font-size: 13px;">(${(site.duration / 1000).toFixed(1)}s)</span></h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
    `;
    for (const step of site.steps) {
      const stepIcon = step.status === 'passed' ? '✅' : '❌';
      const color = step.status === 'passed' ? '#059669' : '#DC2626';
      html += `
        <tr>
          <td style="padding: 4px 0;">${stepIcon} ${step.name}</td>
          <td style="padding: 4px 0; color: ${color}; text-align: right; font-size: 12px;">${step.message.substring(0, 80)}</td>
        </tr>
      `;
    }
    html += `</table></div>`;
  }

  html += `
      </div>
      <div style="background: #f3f4f6; padding: 12px 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: 0;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          Checkout Monitor • slumberland.com.my & vono.com.my
        </p>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Checkout Monitor" <${smtpUser}>`,
      to: recipients,
      subject,
      html,
    });

    console.log(`[EMAIL] Alert sent to: ${recipients}`);
  } catch (err) {
    console.error('[EMAIL] Failed:', err.message);
  }
}

// --- Telegram Notification ---------------------------------------------------
async function sendTelegramAlert(results) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[TELEGRAM] Skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  const allPassed = results.summary.failed === 0;
  const icon = allPassed ? '✅' : '🚨';
  const dateStr = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });

  let msg = `${icon} *Checkout Monitor Report*\n`;
  msg += `📅 ${dateStr}\n\n`;

  for (const site of results.sites) {
    const siteIcon = site.overallStatus === 'passed' ? '✅' : '❌';
    msg += `${siteIcon} *${site.site}* (${(site.duration / 1000).toFixed(1)}s)\n`;
    for (const step of site.steps) {
      const stepIcon = step.status === 'passed' ? '  ✓' : '  ✗';
      msg += `${stepIcon} ${step.name}\n`;
      if (step.status === 'failed') {
        msg += `    ⚠️ _${step.message.substring(0, 100)}_\n`;
      }
    }
    msg += '\n';
  }

  msg += `📊 *${results.summary.passed}/${results.summary.total}* sites passed`;

  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
      }),
    });
    console.log(`[TELEGRAM] Alert sent to chat: ${chatId}`);
  } catch (err) {
    console.error('[TELEGRAM] Failed:', err.message);
  }
}

module.exports = { sendEmailAlert, sendTelegramAlert };
