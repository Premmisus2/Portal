// Premmisus Dialer — Inbound voice handler
// Twilio Voice URL target for the Premmisus number. Identifies the caller
// from `leads.phone`, finds the most recent rep that called them, fires an
// SMS heads-up to that rep, inserts a call_logs row keyed on the inbound
// CallSid (so the existing recording-callback + classifier pipeline attaches
// recording / transcript / outcome_auto automatically), then bridges with a
// whisper announcement.
//
// Schema constraints (call_logs): lead_id NOT NULL, rep_id NOT NULL,
// outcome CHECK in (no_answer, voicemail_left, callback_requested,
// not_interested, booked_call, wrong_number, discovery_completed, no_show).
// Unknown callers can't be inserted (no lead row), so they only get bridged
// + SMS heads-up. Add a stub-lead path later if we want full inbound coverage.

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';
const ELLIOTT_EMAIL = 'elliott@premmisus.com';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function sbGet(path: string, sbKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function resolveRepId(leadId: string, leadAssignedRepId: string | null, sbKey: string): Promise<string | null> {
  // Prefer the most recent rep that called this lead.
  const recent = await sbGet(`call_logs?lead_id=eq.${leadId}&select=rep_id&order=created_at.desc&limit=1`, sbKey);
  if (Array.isArray(recent) && recent.length > 0 && recent[0]?.rep_id) return recent[0].rep_id;

  // Fallback: lead's assigned rep.
  if (leadAssignedRepId) return leadAssignedRepId;

  // Final fallback: Elliott (director) by email.
  const elliott = await sbGet(`reps?email=eq.${encodeURIComponent(ELLIOTT_EMAIL)}&select=id&limit=1`, sbKey);
  if (Array.isArray(elliott) && elliott.length > 0 && elliott[0]?.id) return elliott[0].id;

  return null;
}

async function resolveRepPhone(repId: string, sbKey: string): Promise<string | null> {
  const r = await sbGet(`reps?id=eq.${repId}&select=phone&limit=1`, sbKey);
  if (Array.isArray(r) && r.length > 0 && r[0]?.phone) return r[0].phone;
  return null;
}

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const FALLBACK_PHONE = (process.env.ELLIOTT_PHONE || '').trim();
  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const TWILIO_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const BASE = (process.env.BASE_URL || '').trim();

  let fromRaw = '';
  let callSid = '';
  try {
    const formData = await request.formData();
    fromRaw = String(formData.get('From') || '');
    callSid = String(formData.get('CallSid') || '');
  } catch {}

  const fromDigits = fromRaw.replace(/\D/g, '').slice(-10);

  let leadName = '';
  let leadId: string | null = null;
  let leadAssignedRepId: string | null = null;
  let routeRepId: string | null = null;
  let routeToPhone = FALLBACK_PHONE;

  if (SB_KEY && fromDigits.length === 10) {
    try {
      // Match digits tolerating any separators in stored phone (e.g. "+1 519-351-2233").
      // Pattern: 5[^0-9]*1[^0-9]*9...  using PostgREST regex match (~).
      const digitPattern = fromDigits.split('').join('[^0-9]*');
      const leads = await sbGet(
        `leads?phone=match.${encodeURIComponent(digitPattern)}&select=id,business_name,assigned_rep_id&limit=1`,
        SB_KEY,
      );
      if (Array.isArray(leads) && leads.length > 0) {
        leadName = leads[0].business_name || '';
        leadId = leads[0].id;
        leadAssignedRepId = leads[0].assigned_rep_id || null;

        routeRepId = await resolveRepId(leadId!, leadAssignedRepId, SB_KEY);
        if (routeRepId) {
          const phone = await resolveRepPhone(routeRepId, SB_KEY);
          if (phone) routeToPhone = phone;
        }
      }
    } catch (e) {
      console.error('inbound-voice lookup failed:', e);
    }
  }

  // Insert call_logs row — fire-and-forget but await so failures surface.
  // Only if we have a known lead AND a resolvable rep (schema requires both).
  if (SB_KEY && callSid && leadId && routeRepId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          lead_id: leadId,
          rep_id: routeRepId,
          call_sid: callSid,
          call_type: 'twilio_inbound',
          outcome: 'no_answer',
          twilio_status: 'initiated',
          business_name: leadName || null,
          notes: `Inbound callback from ${fromRaw}`,
        }),
      });
    } catch (e) {
      console.error('inbound-voice call_logs insert failed:', e);
    }
  }

  // SMS heads-up — fire-and-forget.
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
  const recordingCallback = BASE ? `${BASE}/api/recording-callback` : '';
  const recordAttrs = recordingCallback
    ? ` record="record-from-answer-dual" recordingStatusCallback="${escapeXml(recordingCallback)}" recordingStatusCallbackMethod="POST"`
    : ' record="record-from-answer-dual"';

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
  <Dial callerId="${escapeXml(callerIdForBridge)}" timeout="25" answerOnBridge="true"${recordAttrs}>
    <Number${whisperAttr}>${escapeXml(sanitizedTo)}</Number>
  </Dial>
  <Say voice="alice">No one is available right now. Please leave a message after the tone.</Say>
  <Record maxLength="90"/>
</Response>`;

  return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
}
