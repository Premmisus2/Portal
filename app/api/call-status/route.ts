// Premmisus Dialer — Call Status Webhook
// Receives Twilio status callbacks as call progresses
// Updates call_logs with duration and status
//
// Hardening (2026-05-01, #twilio-webhook-hardening):
// - Was: bare try/catch swallowed errors; PATCH response never checked
// - Now: every Supabase/Twilio failure surfaces to Telegram via reportServerError
// - Twilio still gets 200 on every request (Twilio expects 200 to mark webhook
//   delivered; failing here triggers Twilio retries which compound the problem)

import { reportServerError } from '@/lib/server-error';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  if (!SB_KEY) {
    await reportServerError(
      'call-status.env',
      'SUPABASE_SERVICE_KEY missing — call_logs will not update',
      undefined,
      'twilio-webhook-hardening',
    );
    return new Response('OK', { status: 200 });
  }

  // Twilio sends form-encoded data
  let callSid = '';
  let callStatus = '';
  let callDuration = '';
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    callSid = params.get('CallSid') || params.get('callSid') || '';
    callStatus = params.get('CallStatus') || params.get('callStatus') || '';
    callDuration = params.get('CallDuration') || params.get('callDuration') || '';
  } catch (parseErr) {
    await reportServerError('call-status.parseBody', parseErr, undefined, 'twilio-webhook-hardening');
    return new Response('OK', { status: 200 });
  }

  if (!callSid) {
    // Twilio occasionally sends test/dummy callbacks without a SID. Don't alert
    // on this — it's normal noise.
    return new Response('OK', { status: 200 });
  }

  const updates: Record<string, any> = { twilio_status: callStatus };
  if (callDuration) {
    const parsed = parseInt(callDuration, 10);
    if (!Number.isNaN(parsed)) updates.duration_seconds = parsed;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${encodeURIComponent(callSid)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      await reportServerError(
        'call-status.supabasePatch',
        `Supabase PATCH returned ${res.status}: ${body.slice(0, 200)}`,
        { call_sid: callSid, twilio_status: callStatus, duration_seconds: updates.duration_seconds ?? null },
        'twilio-webhook-hardening',
      );
    }
  } catch (err) {
    await reportServerError(
      'call-status.supabasePatch',
      err,
      { call_sid: callSid, twilio_status: callStatus },
      'twilio-webhook-hardening',
    );
  }

  // Twilio expects 200 regardless of internal failure to avoid retry storms.
  return new Response('OK', { status: 200 });
}
