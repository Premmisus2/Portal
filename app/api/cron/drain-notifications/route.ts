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
import { withCaslFooter } from '@/lib/sms-compliance';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';
const MAX_RETRIES = 3;
const BACKOFF_MINUTES = [5, 30, 120]; // 5m, 30m, 2h between retries.
const BATCH_LIMIT = 50;

interface QueueRow {
  id: string;
  callback_task_id: string;
  rep_id: string;
  type: 'callback_60min' | 'callback_30min' | 'callback_10min' | 'callback_director_cc' | 'callback_confirm_to_lead';
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
  phone: string | null;
  sms_opted_out_at: string | null;
}

interface RepRow {
  id: string;
  name: string;
  phone: string | null;
}

// FIX (post-ship audit 2026-05-21): distinguish "row not found" from "fetch
// failed." Previously this swallowed ALL non-2xx as null, which meant a
// transient Supabase 503 caused the caller to think the row didn't exist
// and incorrectly revert valid claims. Now: 4xx returns null (genuinely
// not-found); 5xx + network errors throw so the caller can decide.
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
  if (res.status >= 500) {
    throw new Error(`Supabase ${res.status} on ${path.slice(0, 60)}`);
  }
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function smsBody(
  type: QueueRow['type'],
  repFirstName: string,
  contact: string,
  business: string,
  leadId: string,
  scheduledLocal?: string,
  scheduledTz?: string,
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
    case 'callback_confirm_to_lead': {
      // CASL Section 6 footer auto-appended by withCaslFooter() at send time.
      // Body kept tight to fit in one segment (160 chars incl. footer).
      const firstName = (contact || '').split(/\s+/)[0] || 'there';
      const when = scheduledLocal && scheduledTz ? ` at ${scheduledLocal} (${scheduledTz})` : '';
      return `Hi ${firstName}, this is ${repFirstName} from Premmisus — your callback is confirmed${when}. Talk soon.`;
    }
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

  // FIX (post-ship audit 2026-05-21): CRON_SECRET is now HARD-REQUIRED.
  // Previously `if (CRON_SECRET)` made the auth check skip if env var was
  // empty or missing — the endpoint became publicly invokable. Now: if
  // CRON_SECRET isn't set, the route refuses to run (500). If set, Bearer
  // token comparison is mandatory.
  if (!CRON_SECRET) {
    console.error('[drain-notifications] CRON_SECRET env var not set — refusing to run');
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const hdr = request.headers.get('authorization') || '';
  if (hdr !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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

// E.164 validation — FIX (post-ship audit): bad To numbers cost Twilio
// money on every failed retry. Reject anything that doesn't look like a
// valid E.164 number BEFORE firing the API.
function isValidE164(p: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(p);
}

// FIX (post-ship audit): truncate user-controlled strings before SMS
// interpolation. Long business names balloon SMS into multi-segment messages
// (7x cost on a 1KB business name). 40 chars each is enough for context.
function truncate(s: string, max = 40): string {
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
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

  // FIX (post-ship audit 2026-05-21): wrap the entire post-claim body in
  // try/catch. Previously, ANY thrown error after the claim (DNS failure,
  // Supabase 5xx, JSON parse, anything) left the row stuck in 'sent' state
  // forever with no SMS actually fired — bypassing the entire retry chain.
  // Now: any throw reverts the row back to 'pending' so the next pass picks
  // it up, OR escalates to dead_letter if we've already burned retries.
  try {
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
      sbFetch<LeadRow[]>(`leads?select=business_name,contact_name,phone,sms_opted_out_at&id=eq.${task.lead_id}&limit=1`, sbKey),
    ]);
    const rep = reps?.[0];
    const lead = leads?.[0];

    // Destination + opt-out gate depend on type.
    //   - rep-targeting (callback_60/30/10min): dest is rep.phone, no gate.
    //   - director CC: dest is ELLIOTT_PHONE, no gate.
    //   - LEAD-targeting (callback_confirm_to_lead): dest is lead.phone, gate
    //     on lead.sms_opted_out_at (CASL hard-block, audit consensus).
    let dest: string | undefined;
    if (row.type === 'callback_director_cc') {
      dest = elliottPhone || undefined;
    } else if (row.type === 'callback_confirm_to_lead') {
      // CASL gate — skip silently if lead opted out. Mark sent so we don't retry.
      if (!lead) {
        await markFailed(row, sbKey, 'lead not found for confirm SMS', false);
        return { sent: false };
      }
      if (lead.sms_opted_out_at) {
        await fetch(`${SUPABASE_URL}/rest/v1/notifications_queue?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', error: 'lead opted out (CASL gate)' }),
        });
        return { sent: false };
      }
      // Normalize lead phone to E.164 — leads.phone format varies, scraper output.
      const raw = (lead.phone || '').replace(/[^+0-9]/g, '');
      dest = raw.startsWith('+') ? raw : `+1${raw.replace(/^1/, '')}`;
    } else {
      dest = rep?.phone || undefined;
    }

    if (!dest || !lead || !rep) {
      await markFailed(row, sbKey, 'missing dest phone or lead', false);
      return { sent: false };
    }

    if (!isValidE164(dest)) {
      await markFailed(row, sbKey, `invalid E.164 phone: ${dest.slice(0, 20)}`, false);
      return { sent: false };
    }

    // 4. Fire Twilio.
    const repFirst = (rep.name || '').split(/\s+/)[0] || 'Rep';
    const contact = truncate(lead.contact_name || '');
    const business = truncate(lead.business_name || '');
    const rawBody = smsBody(
      row.type,
      repFirst,
      contact,
      business,
      task.lead_id,
      task.scheduled_local_time,
      task.scheduled_tz,
    );
    // CASL footer (sender + STOP) ONLY on lead-targeting messages. Rep-/director-
    // facing reminders don't need it.
    const body = row.type === 'callback_confirm_to_lead' ? withCaslFooter(rawBody) : rawBody;

    const twRes = await sendTwilio(dest, body, twSid, twToken, twFrom);

    if (!twRes.ok) {
      // Twilio said no — mark failed with retry logic.
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
  } catch (err) {
    // Anything threw after claim. Revert to a recoverable state so the
    // next cron pass can try again (or dead-letter via markFailed's retry logic).
    console.error(`[drain-notifications] row ${row.id} threw after claim:`, (err as Error).message);
    try {
      await markFailed(row, sbKey, `post-claim throw: ${(err as Error).message}`.slice(0, 480), true);
    } catch (recoverErr) {
      console.error(`[drain-notifications] row ${row.id} recovery also threw:`, (recoverErr as Error).message);
    }
    return { sent: false };
  }
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
