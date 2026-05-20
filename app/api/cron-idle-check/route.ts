// Premmisus Nerve Center — Idle Detection Cron
//
// Two-signal model (locked 2026-05-19 after 5-prong audit):
//
//   TEAM alert  — fires when zero calls across the whole team in the
//                 lookback window, during business hours. Tells Elliott
//                 the phone has gone silent.
//
//   PER-REP alert — fires when a rep HAS called today but went quiet
//                   for >lookback. Tells Elliott which specific rep
//                   stopped dialing mid-session. A rep who has not
//                   started their shift yet is NEVER flagged.
//
// Mutual exclusion: if the team is silent, only the team alert fires
// (per-rep is redundant when nobody dialed). If the team had any
// activity, per-rep checks run for the idle subset.
//
// Concurrency / dedupe: every send goes through the claim_alert_slot
// Postgres RPC, which uses an advisory lock + 90-min cooldown row in
// notifications_log to make double-send impossible across overlapping
// cron invocations.
//
// Business-hours guard runs in code (not just cron schedule) so the
// 6pm boundary tick + any DST drift in the UTC cron schedule cannot
// fire off-hours alerts.

import { NextResponse } from 'next/server';
import { startRun, finishRun } from '@/lib/cron-tracker';
import { torontoDayBoundsUTC } from '@/lib/date';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

const LOOKBACK_MIN = 130;        // 120 min idle + 10 min Supabase write-lag buffer
const COOLDOWN_MIN = 90;
const BUSINESS_START_HOUR = 11;  // ET, inclusive
const BUSINESS_END_HOUR = 18;    // ET, exclusive — no alerts at the 6pm tick
const TEAM_ALERT_EARLIEST_HOUR = 13; // 2h after business hours start

type Rep = { id: string; name: string; role: string };
type CallRow = { rep_id: string; created_at: string };

async function sbQuery<T>(path: string, sbKey: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` },
  });
  return res.json() as Promise<T>;
}

// Returns the inserted row id (uuid as string) on successful claim, or null
// when the cooldown window blocks the claim. The id lets the caller patch
// the exact row with the delivery channel after sends complete — PostgREST
// ignores order/limit on PATCH, so id-based targeting is the only way to
// avoid mass-updating every historical row for this (type, recipient).
async function claimSlot(
  type: string,
  recipient: string,
  message: string,
  sbKey: string,
): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_alert_slot`, {
    method: 'POST',
    headers: {
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_type: type,
      p_recipient: recipient,
      p_cooldown_minutes: COOLDOWN_MIN,
      p_message: message,
    }),
  });
  if (!res.ok) return null;
  const id = await res.json();
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function recordChannel(
  rowId: string,
  channel: string,
  sbKey: string,
): Promise<void> {
  // Best-effort — failure to record does not affect cooldown correctness.
  await fetch(
    `${SUPABASE_URL}/rest/v1/notifications_log?id=eq.${encodeURIComponent(rowId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ channel }),
    },
  ).catch(() => undefined);
}

async function sendSMS(body: unknown): Promise<boolean> {
  const BASE = (process.env.BASE_URL || '').trim();
  if (!BASE) return false;
  try {
    const res = await fetch(`${BASE}/api/notify-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendTelegram(body: unknown): Promise<boolean> {
  const BASE = (process.env.BASE_URL || '').trim();
  if (!BASE) return false;
  try {
    const res = await fetch(`${BASE}/api/notify-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function torontoParts(now: Date): { hour: number; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const hourStr = parts.find(p => p.type === 'hour')?.value || '0';
  // Intl returns "24" for midnight in hour12:false on some runtimes — normalize.
  const hourNum = Number(hourStr);
  const hour = hourNum === 24 ? 0 : hourNum;
  return { hour, weekday };
}

function isBusinessHours(now: Date): boolean {
  const { hour, weekday } = torontoParts(now);
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
  return isWeekday && hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
}

export async function GET(request: Request) {
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

    if (!isBusinessHours(now)) {
      await finishRun(runId, {
        status: 'success',
        rowsProcessed: 0,
        metadata: { reason: 'outside_business_hours' },
      });
      return NextResponse.json({ skipped: 'outside_business_hours' });
    }

    const { hour: torontoHour } = torontoParts(now);
    const { startUTC } = torontoDayBoundsUTC();
    const cutoffMs = now.getTime() - LOOKBACK_MIN * 60 * 1000;
    const cutoff = new Date(cutoffMs);

    const reps = await sbQuery<Rep[]>(
      'reps?select=id,name,role&role=eq.rep',
      SB_KEY,
    );
    if (!Array.isArray(reps) || reps.length === 0) {
      await finishRun(runId, { status: 'success', rowsProcessed: 0, metadata: { reason: 'no_reps' } });
      return NextResponse.json({ message: 'No reps' });
    }

    // Single query: every call from any rep since Toronto-day start.
    const todayCalls = await sbQuery<CallRow[]>(
      `call_logs?select=rep_id,created_at&created_at=gte.${startUTC}&order=created_at.desc`,
      SB_KEY,
    );
    const calls = Array.isArray(todayCalls) ? todayCalls : [];

    const lastCallByRep = new Map<string, Date>();
    for (const c of calls) {
      if (!lastCallByRep.has(c.rep_id)) {
        lastCallByRep.set(c.rep_id, new Date(c.created_at));
      }
    }

    const mostRecentTeamCall = calls.length > 0 ? new Date(calls[0].created_at) : null;
    const teamSilent = mostRecentTeamCall === null || mostRecentTeamCall < cutoff;
    const canFireTeamAlert = torontoHour >= TEAM_ALERT_EARLIEST_HOUR;

    // Mutual exclusion: team alert fires first. If it fires, per-rep is skipped.
    if (teamSilent && canFireTeamAlert) {
      const message = 'team idle: zero calls in 2h';
      const claimedRowId = await claimSlot('idle_team', 'team', message, SB_KEY);
      if (claimedRowId) {
        const smsOk = await sendSMS({ type: 'idle_team' });
        const tgOk = await sendTelegram({ type: 'idle_team' });
        const channel = smsOk && tgOk ? 'sms+telegram' : smsOk ? 'sms' : tgOk ? 'telegram' : 'failed';
        await recordChannel(claimedRowId, channel, SB_KEY);

        await finishRun(runId, {
          status: smsOk || tgOk ? 'success' : 'failure',
          rowsProcessed: 1,
          errorMessage: smsOk || tgOk ? undefined : 'All channels failed for team alert',
          metadata: {
            mode: 'team_alert',
            sms_ok: smsOk,
            telegram_ok: tgOk,
            most_recent_team_call: mostRecentTeamCall?.toISOString() || null,
          },
        });
        return NextResponse.json({ mode: 'team_alert', sent: smsOk || tgOk });
      }
      // Cooldown active — another invocation already alerted. Fall through and skip per-rep too.
      await finishRun(runId, {
        status: 'success',
        rowsProcessed: 0,
        metadata: { mode: 'team_alert_cooldown', reason: 'team_silent_but_cooldown_active' },
      });
      return NextResponse.json({ mode: 'team_alert_cooldown' });
    }

    // Per-rep path: only when team has had activity. Rep is idle if they
    // called today AND their last call is older than the lookback window.
    const idleReps: Rep[] = [];
    for (const rep of reps) {
      const last = lastCallByRep.get(rep.id);
      if (last && last < cutoff) idleReps.push(rep);
    }

    const sent: string[] = [];
    const skippedCooldown: string[] = [];
    const failures: string[] = [];

    for (const rep of idleReps) {
      const claimedRowId = await claimSlot('idle', rep.id, `${rep.name} idle 2+ hours`, SB_KEY);
      if (!claimedRowId) {
        skippedCooldown.push(rep.name);
        continue;
      }
      const smsOk = await sendSMS({ type: 'idle', repName: rep.name });
      const tgOk = await sendTelegram({ type: 'idle', repName: rep.name });
      const channel = smsOk && tgOk ? 'sms+telegram' : smsOk ? 'sms' : tgOk ? 'telegram' : 'failed';
      await recordChannel(claimedRowId, channel, SB_KEY);
      if (smsOk || tgOk) sent.push(rep.name);
      else failures.push(rep.name);
    }

    await finishRun(runId, {
      status: failures.length > 0 && sent.length === 0 ? 'failure' : 'success',
      rowsProcessed: sent.length,
      errorMessage: failures.length > 0 && sent.length === 0
        ? `All channels failed for: ${failures.join(', ')}`
        : undefined,
      metadata: {
        mode: teamSilent ? 'team_silent_below_earliest_hour' : 'per_rep',
        team_silent: teamSilent,
        toronto_hour: torontoHour,
        reps_checked: reps.length,
        sent,
        skipped_cooldown: skippedCooldown,
        failures,
      },
    });

    return NextResponse.json({
      mode: 'per_rep',
      sent,
      skipped_cooldown: skippedCooldown,
      failures,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishRun(runId, { status: 'failure', errorMessage: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
