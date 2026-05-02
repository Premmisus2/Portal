// Premmisus Sales Portal — Server-side error reporting
//
// Counterpart to lib/error-reporting.ts but for /api routes. Three destinations:
//   1. console.error — visible in Vercel runtime logs
//   2. Telegram (direct bot.sendMessage) → 🔧 SERVER ERROR alert
//   3. Sentry.captureException — full stack + request context in Sentry UI
//
// Sentry path is dormant until SENTRY_DSN is set in Vercel. Until then,
// captureException is a safe no-op. See #sentry-bootstrap in BUILD-JOURNAL
// for activation steps.
//
// Use this anywhere a server-side fetch / Supabase call / external integration
// could fail silently. Specifically the Twilio webhook routes (call-status,
// recording-callback) where Twilio expects a 200 even on internal errors —
// without this, those errors disappear forever.
//
// Optional `tag` parameter cross-references the build journal; passing
// `tag: 'twilio-call-status'` makes the Telegram alert say
// "_See journal: #twilio-call-status_" and tags the Sentry event with
// `journal_tag` for filtering.
//
// Fire-and-forget — never throws, never blocks the calling route.

import * as Sentry from '@sentry/nextjs';
import { resolveRoute } from './notification-routes';

type ErrorMeta = Record<string, string | number | boolean | null | undefined>;

function formatError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string; details?: string };
    return [e.code, e.message, e.details].filter(Boolean).join(' | ') || JSON.stringify(err).slice(0, 300);
  }
  return String(err);
}

export async function reportServerError(
  context: string,
  err: unknown,
  meta?: ErrorMeta,
  tag?: string,
): Promise<void> {
  // Always console.error — visible in Vercel runtime logs
  console.error(`[server-error] ${context}${tag ? ` #${tag}` : ''}:`, err, meta || {});

  // Sentry — no-op when DSN unset. Wraps in try/catch defensively because
  // Sentry must never break a /api route (which would 500 the request).
  try {
    Sentry.withScope((scope) => {
      scope.setTag('context', context);
      if (tag) scope.setTag('journal_tag', tag);
      if (meta) scope.setContext('meta', meta as Record<string, unknown>);
      Sentry.captureException(err);
    });
  } catch {
    // Sentry should never throw, but if it does, console + Telegram still fire.
  }

  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!BOT_TOKEN) return;

  // Route to the configured chat for `server_error`. Falls back to
  // TELEGRAM_CHAT_ID if no route exists. See lib/notification-routes.ts.
  const route = await resolveRoute('server_error');
  if (!route.chatId) return;

  const errStr = formatError(err);
  const metaStr = meta
    ? Object.entries(meta)
        .map(([k, v]) => `${k}=${v ?? 'null'}`)
        .join(', ')
    : '';
  const notes = [errStr, metaStr].filter(Boolean).join(' — ');
  const journalLine = tag ? `\n_See journal: #${tag}_` : '';
  const message = `🔧 *SERVER ERROR*\nWhere: ${context}\nWhat: ${notes.slice(0, 500)}${journalLine}\n\n_Reported from /api route. Check Vercel logs for full stack._`;

  try {
    const tgBody: Record<string, unknown> = {
      chat_id: route.chatId,
      text: message,
      parse_mode: 'Markdown',
    };
    if (route.topicId) tgBody.message_thread_id = Number(route.topicId);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgBody),
    });
  } catch {
    // Don't recurse — console already has the original error
  }
}
