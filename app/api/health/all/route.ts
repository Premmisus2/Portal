// Premmisus Sales Portal — Portal Health Aggregator
//
// Director-only. Returns a single JSON payload describing the live state of
// every subsystem the portal depends on:
//   • Each cron job (cron_runs table — last successful run vs expected cadence)
//   • Sentry (DSN configured?)
//   • Telegram bot (getMe ping, 60s in-memory cache)
//   • Supabase (count from reps to confirm DB is reachable)
//   • Build version (package.json + VERCEL_GIT_COMMIT_SHA when present)
//
// Status semantics per subsystem:
//   ok   = subsystem responded healthy
//   warn = soft anomaly (cron drifted past 1× cadence, Sentry DSN unset)
//   down = hard failure (cron silent past 2× cadence, telegram getMe failed)
//
// All subsystem checks run in parallel; one failure cannot mask another.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDirector } from '@/lib/api-auth';
import { reportServerError } from '@/lib/server-error';
import packageJson from '../../../../package.json';

export const dynamic = 'force-dynamic';

type Status = 'ok' | 'warn' | 'down' | 'unknown';

type Subsystem = {
  key: string;
  group: 'cron' | 'integration' | 'storage';
  name: string;
  status: Status;
  detail: string;
  meta?: Record<string, unknown>;
};

// Expected interval between cron runs, in seconds. Pulled from vercel.json
// schedules — daily on weekdays for most, hourly during business hours for
// idle-check, 3h between watchdog ticks. Used to flag silent failures.
const CRON_EXPECTATIONS: Array<{ key: string; name: string; intervalSeconds: number; weekdaysOnly: boolean }> = [
  { key: 'cron-health-check',      name: 'Cron · health check',      intervalSeconds: 86_400,  weekdaysOnly: false },
  { key: 'cron-idle-check',        name: 'Cron · idle check',        intervalSeconds: 3_600,   weekdaysOnly: true  },
  { key: 'cron-daily-summary',     name: 'Cron · daily summary',     intervalSeconds: 86_400,  weekdaysOnly: true  },
  { key: 'cron-callback-reminder', name: 'Cron · callback reminder', intervalSeconds: 86_400,  weekdaysOnly: true  },
  { key: 'cron-watchdog',          name: 'Cron · watchdog',          intervalSeconds: 10_800,  weekdaysOnly: true  },
];

let telegramCache: { at: number; subsystem: Subsystem } | null = null;
const TELEGRAM_CACHE_MS = 60_000;

function isWeekendUTC(d = new Date()): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

function ageStr(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

async function checkCrons(): Promise<Subsystem[]> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !serviceKey) {
    return CRON_EXPECTATIONS.map((c) => ({
      key: c.key, group: 'cron' as const, name: c.name, status: 'unknown' as const,
      detail: 'Supabase service key not configured',
    }));
  }
  const sb = createClient(sbUrl, serviceKey);
  const { data, error } = await sb
    .from('cron_runs')
    .select('job_name, started_at, finished_at, status')
    .eq('status', 'success')
    .order('started_at', { ascending: false })
    .limit(200);

  if (error) {
    await reportServerError('health/checkCrons', error, undefined, 'settings-portal-health');
    return CRON_EXPECTATIONS.map((c) => ({
      key: c.key, group: 'cron' as const, name: c.name, status: 'unknown' as const,
      detail: 'cron_runs query failed',
    }));
  }

  const lastByJob = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ job_name: string; started_at: string; finished_at: string | null; status: string }>) {
    if (!lastByJob.has(row.job_name)) {
      lastByJob.set(row.job_name, row.finished_at ?? row.started_at);
    }
  }

  const now = Date.now();
  const weekend = isWeekendUTC();

  return CRON_EXPECTATIONS.map((c) => {
    const last = lastByJob.get(c.key);
    if (!last) {
      return {
        key: c.key, group: 'cron' as const, name: c.name, status: 'unknown' as const,
        detail: 'No successful run on record yet',
        meta: { last_success_at: null, expected_interval_s: c.intervalSeconds },
      };
    }
    const ageSec = (now - new Date(last).getTime()) / 1000;
    let status: Status = 'ok';
    if (ageSec > c.intervalSeconds * 2) status = 'down';
    else if (ageSec > c.intervalSeconds * 1.25) status = 'warn';
    // Weekday-only crons are silent on Sat/Sun by design — don't flag them red.
    if (c.weekdaysOnly && weekend && status !== 'ok') status = 'ok';
    return {
      key: c.key, group: 'cron' as const, name: c.name, status,
      detail: `Last success ${ageStr(ageSec)}`,
      meta: { last_success_at: last, expected_interval_s: c.intervalSeconds, age_seconds: Math.round(ageSec), weekday_only: c.weekdaysOnly },
    };
  });
}

async function checkSentry(): Promise<Subsystem> {
  const clientDsn = (process.env.NEXT_PUBLIC_SENTRY_DSN || '').trim();
  const serverDsn = (process.env.SENTRY_DSN || '').trim();
  const dsnSet = Boolean(clientDsn || serverDsn);
  return {
    key: 'sentry',
    group: 'integration',
    name: 'Sentry',
    status: dsnSet ? 'ok' : 'warn',
    detail: dsnSet ? 'DSN configured — captureException is live' : 'DSN unset — running in dormant no-op mode',
    meta: { client_dsn_set: Boolean(clientDsn), server_dsn_set: Boolean(serverDsn) },
  };
}

async function checkTelegram(): Promise<Subsystem> {
  if (telegramCache && Date.now() - telegramCache.at < TELEGRAM_CACHE_MS) {
    return telegramCache.subsystem;
  }
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) {
    const sub: Subsystem = {
      key: 'telegram', group: 'integration', name: 'Telegram bot',
      status: 'down', detail: 'TELEGRAM_BOT_TOKEN not configured',
    };
    telegramCache = { at: Date.now(), subsystem: sub };
    return sub;
  }
  let sub: Subsystem;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
      // Avoid Next.js fetch caching — we want fresh status with our own 60s cache.
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; result?: { username?: string; first_name?: string }; description?: string } | null;
    if (res.ok && json?.ok && json.result) {
      const handle = json.result.username ? '@' + json.result.username : (json.result.first_name || 'bot');
      sub = { key: 'telegram', group: 'integration', name: 'Telegram bot', status: 'ok', detail: `${handle} reachable`, meta: { username: json.result.username ?? null } };
    } else {
      sub = { key: 'telegram', group: 'integration', name: 'Telegram bot', status: 'down', detail: json?.description || `getMe HTTP ${res.status}` };
    }
  } catch (err) {
    sub = { key: 'telegram', group: 'integration', name: 'Telegram bot', status: 'down', detail: err instanceof Error ? err.message : 'getMe failed' };
  }
  telegramCache = { at: Date.now(), subsystem: sub };
  return sub;
}

async function checkSupabase(): Promise<Subsystem> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !serviceKey) {
    return { key: 'supabase', group: 'storage', name: 'Supabase', status: 'down', detail: 'URL or service key not configured' };
  }
  try {
    const sb = createClient(sbUrl, serviceKey);
    const { count, error } = await sb.from('reps').select('*', { count: 'exact', head: true });
    if (error) {
      return { key: 'supabase', group: 'storage', name: 'Supabase', status: 'down', detail: error.message };
    }
    return {
      key: 'supabase', group: 'storage', name: 'Supabase',
      status: 'ok', detail: `Reachable — ${count ?? 0} reps in table`,
      meta: { rep_count: count ?? 0 },
    };
  } catch (err) {
    return { key: 'supabase', group: 'storage', name: 'Supabase', status: 'down', detail: err instanceof Error ? err.message : 'connection failed' };
  }
}

function buildInfo() {
  return {
    version: (packageJson as { version?: string }).version ?? 'unknown',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deploy_url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    deployed_at: process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE ?? null,
  };
}

export async function GET(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [cronResults, sentry, telegram, supabaseHealth] = await Promise.all([
    checkCrons(),
    checkSentry(),
    checkTelegram(),
    checkSupabase(),
  ]);

  const subsystems: Subsystem[] = [...cronResults, sentry, telegram, supabaseHealth];

  return NextResponse.json({
    checked_at: new Date().toISOString(),
    subsystems,
    build: buildInfo(),
  });
}
