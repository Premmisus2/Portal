// Premmisus Tracker — Telegram Bot Notification
// Sends formatted Telegram messages for priority alerts

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Telegram not configured' });
  }

  const { type, repName, businessName, phone, notes, stats } = req.body || {};

  let message = '';
  switch (type) {
    case 'booked':
      message = `🟢 *BOOKED CALL*\nRep: ${repName || 'Unknown'}\nBusiness: ${businessName || 'Unknown'}${phone ? '\nPhone: ' + phone : ''}${notes ? '\nNotes: ' + notes.slice(0, 200) : ''}\n\n_Check portal for details_`;
      break;
    case 'idle':
      message = `🔴 *IDLE ALERT*\nNo rep activity for 2+ hours during business hours.\n\n_Check portal.premmisus.ca_`;
      break;
    case 'daily_summary':
      message = `📊 *DAILY SUMMARY*\n${stats || 'No stats available.'}`;
      break;
    default:
      message = `📋 *${type?.toUpperCase() || 'UPDATE'}*\n${repName || 'Rep'}: ${businessName || 'Activity update'}`;
  }

  try {
    const teleRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await teleRes.json();

    if (!data.ok) {
      return res.status(400).json({ error: data.description || 'Telegram send failed' });
    }

    return res.status(200).json({ success: true, message_id: data.result?.message_id });

  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
