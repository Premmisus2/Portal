// Premmisus Dialer — Missed-call SMS auto-reply.
//
// Fires a single follow-up SMS when an outbound call dies (no_answer / busy /
// failed / voicemail_left). Goal: convert dead dials into inbound callbacks.
//
// Called from two places (converges on this idempotent endpoint):
//   1. /api/call-status — Twilio terminal status webhook (no-answer, busy, failed)
//   2. CallLogger.tsx — after rep manually logs voicemail_left / no_answer
//
// Idempotency: call_logs.auto_reply_sent_at + per-lead 24h cooldown via
// sms_messages history. Two reps retrying the same lead won't double-text.
//
// Compliance: respects leads.sms_opted_out_at (TCPA / CTIA mandatory).

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
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

async function sbPatch(path: string, sbKey: string, body: any) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

const ELIGIBLE_OUTCOMES = new Set(['no_answer', 'voicemail_left']);

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const TWILIO_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const AUTOREPLY_DISABLED = (process.env.AUTOREPLY_DISABLED || '').trim().toLowerCase() === 'true';

  if (AUTOREPLY_DISABLED) return NextResponse.json({ skipped: 'feature_disabled' });
  if (!SB_KEY || !SID || !TOKEN || !TWILIO_FROM) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  let payload: { call_log_id?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const callLogId = payload.call_log_id;
  if (!callLogId) return NextResponse.json({ error: 'call_log_id required' }, { status: 400 });

  // Fetch call log + joined lead + rep
  const logs = await sbGet(
    `call_logs?id=eq.${callLogId}&select=id,lead_id,rep_id,outcome,call_type,auto_reply_sent_at,leads(id,phone,business_name,contact_name,sms_opted_out_at),reps(name)`,
    SB_KEY,
  );
  if (!Array.isArray(logs) || logs.length === 0) return NextResponse.json({ error: 'call_log not found' }, { status: 404 });
  const log: any = logs[0];

  // Idempotency check: already sent for this call_log
  if (log.auto_reply_sent_at) {
    return NextResponse.json({ skipped: 'already_sent', auto_reply_status: log.auto_reply_status });
  }

  // Only fire for outbound dead-dials
  if (!ELIGIBLE_OUTCOMES.has(log.outcome)) {
    return NextResponse.json({ skipped: 'outcome_not_eligible', outcome: log.outcome });
  }

  // Skip ai_receptionist / inbound_callback rows (they're not outbound dials)
  if (log.call_type && log.call_type.startsWith('twilio_inbound')) {
    return NextResponse.json({ skipped: 'inbound_call' });
  }

  const lead = log.leads;
  if (!lead) {
    await sbPatch(`call_logs?id=eq.${callLogId}`, SB_KEY, {
      auto_reply_sent_at: new Date().toISOString(),
      auto_reply_status: 'no_lead',
    });
    return NextResponse.json({ skipped: 'no_lead' });
  }

  if (lead.sms_opted_out_at) {
    await sbPatch(`call_logs?id=eq.${callLogId}`, SB_KEY, {
      auto_reply_sent_at: new Date().toISOString(),
      auto_reply_status: 'skipped_opted_out',
    });
    return NextResponse.json({ skipped: 'opted_out' });
  }

  if (!lead.phone) {
    await sbPatch(`call_logs?id=eq.${callLogId}`, SB_KEY, {
      auto_reply_sent_at: new Date().toISOString(),
      auto_reply_status: 'no_phone',
    });
    return NextResponse.json({ skipped: 'no_phone' });
  }

  // Per-lead 24h cooldown: skip if we sent ANY outbound SMS to this lead in the last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await sbGet(
    `sms_messages?lead_id=eq.${lead.id}&direction=eq.outbound&created_at=gte.${since}&select=id&limit=1`,
    SB_KEY,
  );
  if (Array.isArray(recent) && recent.length > 0) {
    await sbPatch(`call_logs?id=eq.${callLogId}`, SB_KEY, {
      auto_reply_sent_at: new Date().toISOString(),
      auto_reply_status: 'skipped_recent',
    });
    return NextResponse.json({ skipped: 'recent_outbound' });
  }

  // Compose the message
  const repFirstName = (log.reps?.name || '').split(' ')[0] || 'us';
  const messageBody = `Hey, ${repFirstName} from Premmisus — just tried you about your business. Text back or call this number anytime. Reply STOP to opt out.`;

  // Normalize phone
  const toDigits = lead.phone.replace(/[^+0-9]/g, '');
  const toFinal = toDigits.startsWith('+') ? toDigits : `+1${toDigits.replace(/^1/, '')}`;

  // Send via Twilio
  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: toFinal, From: TWILIO_FROM, Body: messageBody });
  const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const twData = await twRes.json();

  if (!twRes.ok) {
    await sbPatch(`call_logs?id=eq.${callLogId}`, SB_KEY, {
      auto_reply_sent_at: new Date().toISOString(),
      auto_reply_status: 'failed',
    });
    await sbPost('sms_messages', SB_KEY, {
      lead_id: lead.id,
      rep_id: log.rep_id,
      direction: 'outbound',
      twilio_sid: twData.sid || null,
      from_phone: TWILIO_FROM,
      to_phone: toFinal,
      body: messageBody,
      status: 'failed',
      error_code: twData.code ? String(twData.code) : null,
    });
    return NextResponse.json({ error: twData.message || 'Twilio failed', code: twData.code }, { status: 502 });
  }

  // Mark sent + insert sms_messages row
  await sbPatch(`call_logs?id=eq.${callLogId}`, SB_KEY, {
    auto_reply_sent_at: new Date().toISOString(),
    auto_reply_status: 'sent',
  });
  await sbPost('sms_messages', SB_KEY, {
    lead_id: lead.id,
    rep_id: log.rep_id,
    direction: 'outbound',
    twilio_sid: twData.sid,
    from_phone: TWILIO_FROM,
    to_phone: toFinal,
    body: messageBody,
    status: twData.status || 'queued',
  });

  return NextResponse.json({ success: true, sid: twData.sid, status: twData.status });
}
