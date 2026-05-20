// Premmisus Dialer — Inbound SMS webhook (A2P 10DLC approved 2026-05).
//
// Twilio posts here when someone texts the Premmisus number. This handler:
//   1. Verifies the request signature (X-Twilio-Signature) using TWILIO_AUTH_TOKEN.
//   2. Detects opt-out / opt-in / help keywords and reacts per CTIA / TCPA.
//   3. Looks up the lead by phone digit-pattern (same trick used by inbound-voice).
//   4. Resolves which rep "owns" the lead — most recent rep that called them,
//      falling back to assigned_rep_id, falling back to Elliott (director).
//   5. Inserts an sms_messages row (idempotent on twilio_sid).
//   6. Fires the Telegram alert via /api/notify-telegram type='inbound_sms'.
//   7. Returns TwiML — empty <Response/> for normal replies, or a <Message>
//      confirmation for keyword replies (STOP/START/HELP).
//
// Note: Twilio's Advanced Opt-Out (enabled by default on 10DLC) ALSO handles
// STOP/HELP at the account layer. This handler is the belt-and-braces second
// line of defense and the source-of-truth record for sms_opted_out_at.

import { verifyTwilioSignature } from '@/lib/twilio-signature';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';
const ELLIOTT_EMAIL = 'elliott@premmisus.com';

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_WORDS = new Set(['START', 'YES', 'UNSTOP']);
const HELP_WORDS = new Set(['HELP', 'INFO']);

const STOP_REPLY = 'You are unsubscribed from Premmisus messages. Reply START to opt back in.';
const START_REPLY = 'You are re-subscribed to Premmisus messages. Reply STOP to unsubscribe.';
const HELP_REPLY = 'Premmisus support: elliott@premmisus.com or call (249) 468-2807. Reply STOP to unsubscribe.';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function twimlMessage(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escapeXml(body)}</Message></Response>`;
}

function twimlEmpty() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response/>`;
}

async function sbGet(path: string, sbKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function sbPost(path: string, sbKey: string, body: any, prefer = 'return=minimal') {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: JSON.stringify(body),
  });
}

async function sbPatch(path: string, sbKey: string, body: any) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function resolveRepId(leadId: string, leadAssignedRepId: string | null, sbKey: string): Promise<string | null> {
  const recent = await sbGet(`call_logs?lead_id=eq.${leadId}&select=rep_id&order=created_at.desc&limit=1`, sbKey);
  if (Array.isArray(recent) && recent.length > 0 && recent[0]?.rep_id) return recent[0].rep_id;
  if (leadAssignedRepId) return leadAssignedRepId;
  const elliott = await sbGet(`reps?email=eq.${encodeURIComponent(ELLIOTT_EMAIL)}&select=id&limit=1`, sbKey);
  if (Array.isArray(elliott) && elliott.length > 0 && elliott[0]?.id) return elliott[0].id;
  return null;
}

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const AUTH_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const BASE = (process.env.BASE_URL || '').trim();

  // Parse form-encoded body
  let params: Record<string, string> = {};
  try {
    const formData = await request.formData();
    formData.forEach((v, k) => { params[k] = String(v); });
  } catch (e) {
    return new Response(twimlEmpty(), { status: 400, headers: { 'Content-Type': 'application/xml' } });
  }

  // Signature verification
  const signatureHeader = request.headers.get('x-twilio-signature') || '';
  const fullUrl = BASE ? `${BASE}/api/inbound-sms` : new URL(request.url).toString().split('?')[0];
  if (AUTH_TOKEN && !verifyTwilioSignature(fullUrl, params, signatureHeader, AUTH_TOKEN)) {
    console.error('inbound-sms: signature verification failed', { url: fullUrl, hasSig: !!signatureHeader });
    return new Response(twimlEmpty(), { status: 403, headers: { 'Content-Type': 'application/xml' } });
  }

  const fromRaw = params.From || '';
  const toRaw = params.To || '';
  const bodyRaw = (params.Body || '').trim();
  const messageSid = params.MessageSid || params.SmsSid || '';

  // Keyword detection — match first token, case-insensitive, alpha-only.
  const firstToken = (bodyRaw.split(/\s+/)[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
  let keyword: string | null = null;
  if (STOP_WORDS.has(firstToken)) keyword = 'STOP';
  else if (START_WORDS.has(firstToken)) keyword = firstToken === 'YES' ? 'YES' : firstToken === 'UNSTOP' ? 'UNSTOP' : 'START';
  else if (HELP_WORDS.has(firstToken)) keyword = 'HELP';

  // Lookup lead by phone digit-pattern (tolerant of any separators in stored value)
  const fromDigits = fromRaw.replace(/\D/g, '').slice(-10);
  let leadId: string | null = null;
  let leadName = '';
  let leadAssignedRepId: string | null = null;
  if (SB_KEY && fromDigits.length === 10) {
    try {
      const digitPattern = fromDigits.split('').join('[^0-9]*');
      const leads = await sbGet(
        `leads?phone=match.${encodeURIComponent(digitPattern)}&select=id,business_name,assigned_rep_id&limit=1`,
        SB_KEY,
      );
      if (Array.isArray(leads) && leads.length > 0) {
        leadId = leads[0].id;
        leadName = leads[0].business_name || '';
        leadAssignedRepId = leads[0].assigned_rep_id || null;
      }
    } catch (e) {
      console.error('inbound-sms lead lookup failed:', e);
    }
  }

  // Resolve rep (so the inbound row gets attribution)
  let repId: string | null = null;
  if (SB_KEY && leadId) {
    try { repId = await resolveRepId(leadId, leadAssignedRepId, SB_KEY); } catch {}
  }

  // Handle opt-out / opt-in: update leads.sms_opted_out_at if we have a lead
  if (SB_KEY && leadId) {
    try {
      if (keyword === 'STOP') {
        await sbPatch(`leads?id=eq.${leadId}`, SB_KEY, { sms_opted_out_at: new Date().toISOString() });
      } else if (keyword === 'START' || keyword === 'YES' || keyword === 'UNSTOP') {
        await sbPatch(`leads?id=eq.${leadId}`, SB_KEY, { sms_opted_out_at: null });
      }
    } catch (e) {
      console.error('inbound-sms opt-out update failed:', e);
    }
  }

  // Insert sms_messages row — fire-and-forget but await so failures surface in logs.
  // Idempotency: ON CONFLICT(twilio_sid) DO NOTHING via Prefer: resolution=ignore-duplicates.
  if (SB_KEY && messageSid) {
    try {
      await sbPost('sms_messages', SB_KEY, {
        lead_id: leadId,
        rep_id: repId,
        direction: 'inbound',
        twilio_sid: messageSid,
        from_phone: fromRaw,
        to_phone: toRaw,
        body: bodyRaw,
        status: 'received',
        keyword,
      }, 'return=minimal,resolution=ignore-duplicates');
    } catch (e) {
      console.error('inbound-sms message insert failed:', e);
    }
  }

  // Telegram alert — fire-and-forget. Only for non-keyword inbounds (don't spam
  // on STOP/HELP since Twilio handles those quietly at the account layer).
  if (BASE && !keyword) {
    const repName = repId ? '' : 'unrouted';
    fetch(`${BASE}/api/notify-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'inbound_sms',
        repName: repName || undefined,
        businessName: leadName || `Unknown (${fromRaw})`,
        phone: fromRaw,
        notes: bodyRaw,
      }),
    }).catch(() => {});
  }

  // Reply with appropriate TwiML
  if (keyword === 'STOP') return new Response(twimlMessage(STOP_REPLY), { headers: { 'Content-Type': 'application/xml' } });
  if (keyword === 'START' || keyword === 'YES' || keyword === 'UNSTOP') return new Response(twimlMessage(START_REPLY), { headers: { 'Content-Type': 'application/xml' } });
  if (keyword === 'HELP') return new Response(twimlMessage(HELP_REPLY), { headers: { 'Content-Type': 'application/xml' } });
  return new Response(twimlEmpty(), { headers: { 'Content-Type': 'application/xml' } });
}
