// Premmisus Sales Portal — Client-side error reporting
//
// Surfaces silent failures that previously got swallowed by bare `catch {}`
// blocks. Three destinations:
//   1. console.error — visible in browser dev tools
//   2. /api/notify-telegram → 🐛 CLIENT ERROR Telegram alert (deduped per session)
//   3. Sentry.captureException — full stack trace + breadcrumbs in Sentry UI
//
// Sentry path is dormant until NEXT_PUBLIC_SENTRY_DSN is set in Vercel.
// Until then, captureException is a safe no-op. See #sentry-bootstrap in
// BUILD-JOURNAL for activation steps.
//
// Fire-and-forget — never blocks the UI. Deduplicates the Telegram alert
// per session so a looping failure doesn't spam your phone. Sentry has its
// own deduplication based on the error fingerprint.
//
// Optional `tag` parameter cross-references the build journal:
// passing `tag: 'shadow-view'` makes the Telegram alert say
// "_See journal: #shadow-view_" so the recipient can jump straight to
// `BUILD-JOURNAL.md` and find the rollback steps. The tag is also attached
// to the Sentry event as a queryable tag.

import * as Sentry from '@sentry/nextjs';

const reported = new Set<string>();

type ErrorMeta = Record<string, string | number | boolean | null | undefined>;

function getUserContext(): { repName: string; repEmail: string } {
  try {
    return {
      repName: localStorage.getItem('pmss_user') || 'unknown',
      repEmail: localStorage.getItem('pmss_email') || 'unknown',
    };
  } catch {
    return { repName: 'unknown', repEmail: 'unknown' };
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string; details?: string };
    return [e.code, e.message, e.details].filter(Boolean).join(' | ') || JSON.stringify(err).slice(0, 300);
  }
  return String(err);
}

export function reportClientError(
  context: string,
  err: unknown,
  meta?: ErrorMeta,
  tag?: string,
): void {
  const errStr = formatError(err);
  const dedupeKey = `${context}::${errStr}`;
  const isDupe = reported.has(dedupeKey);
  reported.add(dedupeKey);

  // Always console.error — visible in browser dev tools, costs nothing
  console.error(`[client-error] ${context}${tag ? ` #${tag}` : ''}:`, err, meta || {});

  // Sentry — always, even on duplicates. Sentry has its own dedup based on
  // error fingerprint, and the per-session dedup we use for Telegram is too
  // aggressive for Sentry (we want every occurrence in the timeline).
  // No-op when DSN is unset.
  try {
    Sentry.withScope((scope) => {
      scope.setTag('context', context);
      if (tag) scope.setTag('journal_tag', tag);
      if (meta) scope.setContext('meta', meta as Record<string, unknown>);
      const userCtx = getUserContext();
      scope.setUser({ email: userCtx.repEmail, username: userCtx.repName });
      Sentry.captureException(err);
    });
  } catch {
    // Sentry never throws in normal operation, but if it does, swallow —
    // the Telegram + console paths still fire below.
  }

  // Telegram only on first occurrence per session — fire-and-forget
  if (isDupe) return;

  const { repName, repEmail } = getUserContext();
  const metaStr = meta
    ? Object.entries(meta)
        .map(([k, v]) => `${k}=${v ?? 'null'}`)
        .join(', ')
    : '';
  const notes = [errStr, metaStr].filter(Boolean).join(' — ');

  // Fire-and-forget — don't await, don't throw on failure
  fetch('/api/notify-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'client_error',
      repName,
      businessName: `${context} (${repEmail})`,
      notes,
      journalTag: tag,
    }),
  }).catch(() => {
    // If Telegram itself fails, console already has the original error.
    // Don't recurse into reportClientError here — would loop.
  });
}
