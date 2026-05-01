// Premmisus Sales Portal — Server-side error reporting
//
// Counterpart to lib/error-reporting.ts but for /api routes (which can't
// reach client localStorage or use fetch('/api/notify-telegram') without an
// HTTP round-trip). Hits the Telegram bot directly via the bot token.
//
// Use this anywhere a server-side fetch / Supabase call / external integration
// could fail silently. Specifically the Twilio webhook routes (call-status,
// recording-callback) where Twilio expects a 200 even on internal errors —
// without this, those errors disappear forever.
//
// Optional `tag` parameter cross-references the build journal; passing
// `tag: 'twilio-call-status'` makes the Telegram alert say
// "_See journal: #twilio-call-status_" so the recipient can jump straight
// to BUILD-JOURNAL.md and find the rollback steps.
//
// Fire-and-forget — never throws, never blocks the calling route.

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

  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!BOT_TOKEN || !CHAT_ID) return;

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
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch {
    // Don't recurse — console already has the original error
  }
}
