// Premmisus Sales Portal — Nightly Health Check
// Runs every night at 7am ET (12:00 UTC)
// Sends a full status report to Elliott via Telegram

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startRun, finishRun } from '@/lib/cron-tracker';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'BASE_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
];

type CheckResult = { name: string; ok: boolean; detail?: string };

export async function GET(request: Request) {
  // Required cron auth check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const results: CheckResult[] = [];
  const runId = await startRun('cron-health-check');

  // ── 1. ENV VARS ─────────────────────────────────────────────────────────
  const missingEnv = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  results.push({
    name: 'Environment Variables',
    ok: missingEnv.length === 0,
    detail: missingEnv.length > 0 ? `Missing: ${missingEnv.join(', ')}` : `All ${REQUIRED_ENV_VARS.length} present`,
  });

  // ── 2. SUPABASE CONNECTIVITY ─────────────────────────────────────────────
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;

  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey);

    const tableChecks: { table: string; ok: boolean; count?: number; error?: string }[] = [];
    const tables = ['reps', 'leads', 'call_logs', 'closes', 'handoffs'];

    await Promise.all(tables.map(async (t) => {
      const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
      tableChecks.push({ table: t, ok: !error, count: count ?? undefined, error: error?.message });
    }));

    const failedTables = tableChecks.filter(t => !t.ok);
    results.push({
      name: 'Supabase Tables',
      ok: failedTables.length === 0,
      detail: failedTables.length > 0
        ? `Failed: ${failedTables.map(t => `${t.table} (${t.error})`).join(', ')}`
        : tableChecks.map(t => `${t.table}: ${t.count ?? 0}`).join(', '),
    });

    // ── 3. SCHEMA: closes.status column ───────────────────────────────────
    const { data: schemaCheck, error: schemaErr } = await sb
      .from('closes')
      .select('status')
      .limit(1);
    results.push({
      name: 'closes.status column',
      ok: !schemaErr,
      detail: schemaErr ? `MISSING — run add-closes-status.sql migration` : 'Present',
    });

    // ── 4. SCHEMA: call_logs.callback_reason column ────────────────────────
    const { error: cbErr } = await sb
      .from('call_logs')
      .select('callback_reason, booking_type')
      .limit(1);
    results.push({
      name: 'call_logs callback columns',
      ok: !cbErr,
      detail: cbErr ? `MISSING — run add-callback-booking-columns.sql` : 'Present',
    });

    // ── 5. PENDING CLOSES BACKLOG ──────────────────────────────────────────
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: stalePending, error: pendingErr } = await sb
      .from('closes')
      .select('id, rep_id, pts, created_at, reps(name)')
      .eq('status', 'pending')
      .lt('created_at', cutoff);

    if (!pendingErr) {
      const count = stalePending?.length ?? 0;
      results.push({
        name: 'Pending Closes Backlog (>48h)',
        ok: count === 0,
        detail: count > 0
          ? `${count} close${count > 1 ? 's' : ''} waiting approval — check Director Dashboard`
          : 'No backlog',
      });
    }

    // ── 6. REP ACTIVITY (last 24h, weekdays only) ──────────────────────────
    const now = new Date();
    const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;

    if (isWeekday) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: reps } = await sb.from('reps').select('id, name').eq('role', 'rep');
      const { data: activeLogs } = await sb
        .from('call_logs')
        .select('rep_id')
        .gt('created_at', yesterday);

      if (reps && activeLogs !== null) {
        const activeRepIds = new Set(activeLogs.map((l: any) => l.rep_id));
        const inactiveReps = reps.filter((r: any) => !activeRepIds.has(r.id));
        results.push({
          name: 'Rep Activity (24h)',
          ok: inactiveReps.length === 0,
          detail: inactiveReps.length > 0
            ? `No logs: ${inactiveReps.map((r: any) => r.name).join(', ')}`
            : `All ${reps.length} rep${reps.length !== 1 ? 's' : ''} active`,
        });
      }
    }

    // ── 7. CLOSE DATA INTEGRITY ────────────────────────────────────────────
    const { data: badCloses, error: integrityErr } = await sb
      .from('closes')
      .select('id, product_label')
      .or('product_label.is.null,product_label.eq.Unknown');

    if (!integrityErr) {
      const count = badCloses?.length ?? 0;
      results.push({
        name: 'Close Label Integrity',
        ok: count === 0,
        detail: count > 0 ? `${count} closes with missing/unknown product labels` : 'All labels clean',
      });
    }

  } else {
    results.push({ name: 'Supabase', ok: false, detail: 'URL or service key not configured' });
  }

  // ── BUILD TELEGRAM REPORT ────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  const allGood = failed.length === 0;

  const header = allGood
    ? `✅ *PORTAL HEALTH — ALL CLEAR*`
    : `🚨 *PORTAL HEALTH — ${failed.length} ISSUE${failed.length > 1 ? 'S' : ''} FOUND*`;

  const lines = results.map(r =>
    `${r.ok ? '✅' : '❌'} *${r.name}*${r.detail ? `\n    ${r.detail}` : ''}`
  );

  const etTime = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  const message = `${header}\n\n${lines.join('\n\n')}\n\n_${passed}/${results.length} checks passed · ${etTime} ET_`;

  // Send to Telegram directly (no circular dependency on notify-telegram route)
  if (BOT_TOKEN && CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' }),
      });
    } catch {
      // Log but don't fail the health check itself
      console.error('[health-check] Telegram send failed');
    }
  }

  await finishRun(runId, {
    status: allGood ? 'success' : 'failure',
    rowsProcessed: passed,
    errorMessage: allGood ? undefined : failed.map(r => r.name).join(', '),
    metadata: { passed, total: results.length, failed: failed.length },
  });

  return NextResponse.json({
    status: allGood ? 'healthy' : 'issues_found',
    passed,
    total: results.length,
    results,
  });
}
