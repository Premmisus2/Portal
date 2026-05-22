// /api/cron/drain-notifications — Slice 2 worker.
//
// Runs every 1 minute (vercel.json). Drains notifications_queue: for each
// pending row whose send_at_utc has elapsed, atomically claim it (UPDATE
// WHERE status='pending' RETURNING — only one worker wins) then fire the
// Twilio SMS to the rep.
//
// Locked safety patterns from 2026-05-20 4-prong audit:
//   * Promise.allSettled per batch — one row's failure never kills the loop
//     (Gemini load-bearing catch).
//   * Re-verify callback_tasks.status='scheduled' before firing — prevents
//     reschedule-race where a cancelled callback's reminder still goes out
//     (Perplexity load-bearing catch).
//   * Atomic UPDATE...WHERE status='pending' RETURNING for the claim — no
//     two workers can both send for the same row (Perplexity + Grok catch).
//   * retry_count + next_attempt_at + dead_letter after 3 failures.
//
// Auth: CRON_SECRET bearer (Vercel cron supplies this header).

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';
const MAX_RETRIES = 3;
const BACKOFF_MINUTES = [5, 30, 120]; // 5m, 30m, 2h between retries.
const BATCH_LIMIT = 50;

interface QueueRow {
  id: string;
  callback_task_id: string;
  rep_id: string;
  type: 'callback_60min' | 'callback_30min' | 'callback_10min' | 'callback_director_cc';
  send_at_utc: string;
  retry_count: number;
}

interface CallbackTaskRow {
  id: string;
  lead_id: string;
  status: string;
  scheduled_at_utc: string;
  scheduled_local_time: string;
  scheduled_tz: string;
}

interface LeadRow {
  business_name: string;
  contact_name: string | null;
}

interface RepRow {
  id: string;
  name: string;
  phone: string | null;
}

async function sbFetch<T>(path: string, sbKey: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function smsBody(
  type: QueueRow['type'],
  repFirstName: string,
  contact: string,
  business: string,
  leadId: string,
): string {
  const link = `https://portal.premmisus.ca/floor?lead=${leadId}`;
  const who = contact || business || 'this lead';
  switch (type) {
    case 'callback_60min':
      return `⏱ Callback in 60 min — ${who} (${business}). Open: ${link}`;
    case 'callback_30min':
      return `⏱ Callback in 30 min — ${who} (${business}). Open: ${link}`;
    case 'callback_10min':
      return `🔔 Callback in 10 MIN — ${who} (${business}). Open: ${link}`;
    case 'callback_director_cc':
      return `[CC] ${repFirstName} has a callback in 30 min — ${who} (${business}). ${link}`;
  }
}

async function sendTwilio(
  to: string,
  body: string,
  sid: string,
  token: string,
  from: string,
): Promise<{ ok: boolean; sid?: string; status?: string; errorCode?: string; errorMessage?: string }> {
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, errorCode: String(data.code ?? res.status), errorMessage: data.message || `HTTP ${res.status}` };
  }
  return { ok: true, sid: data.sid, status: data.status };
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const CRON_SECRET = process.env.CRON_SECRET || '';
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const TW_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const TW_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const TW_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const ELLIOTT_PHONE = (process.env.ELLIOTT_PHONE || '').trim();

  // Auth — Vercel cron sends "Authorization: Bearer <CRON_SECRET>".
  if (CRON_SECRET) {
    const hdr = request.headers.get('authorization') || '';
    if (hdr !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!SB_KEY || !TW_SID || !TW_TOKEN || !TW_FROM) {
    return NextResponse.json({ error: 'missing env vars' }, { status: 500 });
  }

  // 1. Pull due pending rows. Worker pre-claims via the atomic UPDATE step.
  const dueRows = await sbFetch<QueueRow[]>(
    `notifications_queue?select=id,callback_task_id,rep_id,type,send_at_utc,retry_count&status=eq.pending&send_at_utc=lte.${new Date().toISOString()}&order=send_at_utc.asc&limit=${BATCH_LIMIT}`,
    SB_KEY,
  );

  if (!dueRows || dueRows.length === 0) {
    return NextResponse.json({ drained: 0 });
  }

  // 2. Process each row with Promise.allSettled — one failure never kills the batch.
  const results = await Promise.allSettled(
    dueRows.map((row) => processRow(row, SB_KEY, TW_SID, TW_TOKEN, TW_FROM, ELLIOTT_PHONE)),
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && (r.value as { sent: boolean }).sent).length;
  const failed = results.length - sent;

  // Surface batch summary to Vercel runtime logs for ops visibility.
  console.log(`[drain-notifications] drained=${results.length} sent=${sent} failed=${failed}`);

  // Log any rejected promises (processRow itself threw, not a Twilio failure
  // which gets caught inside). These represent unexpected bugs to investigate.
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[drain-notifications] row ${dueRows[i]?.id} threw:`, r.reason);
    }
  });

  return NextResponse.json({ drained: results.length, sent, failed });
}

async function processRow(
  row: QueueRow,
  sbKey: string,
  twSid: string,
  twToken: string,
  twFrom: string,
  elliottPhone: string,
): Promise<{ sent: boolean }> {
  // 1. Atomic claim — flip status pending → 'sent' optimistically. If another
  //    worker already claimed it, PATCH returns 0 rows and we skip.
  const claimRes = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications_queue?id=eq.${row.id}&status=eq.pending`,
    {
      method: 'PATCH',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
    },
  );
  if (!claimRes.ok) return { sent: false };
  const claimed = (await claimRes.json()) as unknown[];
  if (!Array.isArray(claimed) || claimed.length === 0) return { sent: false };

  // 2. Re-verify callback_tasks is still scheduled. Reschedule-race defense:
  //    rep may have cancelled or rescheduled while this row was pending.
  const tasks = await sbFetch<CallbackTaskRow[]>(
    `callback_tasks?select=id,lead_id,status,scheduled_at_utc,scheduled_local_time,scheduled_tz&id=eq.${row.callback_task_id}&limit=1`,
    sbKey,
  );
  const task = tasks?.[0];
  if (!task || task.status !== 'scheduled') {
    // Revert our optimistic claim — it should have been 'cancelled', not 'sent'.
    await fetch(`${SUPABASE_URL}/rest/v1/notifications_queue?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', sent_at: null }),
    });
    return { sent: false };
  }

  // 3. Look up rep + lead for SMS body + dest phone.
  const [reps, leads] = await Promise.all([
    sbFetch<RepRow[]>(`reps?select=id,name,phone&id=eq.${row.rep_id}&limit=1`, sbKey),
    sbFetch<LeadRow[]>(`leads?select=business_name,contact_name&id=eq.${task.lead_id}&limit=1`, sbKey),
  ]);
  const rep = reps?.[0];
  const lead = leads?.[0];

  // Destination depends on type. The director-CC row goes to ELLIOTT_PHONE.
  let dest: string | undefined;
  if (row.type === 'callback_director_cc') {
    dest = elliottPhone || undefined;
  } else {
    dest = rep?.phone || undefined;
  }

  if (!dest || !lead || !rep) {
    // Missing critical context — mark failed with retry.
    await markFailed(row, sbKey, 'missing rep phone or lead', false);
    return { sent: false };
  }

  // 4. Fire Twilio.
  const repFirst = (rep.name || '').split(/\s+/)[0] || 'Rep';
  const contact = lead.contact_name || '';
  const business = lead.business_name || '';
  const body = smsBody(row.type, repFirst, contact, business, task.lead_id);

  const twRes = await sendTwilio(dest, body, twSid, twToken, twFrom);

  if (!twRes.ok) {
    // Revert + mark failed with retry logic.
    await markFailed(row, sbKey, `${twRes.errorCode}: ${twRes.errorMessage}`, true);
    return { sent: false };
  }

  // 5. Success — patch in the twilio_sid (status is already 'sent' from the claim).
  await fetch(`${SUPABASE_URL}/rest/v1/notifications_queue?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ twilio_sid: twRes.sid }),
  });

  return { sent: true };
}

async function markFailed(row: QueueRow, sbKey: string, errMsg: string, shouldRetry: boolean): Promise<void> {
  const nextRetry = row.retry_count + 1;
  const willRetry = shouldRetry && nextRetry < MAX_RETRIES;
  const backoffMin = BACKOFF_MINUTES[Math.min(nextRetry, BACKOFF_MINUTES.length - 1)];
  const nextAttempt = willRetry ? new Date(Date.now() + backoffMin * 60_000).toISOString() : null;

  await fetch(`${SUPABASE_URL}/rest/v1/notifications_queue?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: willRetry ? 'pending' : 'dead_letter',
      sent_at: null,
      twilio_sid: null,
      retry_count: nextRetry,
      next_attempt_at: nextAttempt,
      error: errMsg.slice(0, 500),
      // If retrying, push send_at_utc forward by the backoff so the next pass picks it up.
      ...(willRetry ? { send_at_utc: nextAttempt } : {}),
    }),
  });
}
