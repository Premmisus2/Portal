// Premmisus Dialer — Call Status Webhook
// Receives Twilio status callbacks as call progresses
// Updates call_logs with duration and status

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  // Twilio sends form-encoded data
  const body = req.body || {};
  const callSid = body.CallSid || body.callSid || '';
  const callStatus = body.CallStatus || body.callStatus || '';
  const callDuration = body.CallDuration || body.callDuration || '';

  if (!callSid) return res.status(200).send('OK');

  try {
    const updates: Record<string, any> = {
      twilio_status: callStatus,
    };

    if (callDuration) {
      updates.duration_seconds = parseInt(callDuration, 10);
    }

    // Update call_logs where call_sid matches
    await fetch(`${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${callSid}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updates),
    });

  } catch (err) {
    // Don't fail — Twilio expects 200
    console.error('call-status error:', err);
  }

  return res.status(200).send('OK');
}
