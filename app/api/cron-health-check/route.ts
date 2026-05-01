// Premmisus Sales Portal — Nightly Health Check
// Runs every day at 7am ET (12:00 UTC).
// Posts a structured Telegram report with actionable detail per failing check
// (rep names, product labels, ages, deep links) so issues can be triaged
// without leaving the message.

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

const PORTAL_BASE = 'https://portal.premmisus.ca';

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
  actionItems?: string[];
  actionUrl?: string;
  urgent?: boolean;
};

function daysSince(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

function hoursSince(iso: string, now = Date.now()): number {
  return Math.round((now - new Date(iso).getTime()) / 3_600_000);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const results: CheckResult[] = [];
  const runId = await startRun('cron-health-check');

  try {
    // ── 1. ENV VARS ─────────────────────────────────────────────────────────
    const missingEnv = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
    results.push({
      name: 'Environment Variables',
      ok: missingEnv.length === 0,
      detail:
        missingEnv.length > 0
          ? `Missing: ${missingEnv.join(', ')}`
          : `All ${REQUIRED_ENV_VARS.length} present`,
    });

    // ── 2-7. SUPABASE-DEPENDENT CHECKS ──────────────────────────────────────
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_KEY;

    if (sbUrl && sbKey) {
      const sb = createClient(sbUrl, sbKey);

      // 2. Table connectivity
      const tableChecks: { table: string; ok: boolean; count?: number; error?: string }[] = [];
      const tables = ['reps', 'leads', 'call_logs', 'closes', 'handoffs'];
      await Promise.all(
        tables.map(async (t) => {
          const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
          tableChecks.push({ table: t, ok: !error, count: count ?? undefined, error: error?.message });
        }),
      );
      const failedTables = tableChecks.filter((t) => !t.ok);
      results.push({
        name: 'Supabase Tables',
        ok: failedTables.length === 0,
        detail:
          failedTables.length > 0
            ? `Failed: ${failedTables.map((t) => `${t.table} (${t.error})`).join(', ')}`
            : tableChecks.map((t) => `${t.table}: ${t.count ?? 0}`).join(', '),
      });

      // 3. Schema: closes.status
      const { error: schemaErr } = await sb.from('closes').select('status').limit(1);
      results.push({
        name: 'closes.status column',
        ok: !schemaErr,
        detail: schemaErr ? `MISSING — run add-closes-status.sql migration` : 'Present',
      });

      // 4. Schema: call_logs callback columns
      const { error: cbErr } = await sb
        .from('call_logs')
        .select('callback_reason, booking_type')
        .limit(1);
      results.push({
        name: 'call_logs callback columns',
        ok: !cbErr,
        detail: cbErr ? `MISSING — run add-callback-booking-columns.sql` : 'Present',
      });

      // 5. PENDING CLOSES BACKLOG — actionable
      const cutoff48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: stalePending, error: pendingErr } = await sb
        .from('closes')
        .select('id, rep_id, pts, product_label, created_at, reps(name)')
        .eq('status', 'pending')
        .lt('created_at', cutoff48)
        .order('created_at', { ascending: true });

      if (!pendingErr) {
        const rows = (stalePending ?? []) as Array<{
          id: string;
          pts: number | null;
          product_label: string | null;
          created_at: string;
          reps: { name: string } | { name: string }[] | null;
        }>;
        const count = rows.length;
        const actionItems = rows.slice(0, 8).map((r) => {
          const repObj = Array.isArray(r.reps) ? r.reps[0] : r.reps;
          const rep = repObj?.name ?? 'Unknown rep';
          const label = r.product_label ?? 'Unknown product';
          const days = daysSince(r.created_at);
          return `${rep} → ${label} — ${days}d waiting`;
        });
        if (count > actionItems.length) {
          actionItems.push(`…and ${count - actionItems.length} more`);
        }
        results.push({
          name: 'Pending Closes Backlog (>48h)',
          ok: count === 0,
          detail:
            count > 0
              ? `${count} close${count > 1 ? 's' : ''} awaiting approval`
              : 'No backlog',
          actionItems: count > 0 ? actionItems : undefined,
          actionUrl: count > 0 ? `${PORTAL_BASE}/director?tab=closes` : undefined,
          urgent: count > 0,
        });
      }

      // 6. REP ACTIVITY — actionable (weekdays only)
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
          const activeRepIds = new Set((activeLogs as Array<{ rep_id: string }>).map((l) => l.rep_id));
          const inactiveReps = (reps as Array<{ id: string; name: string }>).filter(
            (r) => !activeRepIds.has(r.id),
          );

          // Look up each idle rep's most recent call to provide age detail
          const actionItems: string[] = [];
          for (const r of inactiveReps) {
            const { data: lastCall } = await sb
              .from('call_logs')
              .select('created_at')
              .eq('rep_id', r.id)
              .order('created_at', { ascending: false })
              .limit(1);
            const last = (lastCall as Array<{ created_at: string }> | null)?.[0]?.created_at;
            actionItems.push(
              last
                ? `${r.name} — last call ${hoursSince(last)}h ago`
                : `${r.name} — no calls on record`,
            );
          }

          results.push({
            name: 'Rep Activity (24h)',
            ok: inactiveReps.length === 0,
            detail:
              inactiveReps.length > 0
                ? `${inactiveReps.length} of ${reps.length} rep${reps.length !== 1 ? 's' : ''} idle`
                : `All ${reps.length} rep${reps.length !== 1 ? 's' : ''} active`,
            actionItems: inactiveReps.length > 0 ? actionItems : undefined,
            actionUrl: inactiveReps.length > 0 ? `${PORTAL_BASE}/director?tab=callLogs` : undefined,
          });
        }
      }

      // 7. CLOSE LABEL INTEGRITY — actionable
      const { data: badCloses, error: integrityErr } = await sb
        .from('closes')
        .select('id, product_label')
        .or('product_label.is.null,product_label.eq.Unknown');

      if (!integrityErr) {
        const rows = (badCloses ?? []) as Array<{ id: string; product_label: string | null }>;
        const count = rows.length;
        const actionItems = rows.slice(0, 3).map((r) => `${r.id.slice(0, 8)} (${r.product_label ?? 'NULL'})`);
        if (count > 3) actionItems.push(`…and ${count - 3} more`);
        results.push({
          name: 'Close Label Integrity',
          ok: count === 0,
          detail:
            count > 0 ? `${count} close${count > 1 ? 's' : ''} with missing/Unknown labels` : 'All labels clean',
          actionItems: count > 0 ? actionItems : undefined,
          actionUrl: count > 0 ? `${PORTAL_BASE}/director?tab=closes` : undefined,
        });
      }
    } else {
      results.push({ name: 'Supabase', ok: false, detail: 'URL or service key not configured' });
    }

    // ── BUILD TELEGRAM REPORT ────────────────────────────────────────────────
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    const allGood = failed.length === 0;

    const header = allGood
      ? `✅ *PORTAL HEALTH — ALL CLEAR*`
      : `🚨 *PORTAL HEALTH — ${failed.length} ISSUE${failed.length > 1 ? 'S' : ''} FOUND*`;

    const renderCheck = (r: CheckResult): string => {
      const icon = r.ok ? '✅' : '❌';
      const titleSuffix = !r.ok && r.urgent ? ' — URGENT' : '';
      const lines: string[] = [`${icon} *${r.name}*${titleSuffix}`];
      if (r.detail) lines.push(`    ${r.detail}`);
      if (r.actionItems && r.actionItems.length > 0) {
        for (const item of r.actionItems) lines.push(`    • ${item}`);
      }
      if (r.actionUrl) lines.push(`    👉 ${r.actionUrl}`);
      return lines.join('\n');
    };

    const etTime = new Date().toLocaleString('en-CA', {
      timeZone: 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
    const message = `${header}\n\n${results.map(renderCheck).join('\n\n')}\n\n_${passed}/${results.length} checks passed · ${etTime} ET · command.premmisus.ca/cron-health_`;

    // Telegram delivery
    let telegramSent = false;
    if (BOT_TOKEN && CHAT_ID) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' }),
        });
        telegramSent = tgRes.ok;
      } catch {
        console.error('[health-check] Telegram send failed');
      }
    }

    // Persist findings + actionable detail in metadata so the cron-health page
    // can render the same content the Telegram message did.
    await finishRun(runId, {
      status: 'success',
      rowsProcessed: passed,
      metadata: {
        passed,
        total: results.length,
        failed: failed.length,
        issues: failed.map((r) => r.name),
        all_checks_passed: allGood,
        telegram_sent: telegramSent,
        results: results.map((r) => ({
          name: r.name,
          ok: r.ok,
          detail: r.detail ?? null,
          action_items: r.actionItems ?? null,
          action_url: r.actionUrl ?? null,
          urgent: r.urgent ?? false,
        })),
      },
    });

    return NextResponse.json({
      status: allGood ? 'healthy' : 'issues_found',
      passed,
      total: results.length,
      results,
    });
  } catch (err: unknown) {
    const messageStr = err instanceof Error ? err.message : String(err);
    await finishRun(runId, { status: 'failure', errorMessage: messageStr });
    return NextResponse.json({ error: messageStr }, { status: 500 });
  }
}
