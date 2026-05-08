// Premmisus Sales Portal — Cron Watchdog
// Reads cron_runs and the n8n API to detect silent cron failures across the
// Premmisus monitoring stack. Sends SMS alerts via Twilio with deduplication
// and 24h escalation so a single stuck cron does not produce 30 SMSes.
//
// Schedule (vercel.json): weekdays at 13/16/19/22 UTC.
// Logs its own execution to cron_runs via the tracker helper.

import { NextResponse } from 'next/server';
import { startRun, finishRun } from '@/lib/cron-tracker';
import {
  shouldSendAlert,
  recordAlert,
  resolveAlertsForHealthyJobs,
  type AlertReason,
} from '@/lib/cron-alerts';
import {
  checkMonitoredN8nWorkflows,
  type N8nExecutionCheck,
} from '@/lib/n8n-client';
import { reportServerError } from '@/lib/server-error';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

type VercelJob = {
  name: string;
  kind: 'daily_all_days' | 'hourly_weekday' | 'daily_weekday';
  schedule: string;
};

const VERCEL_JOBS: VercelJob[] = [
  { name: 'cron-health-check',     kind: 'daily_all_days',  schedule: 'daily 12 UTC' },
  { name: 'cron-idle-check',       kind: 'hourly_weekday',  schedule: 'hourly 15-22 UTC M-F' },
  { name: 'cron-daily-summary',    kind: 'daily_weekday',   schedule: 'daily 23 UTC M-F' },
  { name: 'cron-callback-reminder',kind: 'daily_weekday',   schedule: 'daily 14 UTC M-F' },
];

type CheckResult = {
  job: string;
  alert: boolean;
  detail: string;
  reason: AlertReason;
  lastSuccessAt: string | null;
};

async function sbQuery(path: string): Promise<unknown[]> {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function sendAlertSMS(body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const FROM = process.env.TWILIO_PHONE_NUMBER || '';
  const TO = (process.env.ELLIOTT_PHONE || '').trim();
  if (!SID || !TOKEN || !FROM || !TO) return { ok: false, error: 'twilio_not_configured' };

  const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: TO, From: FROM, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  return { ok: res.ok, sid: data.sid, error: data.message };
}

function shouldAlertForJob(
  kind: VercelJob['kind'],
  lastSuccess: Date | null,
  now: Date,
): { alert: boolean; detail: string } {
  const dayUTC = now.getUTCDay();
  const hourUTC = now.getUTCHours();
  const isWeekend = dayUTC === 0 || dayUTC === 6;

  if (!lastSuccess) {
    return { alert: false, detail: 'No prior run recorded — grace period' };
  }
  const hoursAgo = (now.getTime() - lastSuccess.getTime()) / 3_600_000;

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
    return { alert: hoursAgo > 76, detail: `Last success ${hoursAgo.toFixed(1)}h ago` };
  }
  return { alert: false, detail: 'Unknown kind' };
}

export async function GET(request: Request) {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  if (!SB_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const runId = await startRun('cron-watchdog');
  const now = new Date();

  try {
    // ── Detect Vercel cron staleness ─────────────────────────────────────────
    const checks: CheckResult[] = [];
    for (const job of VERCEL_JOBS) {
      const rows = await sbQuery(
        `cron_runs?select=started_at&job_name=eq.${job.name}&status=eq.success&order=started_at.desc&limit=1`,
      ) as Array<{ started_at: string }>;
      const last = rows[0]?.started_at ? new Date(rows[0].started_at) : null;
      const decision = shouldAlertForJob(job.kind, last, now);
      checks.push({
        job: job.name,
        alert: decision.alert,
        detail: decision.detail,
        reason: 'no_recent_success',
        lastSuccessAt: last ? last.toISOString() : null,
      });
    }

    // ── Detect stuck (running > 30min) rows ──────────────────────────────────
    const stuckCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const stuckRows = await sbQuery(
      `cron_runs?select=job_name,started_at&status=eq.running&started_at=lt.${stuckCutoff}&order=started_at.desc&limit=10`,
    ) as Array<{ job_name: string; started_at: string }>;

    // ── Detect stuck Twilio call_logs (twilio_status='initiated' >5min) ─────
    // Catches the failure mode where Twilio fires the call but the StatusCallback
    // never lands (TwiML 405, webhook outage, network blip). Without this,
    // call_logs rows stay at 'initiated' forever and we never know.
    // Marks each stuck row as failed and fires a Telegram alert via reportServerError.
    const stuckCallCutoff = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const stuckCalls = await sbQuery(
      `call_logs?select=id,call_sid,business_name,created_at,rep_id&twilio_status=eq.initiated&created_at=lt.${encodeURIComponent(stuckCallCutoff)}&order=created_at.desc&limit=50`,
    ) as Array<{ id: string; call_sid: string | null; business_name: string | null; created_at: string; rep_id: string | null }>;

    if (stuckCalls.length > 0) {
      const sbKey = process.env.SUPABASE_SERVICE_KEY || '';
      const ids = stuckCalls.map((c) => c.id);
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/call_logs?id=in.(${ids.join(',')})`, {
          method: 'PATCH',
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ twilio_status: 'failed', notes: 'Auto-failed by watchdog: Twilio StatusCallback never landed (>5min stuck at initiated)' }),
        });
      } catch (err) {
        await reportServerError(
          'cron-watchdog.markStuckCallsFailed',
          err,
          { count: stuckCalls.length, sample_ids: ids.slice(0, 3).join(',') },
          'stuck-call-watchdog',
        );
      }
      const sample = stuckCalls.slice(0, 5).map((c) => `${c.business_name ?? 'Unknown'} (${c.call_sid ?? 'no-sid'})`).join('; ');
      await reportServerError(
        'cron-watchdog.stuckTwilioCalls',
        `${stuckCalls.length} call_log(s) stuck at twilio_status='initiated' for >5min — auto-marked failed. Sample: ${sample}`,
        { count: stuckCalls.length, oldest: stuckCalls[stuckCalls.length - 1]?.created_at ?? '' },
        'stuck-call-watchdog',
      );
    }

    // ── n8n coverage ─────────────────────────────────────────────────────────
    const n8nChecks: N8nExecutionCheck[] = await checkMonitoredN8nWorkflows(now);
    // n8n now reports three independent failure modes. Each maps to a distinct
    // alert reason so dedupe can track them separately (a workflow that goes
    // from overdue → errored should re-alert).
    const n8nOverdue = n8nChecks.filter((c) => c.overdue && !c.errored && !c.stuck);
    const n8nErrored = n8nChecks.filter((c) => c.errored);
    const n8nStuck = n8nChecks.filter((c) => c.stuck);

    // ── Decide what (if anything) to alert ───────────────────────────────────
    const alertingJobs = checks.filter((c) => c.alert);

    type Pending = { jobName: string; reason: AlertReason; line: string };
    const pending: Pending[] = [];

    for (const c of alertingJobs) {
      pending.push({ jobName: c.job, reason: 'no_recent_success', line: `• ${c.job}: ${c.detail}` });
    }
    for (const s of stuckRows) {
      pending.push({
        jobName: s.job_name,
        reason: 'stuck_running',
        line: `• STUCK: ${s.job_name} (started ${s.started_at})`,
      });
    }
    for (const c of n8nOverdue) {
      pending.push({
        jobName: `n8n:${c.spec.id}`,
        reason: 'n8n_overdue',
        line: `• ${c.spec.name}: ${c.detail}`,
      });
    }
    for (const c of n8nErrored) {
      pending.push({
        jobName: `n8n:${c.spec.id}`,
        reason: 'n8n_errored',
        line: `• ${c.spec.name}: ${c.detail}`,
      });
    }
    for (const c of n8nStuck) {
      pending.push({
        jobName: `n8n:${c.spec.id}`,
        reason: 'n8n_stuck',
        line: `• ${c.spec.name}: ${c.detail}`,
      });
    }

    // Apply dedupe per (job, reason). Build the SMS body from items that
    // either are first-time or have crossed the escalation threshold.
    type Decided = Pending & { mode: 'first' | 'escalate'; openAlertId?: string; ageHours?: number };
    const decided: Decided[] = [];
    const skipped: Array<{ jobName: string; reason: AlertReason; why: string }> = [];

    for (const item of pending) {
      const decision = await shouldSendAlert(item.jobName, item.reason);
      if (decision.action === 'skip') {
        skipped.push({ jobName: item.jobName, reason: item.reason, why: decision.reason });
        continue;
      }
      if (decision.action === 'first') {
        decided.push({ ...item, mode: 'first' });
      } else {
        decided.push({
          ...item,
          mode: 'escalate',
          openAlertId: decision.openAlertId,
          ageHours: decision.ageHours,
        });
      }
    }

    let smsResult: { ok: boolean; sid?: string; error?: string } | null = null;
    if (decided.length > 0) {
      const escalations = decided.filter((d) => d.mode === 'escalate');
      const header = escalations.length > 0
        ? `[Premmisus] CRON ALERT — STILL BROKEN`
        : `[Premmisus] CRON ALERT`;
      const lines = [
        header,
        ...decided.map((d) => {
          if (d.mode === 'escalate' && d.ageHours != null) {
            return `${d.line} (still broken ${d.ageHours.toFixed(0)}h)`;
          }
          return d.line;
        }),
        `Check command.premmisus.ca/cron-health for detail.`,
      ];
      const body = lines.join('\n');
      smsResult = await sendAlertSMS(body);

      // Only persist alert rows when SMS delivery actually succeeded. If
      // Twilio fails (rate limit, auth, balance), writing the row would let
      // dedupe suppress the next watchdog tick's retry — meaning Elliott
      // never gets the alert at all. Instead: leave cron_alerts empty for
      // these reasons so the next tick re-attempts; mark this watchdog run
      // as 'failure' so the operator can see the SMS pipeline is broken.
      if (smsResult?.ok) {
        for (const d of decided) {
          await recordAlert({
            jobName: d.jobName,
            reason: d.reason,
            message: body,
            smsSid: smsResult.sid ?? null,
            escalation: d.mode === 'escalate' && d.openAlertId
              ? { openAlertId: d.openAlertId }
              : undefined,
          });
        }
      }
    }

    // ── Resolve any open alerts whose underlying cron has recovered ─────────
    // A cron is "healthy" only if all three failure modes are clear (overdue,
    // errored, stuck). Resolving on age-only would prematurely close an open
    // alert for an n8n workflow that's running on time but still erroring.
    const healthyVercel = checks.filter((c) => !c.alert).map((c) => c.job);
    const healthyN8n = n8nChecks
      .filter((c) => !c.overdue && !c.errored && !c.stuck)
      .map((c) => `n8n:${c.spec.id}`);
    const resolved = await resolveAlertsForHealthyJobs([...healthyVercel, ...healthyN8n]);

    // Propagate SMS delivery failure into watchdog status — same bug class
    // we fixed in cron-daily-summary. A failed Twilio send means Elliott did
    // not get the alert; surfacing it as cron_runs.status='failure' lets the
    // cron-health UI flag it without needing a meta-watchdog.
    const smsFailed = decided.length > 0 && !smsResult?.ok;
    // Persist per-workflow n8n snapshots so the Command Center cron-health
    // page can render live tiles without re-querying the n8n API itself.
    const n8nSnapshot = n8nChecks.map((c) => ({
      workflow_id: c.spec.id,
      name: c.spec.name,
      last_execution_at: c.lastExecutionAt ? c.lastExecutionAt.toISOString() : null,
      age_hours: c.ageHours,
      last_status: c.lastStatus,
      overdue: c.overdue,
      errored: c.errored,
      stuck: c.stuck,
      paused: c.paused,
      pause_reason: c.spec.pauseReason ?? null,
      detail: c.detail,
      expected_interval_hours: c.spec.expectedIntervalHours,
    }));

    await finishRun(runId, {
      status: smsFailed ? 'failure' : 'success',
      rowsProcessed: checks.length,
      errorMessage: smsFailed
        ? `SMS delivery failed: ${smsResult?.error ?? 'unknown'}`
        : undefined,
      metadata: {
        vercel_alerting: alertingJobs.length,
        stuck_count: stuckRows.length,
        stuck_calls_count: stuckCalls.length,
        n8n_overdue: n8nOverdue.length,
        n8n_errored: n8nErrored.length,
        n8n_stuck: n8nStuck.length,
        n8n_checks: n8nSnapshot,
        sms_sent: !!smsResult?.ok,
        sms_sid: smsResult?.sid || null,
        sms_error: smsResult?.error || null,
        decided_count: decided.length,
        skipped_count: skipped.length,
        resolved_count: resolved,
      },
    });

    return NextResponse.json({
      ok: true,
      checked_jobs: checks.length,
      alerting: alertingJobs,
      stuck: stuckRows.map((r) => `${r.job_name} (started ${r.started_at})`),
      n8n: n8nChecks,
      decided: decided.map((d) => ({ jobName: d.jobName, reason: d.reason, mode: d.mode })),
      skipped,
      resolved_alerts: resolved,
      sms_sent: !!smsResult?.ok,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(runId, { status: 'failure', errorMessage: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
