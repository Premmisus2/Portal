// Premmisus Dialer — Inbound voice handler
// Twilio Voice URL target for the Premmisus number. Identifies the caller
// from `leads.phone`, finds the most recent rep that called them, fires an
// SMS heads-up to that rep, then bridges the call with a whisper announcement.

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const FALLBACK_PHONE = (process.env.ELLIOTT_PHONE || '').trim();
  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const TWILIO_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const BASE = (process.env.BASE_URL || '').trim();

  let fromRaw = '';
  try {
    const formData = await request.formData();
    fromRaw = String(formData.get('From') || '');
  } catch {}

  const fromDigits = fromRaw.replace(/\D/g, '').slice(-10);

  let leadName = '';
  let routeToPhone = FALLBACK_PHONE;
  let leadId: string | null = null;

  if (SB_KEY && fromDigits.length === 10) {
    try {
      const leadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?phone=ilike.%25${fromDigits}%25&select=id,business_name&limit=1`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      const leads = await leadRes.json();
      if (Array.isArray(leads) && leads.length > 0) {
        leadName = leads[0].business_name || '';
        leadId = leads[0].id;

        const logRes = await fetch(
          `${SUPABASE_URL}/rest/v1/call_logs?lead_id=eq.${leadId}&select=rep_id,reps(phone,name)&order=created_at.desc&limit=1`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
        );
        const logs = await logRes.json();
        const repPhone = Array.isArray(logs) && logs.length > 0 ? logs[0]?.reps?.phone : null;
        if (repPhone) routeToPhone = repPhone;
      }
    } catch (e) {
      console.error('inbound-voice lookup failed:', e);
    }
  }

  if (SID && TOKEN && TWILIO_FROM && routeToPhone) {
    const label = leadName || `unknown caller ${fromRaw}`;
    const smsBody = `📞 INBOUND: ${label} is calling back (${fromRaw}). Twilio is bridging now.`;
    const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: routeToPhone, From: TWILIO_FROM, Body: smsBody });
    fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }).catch(() => {});
  }

  const callerIdForBridge = fromRaw.replace(/[^+0-9]/g, '') || TWILIO_FROM;
  const sanitizedTo = routeToPhone.replace(/[^+0-9]/g, '');
  const whisperUrl = BASE && leadName
    ? `${BASE}/api/inbound-whisper?biz=${encodeURIComponent(leadName)}`
    : (BASE ? `${BASE}/api/inbound-whisper` : '');
  const whisperAttr = whisperUrl ? ` url="${escapeXml(whisperUrl)}"` : '';

  if (!sanitizedTo) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thanks for calling Premmisus. Please leave a message after the tone.</Say>
  <Record maxLength="90"/>
</Response>`;
    return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerIdForBridge)}" timeout="25" answerOnBridge="true" record="record-from-answer-dual">
    <Number${whisperAttr}>${escapeXml(sanitizedTo)}</Number>
  </Dial>
  <Say voice="alice">No one is available right now. Please leave a message after the tone.</Say>
  <Record maxLength="90"/>
</Response>`;

  return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
}
