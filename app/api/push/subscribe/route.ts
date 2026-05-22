// POST /api/push/subscribe — register a Web Push subscription for a rep.
// Called by lib/push-client.ts after the browser hands us a PushSubscription.
// Idempotent: upserts on endpoint.

import { NextResponse } from 'next/server';

const SB_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export async function POST(request: Request) {
  const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!sbKey) return NextResponse.json({ error: 'Service key missing' }, { status: 500 });

  let payload: any;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { rep_id, endpoint, p256dh, auth, user_agent } = payload || {};
  if (!rep_id || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'rep_id, endpoint, p256dh, and auth required' }, { status: 400 });
  }

  const res = await fetch(`${SB_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
    method: 'POST',
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ rep_id, endpoint, p256dh, auth, user_agent: user_agent || null }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: 'DB insert failed', detail: err }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe?endpoint=... — unregister this device.
export async function DELETE(request: Request) {
  const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!sbKey) return NextResponse.json({ error: 'Service key missing' }, { status: 500 });

  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

  await fetch(`${SB_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  });
  return NextResponse.json({ success: true });
}
