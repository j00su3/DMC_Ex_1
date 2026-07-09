const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function notifyTelegram(message) {
  if (!TOKEN || !CHAT_ID) {
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
    });

    if (!res.ok) {
      console.warn('Telegram notification failed:', res.status, await res.text());
    }
  } catch (err) {
    console.warn('Telegram notification error:', err.message);
  }
}

module.exports = { notifyTelegram };
