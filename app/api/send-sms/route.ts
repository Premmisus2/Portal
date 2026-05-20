// Premmisus Dialer — Outbound SMS send (rep replies + composer sends).
//
// Called by:
//   * Inbox composer (lead reply)
//   * Inline composer on lead row
//   * Future: missed-call auto-reply (also reuses this — Item B)
//
// Guarantees:
//   * Refuses to send if leads.sms_opted_out_at is set (TCPA / CTIA compliance).
//   * Inserts sms_messages row on success so the conversation thread reflects it.
//   * Returns Twilio's MessageSid + status so the UI can show send-state.

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

async function sbGet(path: string, sbKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function sbPost(path: string, sbKey: string, body: any) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const TWILIO_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  if (!SB_KEY || !SID || !TOKEN || !TWILIO_FROM) {
    return NextResponse.json({ error: 'SMS sending not configured (missing env vars)' }, { status: 500 });
  }

  let payload: { lead_id?: string; rep_id?: string; body?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const leadId = payload.lead_id;
  const repId = payload.rep_id;
  const body = (payload.body || '').trim();

  if (!leadId || !body) return NextResponse.json({ error: 'lead_id and body required' }, { status: 400 });
  if (body.length > 1500) return NextResponse.json({ error: 'SMS body too long' }, { status: 400 });

  // Lookup lead — get phone + opt-out status
  const leads = await sbGet(`leads?id=eq.${leadId}&select=phone,sms_opted_out_at&limit=1`, SB_KEY);
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  const lead = leads[0];
  if (lead.sms_opted_out_at) {
    return NextResponse.json({ error: 'Lead has opted out of SMS' }, { status: 403 });
  }
  if (!lead.phone) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });
  }

  // Normalize To phone — strip non-digit, prepend + if missing
  const toDigits = lead.phone.replace(/[^+0-9]/g, '');
  const toFinal = toDigits.startsWith('+') ? toDigits : `+1${toDigits.replace(/^1/, '')}`;

  // Send via Twilio
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: toFinal, From: TWILIO_FROM, Body: body });
  const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const twilioData = await twilioRes.json();

  if (!twilioRes.ok) {
    // Log the failed attempt so the rep sees the conversation row even on failure.
    await sbPost('sms_messages', SB_KEY, {
      lead_id: leadId,
      rep_id: repId || null,
      direction: 'outbound',
      twilio_sid: twilioData.sid || null,
      from_phone: TWILIO_FROM,
      to_phone: toFinal,
      body,
      status: 'failed',
      error_code: twilioData.code ? String(twilioData.code) : null,
    });
    return NextResponse.json({ error: twilioData.message || 'Twilio send failed', code: twilioData.code }, { status: 502 });
  }

  // Success — insert row
  await sbPost('sms_messages', SB_KEY, {
    lead_id: leadId,
    rep_id: repId || null,
    direction: 'outbound',
    twilio_sid: twilioData.sid,
    from_phone: TWILIO_FROM,
    to_phone: toFinal,
    body,
    status: twilioData.status || 'queued',
  });

  return NextResponse.json({ success: true, sid: twilioData.sid, status: twilioData.status });
}
