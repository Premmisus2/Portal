// Premmisus Sales Portal — Client-side error reporting
//
// Surfaces silent failures that previously got swallowed by bare `catch {}`
// blocks. Logs to console (visible in browser dev tools) AND sends a Telegram
// alert via /api/notify-telegram so Elliott sees client failures on his phone
// without needing to open the console.
//
// Fire-and-forget — never blocks the UI. Deduplicates inside a single page
// load so a looping failure doesn't spam Telegram.

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
): void {
  const errStr = formatError(err);
  const dedupeKey = `${context}::${errStr}`;
  const isDupe = reported.has(dedupeKey);
  reported.add(dedupeKey);

  // Always console.error — visible in browser dev tools, costs nothing
  console.error(`[client-error] ${context}:`, err, meta || {});

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
    }),
  }).catch(() => {
    // If Telegram itself fails, console already has the original error.
    // Don't recurse into reportClientError here — would loop.
  });
}
