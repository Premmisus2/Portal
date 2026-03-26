// Premmisus Dialer — Initiate Twilio click-to-call
// POST: { repPhone, leadPhone, leadName, leadId, repId }
// Returns: { callSid, status } or { error }

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const FROM = process.env.TWILIO_PHONE_NUMBER || '';
  const BASE = (process.env.BASE_URL || '').trim();
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  if (!SID || !TOKEN || !FROM || !BASE) {
    return res.status(500).json({ error: 'Twilio not configured' });
  }

  const { repPhone, leadPhone, leadName, leadId, repId } = req.body || {};
  if (!repPhone || !leadPhone || !leadId || !repId) {
    return res.status(400).json({ error: 'Missing required fields: repPhone, leadPhone, leadId, repId' });
  }

  try {
    // 1. Call Twilio REST API to initiate call to rep's phone
    const twilioAuth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const twimlUrl = `${BASE}/api/twiml-bridge?leadPhone=${encodeURIComponent(leadPhone)}&leadName=${encodeURIComponent(leadName || 'Unknown')}`;
    const statusUrl = `${BASE}/api/call-status`;

    const params = new URLSearchParams({
      To: repPhone,
      From: FROM,
      Url: twimlUrl,
      StatusCallback: statusUrl,
      StatusCallbackEvent: 'initiated ringing answered completed',
      StatusCallbackMethod: 'POST',
      Record: 'true',
    });

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      return res.status(400).json({ error: twilioData.message || 'Twilio call failed', code: twilioData.code });
    }

    // 2. Create call_log entry in Supabase with call_sid
    const logRes = await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        lead_id: leadId,
        rep_id: repId,
        call_sid: twilioData.sid,
        call_type: 'twilio',
        outcome: 'no_answer', // default, updated when rep logs outcome
        twilio_status: 'initiated',
        business_name: leadName || null,
      }),
    });

    const logData = await logRes.json();

    return res.status(200).json({
      callSid: twilioData.sid,
      status: 'initiated',
      callLogId: Array.isArray(logData) ? logData[0]?.id : null,
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
