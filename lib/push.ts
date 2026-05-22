// Web Push helper — used by /api/inbound-sms (and any future server route)
// to fan out a push notification to every device a rep has subscribed.
//
// VAPID env vars required:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — also exposed to client for subscribe()
//   VAPID_PRIVATE_KEY              — server only
//   VAPID_SUBJECT                  — mailto: address required by spec

import webpush from 'web-push';

const SB_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:elliott@premmisus.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

async function loadSubsForRep(repId: string, sbKey: string): Promise<SubRow[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/push_subscriptions?rep_id=eq.${repId}&select=id,endpoint,p256dh,auth`,
    { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
  );
  if (!res.ok) return [];
  return (await res.json()) as SubRow[];
}

async function deleteSub(id: string, sbKey: string) {
  await fetch(`${SB_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
}

async function touchSub(id: string, sbKey: string) {
  await fetch(`${SB_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ last_used_at: new Date().toISOString() }),
  });
}

// Sends `payload` to every subscription owned by `repId`. Subscriptions that
// return 404/410 (browser uninstalled / permission revoked) get pruned.
export async function sendPushToRep(repId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) {
    console.warn('[push] VAPID keys not configured — skipping push');
    return { sent: 0, failed: 0 };
  }
  const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!sbKey) return { sent: 0, failed: 0 };

  const subs = await loadSubsForRep(repId, sbKey);
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
        touchSub(s.id, sbKey).catch(() => {});
      } catch (err: any) {
        failed++;
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Browser told us the subscription is dead — prune it.
          deleteSub(s.id, sbKey).catch(() => {});
        } else {
          console.warn('[push] send failed', s.endpoint, status, err?.body || err?.message);
        }
      }
    })
  );
  return { sent, failed };
}
