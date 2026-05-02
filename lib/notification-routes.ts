// Premmisus Sales Portal — Notification route resolution
//
// Looks up where a given alert_type should be sent. Reads notification_routes;
// if a row exists and is enabled, returns its chat_id (+ optional topic_id);
// otherwise returns the TELEGRAM_CHAT_ID env var as the fallback default.
//
// Forward-compat: if the notification_routes table does NOT exist yet (the
// migration hasn't been applied), the query errors and we silently fall back
// to the env var. No alert is dropped pre-migration.
//
// Cache: full-table read cached for 60s in-process. Routes are touched rarely
// (Elliott edits them once), reads happen on every alert. The cache lets the
// existing notify-telegram and server-error paths stay snappy.

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';
const CACHE_MS = 60_000;

export type ResolvedRoute = {
  chatId: string;
  topicId: string | null;
  source: 'route' | 'env' | 'unconfigured';
  alertType: string;
};

type Row = {
  alert_type: string;
  telegram_chat_id: string;
  telegram_topic_id: string | null;
  enabled: boolean;
};

let cache: { at: number; rows: Map<string, Row> } | null = null;

async function loadRoutes(): Promise<Map<string, Row>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;

  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    cache = { at: Date.now(), rows: new Map() };
    return cache.rows;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/notification_routes?select=alert_type,telegram_chat_id,telegram_topic_id,enabled`,
      {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      // 404 / 42P01 (table missing) / RLS denial — degrade silently, every
      // alert continues falling through to env var.
      cache = { at: Date.now(), rows: new Map() };
      return cache.rows;
    }
    const rows = (await res.json().catch(() => [])) as Row[];
    const map = new Map<string, Row>();
    for (const r of rows) map.set(r.alert_type, r);
    cache = { at: Date.now(), rows: map };
    return map;
  } catch {
    cache = { at: Date.now(), rows: new Map() };
    return cache.rows;
  }
}

export function invalidateRouteCache() {
  cache = null;
}

export async function resolveRoute(alertType: string): Promise<ResolvedRoute> {
  const rows = await loadRoutes();
  const row = rows.get(alertType);
  if (row && row.enabled && row.telegram_chat_id) {
    return {
      chatId: row.telegram_chat_id,
      topicId: row.telegram_topic_id || null,
      source: 'route',
      alertType,
    };
  }
  const envChat = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (envChat) {
    return { chatId: envChat, topicId: null, source: 'env', alertType };
  }
  return { chatId: '', topicId: null, source: 'unconfigured', alertType };
}
