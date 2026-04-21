// Premmisus Sales Portal — Cron Watchdog
// Reads the cron_runs table. For each expected scheduled job, checks the last
// successful run. If a job hasn't run within its expected window, sends an SMS
// alert directly to Elliott's business alert line (+12509867747) via Twilio.
//
// Schedule in vercel.json: weekdays at 13/16/19/22 UTC (9a/12p/3p/6p ET).
// Also logs its own execution to cron_runs via the tracker helper.

import { NextResponse } from 'next/server';
import { startRun, finishRun } from '@/lib/cron-tracker';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

const JOBS = [
  { name: 'cron-health-check',     kind: 'daily_all_days',   schedule: 'daily 12 UTC' },
  { name: 'cron-idle-check',       kind: 'hourly_weekday',   schedule: 'hourly 15-22 UTC M-F' },
  { name: 'cron-daily-summary',    kind: 'daily_weekday',    schedule: 'daily 23 UTC M-F' },
  { name: 'cron-callback-reminder',kind: 'daily_weekday',    schedule: 'daily 14 UTC M-F' },
];

async function sbQuery(path: string, sbKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function sendAlertSMS(body: string) {
  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const FROM = process.env.TWILIO_PHONE_NUMBER || '';
  const TO = (process.env.ELLIOTT_PHONE || '').trim();
  if (!SID || !TOKEN || !FROM || !TO) return { ok: false, reason: 'twilio_not_configured' };

  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: TO, From: FROM, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, sid: data.sid, error: data.message };
}

type CheckResult = { job: string; alert: boolean; detail: string; lastSuccessAt: string | null };

function shouldAlert(kind: string, lastSuccess: Date | null, now: Date): { alert: boolean; detail: string } {
  const dayUTC = now.getUTCDay(); // 0=Sun, 6=Sat
  const hourUTC = now.getUTCHours();
  const isWeekend = dayUTC === 0 || dayUTC === 6;

  if (!lastSuccess) {
    // First-ever check — skip alerting (grace period). cron_runs is empty until first successful run.
    return { alert: false, detail: 'No prior run recorded — grace period' };
  }

  const hoursAgo = (now.getTime() - lastSuccess.getTime()) / (1000 * 60 * 60);

  if (kind === 'daily_all_days') {
    return { alert: hoursAgo > 26, detail: `Last success ${hoursAgo.toFixed(1)}h ago (expected ~24h)` };
  }
  if (kind === 'hourly_weekday') {
    if (isWeekend) return { alert: false, detail: 'Weekend — not expected to run' };
    if (hourUTC < 15 || hourUTC > 23) return { alert: false, detail: 'Outside business hours — not expected' };
    return { alert: hoursAgo > 3, detail: `Last success ${hoursAgo.toFixed(1)}h ago (expected hourly)` };
  }
  if (kind === 'daily_weekday') {
    if (isWeekend) return { alert: false, detail: 'Weekend — not expected' };
    // Tolerance: allow up to 3 business days (handles long weekends / cold-start Monday).
    return { alert: hoursAgo > 76, detail: `Last success ${hoursAgo.toFixed(1)}h ago` };
  }
  return { alert: false, detail: 'Unknown kind' };
}

export async function GET(request: Request) {
  // Cron auth
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  if (!SB_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const runId = await startRun('cron-watchdog');
  const now = new Date();

  try {
    const checks: CheckResult[] = [];

    for (const job of JOBS) {
      const rows = await sbQuery(
        `cron_runs?select=started_at&job_name=eq.${job.name}&status=eq.success&order=started_at.desc&limit=1`,
        SB_KEY,
      );
      const last = Array.isArray(rows) && rows[0]?.started_at ? new Date(rows[0].started_at) : null;
      const decision = shouldAlert(job.kind, last, now);
      checks.push({
        job: job.name,
        alert: decision.alert,
        detail: decision.detail,
        lastSuccessAt: last ? last.toISOString() : null,
      });
    }

    // Also flag runs stuck in "running" for > 30 min (crashed mid-execution)
    const stuckCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const stuckRows = await sbQuery(
      `cron_runs?select=job_name,started_at&status=eq.running&started_at=lt.${stuckCutoff}&order=started_at.desc&limit=10`,
      SB_KEY,
    );
    const stuck: string[] = Array.isArray(stuckRows)
      ? stuckRows.map((r: any) => `${r.job_name} (started ${r.started_at})`)
      : [];

    const alertingJobs = checks.filter((c) => c.alert);
    const shouldSendAlert = alertingJobs.length > 0 || stuck.length > 0;

    let smsResult: any = null;
    if (shouldSendAlert) {
      const lines = [
        `[Premmisus] CRON ALERT`,
        ...alertingJobs.map((c) => `• ${c.job}: ${c.detail}`),
        ...stuck.map((s) => `• STUCK: ${s}`),
        `Check portal.premmisus.ca or Vercel logs.`,
      ];
      smsResult = await sendAlertSMS(lines.join('\n'));
    }

    await finishRun(runId, {
      status: 'success',
      rowsProcessed: checks.length,
      metadata: {
        alerting: alertingJobs.length,
        stuck: stuck.length,
        sms_sent: !!smsResult?.ok,
        sms_sid: smsResult?.sid || null,
      },
    });

    return NextResponse.json({
      ok: true,
      checked_jobs: checks.length,
      alerting: alertingJobs,
      stuck,
      all_checks: checks,
      sms_sent: !!smsResult?.ok,
    });
  } catch (err: any) {
    await finishRun(runId, { status: 'failure', errorMessage: err?.message || String(err) });
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
