// Premmisus Nerve Center — Idle Detection Cron
// Runs hourly 11am-6pm ET (Mon-Fri) — grace period before first check to avoid 9am false positives
// Checks if any rep has been idle for 2+ hours, sends SMS + Telegram
// Must be GET to be callable by Vercel cron (fixed 2026-04-21 after silent 405 failures)

import { NextResponse } from 'next/server';
import { startRun, finishRun } from '@/lib/cron-tracker';
import { torontoDayBoundsUTC } from '@/lib/date';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

async function sbQuery(path: string, sbKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` },
  });
  return res.json();
}

async function sendSMS(body: any): Promise<{ ok: boolean; error?: string }> {
  const BASE = (process.env.BASE_URL || '').trim();
  if (!BASE) return { ok: false, error: 'BASE_URL not configured' };
  try {
    const res = await fetch(`${BASE}/api/notify-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? { ok: true } : { ok: false, error: `notify-sms HTTP ${res.status}` };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendTelegram(body: any): Promise<{ ok: boolean; error?: string }> {
  const BASE = (process.env.BASE_URL || '').trim();
  if (!BASE) return { ok: false, error: 'BASE_URL not configured' };
  try {
    const res = await fetch(`${BASE}/api/notify-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? { ok: true } : { ok: false, error: `notify-telegram HTTP ${res.status}` };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(request: Request) {
  // Required cron auth check
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  if (!SB_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const runId = await startRun('cron-idle-check');

  try {
    const now = new Date();
    // Toronto-day window for the idle dedupe check. Avoids the UTC vs ET drift
    // that hits crons firing late in the ET evening (where UTC has already
    // rolled to the next day).
    const { startUTC, endUTC } = torontoDayBoundsUTC();

    // Get all non-director reps
    const reps = await sbQuery('reps?select=id,name,role&role=eq.rep', SB_KEY);
    if (!Array.isArray(reps) || reps.length === 0) {
      await finishRun(runId, { status: 'success', rowsProcessed: 0, metadata: { reason: 'no_reps_found' } });
      return NextResponse.json({ message: 'No reps found' });
    }

    // Check already-sent notifications today (bounded to Toronto day in UTC)
    const sentToday = await sbQuery(`notifications_log?select=recipient&type=eq.idle&created_at=gte.${startUTC}&created_at=lt.${endUTC}`, SB_KEY);
    const alreadyNotified = new Set((Array.isArray(sentToday) ? sentToday : []).map((n: any) => n.recipient));

    const idleReps: string[] = [];
    const deliveryFailures: string[] = [];

    for (const rep of reps) {
      if (alreadyNotified.has(rep.id)) continue;

      // Get most recent call for this rep
      const logs = await sbQuery(`call_logs?select=created_at&rep_id=eq.${rep.id}&order=created_at.desc&limit=1`, SB_KEY);

      let isIdle = false;
      if (!Array.isArray(logs) || logs.length === 0) {
        isIdle = true; // No calls at all today
      } else {
        const lastCall = new Date(logs[0].created_at);
        const gapMinutes = (now.getTime() - lastCall.getTime()) / (1000 * 60);
        if (gapMinutes > 120) isIdle = true;
      }

      if (isIdle) {
        idleReps.push(rep.name);

        // Send notifications FIRST. Previously the notifications_log row was
        // written before sending — so if SMS/Telegram failed, the dedupe row
        // was already in place and the rep would never be notified that day.
        // Now: only log on at-least-one-channel-success. If both fail, the
        // next idle-check tick will retry.
        const smsOutcome = await sendSMS({ type: 'idle', repName: rep.name });
        const tgOutcome = await sendTelegram({ type: 'idle', repName: rep.name });

        if (!smsOutcome.ok) deliveryFailures.push(`sms:${rep.name}:${smsOutcome.error}`);
        if (!tgOutcome.ok) deliveryFailures.push(`telegram:${rep.name}:${tgOutcome.error}`);

        if (smsOutcome.ok || tgOutcome.ok) {
          await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
            method: 'POST',
            headers: {
              'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'idle',
              recipient: rep.id,
              channel: smsOutcome.ok && tgOutcome.ok ? 'sms+telegram' : (smsOutcome.ok ? 'sms' : 'telegram'),
              message: `${rep.name} idle 2+ hours`,
            }),
          });
        }
      }
    }

    // Status reflects whether every idle rep got at least one channel through.
    // Per-channel failures still surface in metadata.delivery_failures.
    const allChannelsFailed = idleReps.length > 0 && deliveryFailures.length >= idleReps.length * 2;
    await finishRun(runId, {
      status: allChannelsFailed ? 'failure' : 'success',
      rowsProcessed: idleReps.length,
      errorMessage: allChannelsFailed
        ? `All notification channels failed: ${deliveryFailures.slice(0, 3).join('; ')}`
        : undefined,
      metadata: {
        checked: reps.length,
        idle_reps: idleReps,
        delivery_failures: deliveryFailures,
      },
    });
    return NextResponse.json({ checked: reps.length, idle: idleReps, delivery_failures: deliveryFailures.length });

  } catch (err: any) {
    await finishRun(runId, { status: 'failure', errorMessage: err?.message || String(err) });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
