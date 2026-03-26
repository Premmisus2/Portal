// Premmisus Tracker — SMS Notification via Twilio
// Sends SMS to Elliott when reps book calls, request follow-ups, or go idle

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const FROM = process.env.TWILIO_PHONE_NUMBER || '';
  const TO = (process.env.ELLIOTT_PHONE || '').trim();

  if (!SID || !TOKEN || !FROM || !TO) {
    return res.status(500).json({ error: 'SMS not configured' });
  }

  const { type, repName, businessName, phone, notes } = req.body || {};

  let message = '';
  switch (type) {
    case 'booked':
      message = `[Premmisus] ${repName || 'Rep'} booked a call with ${businessName || 'Unknown'}${phone ? ' (' + phone + ')' : ''}. Check portal.`;
      break;
    case 'callback':
      message = `[Premmisus] ${repName || 'Rep'} — follow-up requested: ${businessName || 'Unknown'}${notes ? '. Notes: ' + notes.slice(0, 80) : ''}`;
      break;
    case 'idle':
      message = `[Premmisus] No rep activity for 2+ hours. Check portal.premmisus.ca`;
      break;
    case 'handoff':
      message = `[Premmisus] ${repName || 'Rep'} handed off ${businessName || 'a lead'}. Check portal for details.`;
      break;
    default:
      message = `[Premmisus] ${repName || 'Rep'}: ${businessName || 'Activity update'}. Check portal.`;
  }

  try {
    const twilioAuth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: TO, From: FROM, Body: message });

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      return res.status(400).json({ error: data.message || 'SMS failed', code: data.code });
    }

    return res.status(200).json({ success: true, sid: data.sid });

  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
