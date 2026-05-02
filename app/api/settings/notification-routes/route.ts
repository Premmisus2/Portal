// Premmisus Sales Portal — Notification routes CRUD
//
// Director-only. CRUD endpoints for the notification_routes table.
//   GET    /api/settings/notification-routes        → list all rows
//   POST   /api/settings/notification-routes        → create one row (alert_type unique)
//   PATCH  /api/settings/notification-routes/:id    → update fields on one row
//   DELETE /api/settings/notification-routes/:id    → delete one row
//
// The id is supplied via ?id=<uuid> on PATCH and DELETE since this is a
// single route file (no [id] dynamic segment needed).
//
// Cache: every mutating call invalidates the in-process route cache via
// invalidateRouteCache() so the next alert sees the new routing immediately.
// Different serverless instances cache independently; in the worst case a
// stale cached route is used for up to 60s.

import { NextResponse } from 'next/server';
import { requireDirector } from '@/lib/api-auth';
import { invalidateRouteCache } from '@/lib/notification-routes';
import { reportServerError } from '@/lib/server-error';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ALLOWED_ALERT_TYPES = [
  'server_error',
  'client_error',
  'booked_call',
  'idle',
  'daily_summary',
  'callback_reminder',
  'health_check',
  'close_approved',
  'close_rejected',
  'cron_failure',
];

function admin() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !serviceKey) return null;
  return createClient(sbUrl, serviceKey);
}

export async function GET(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('notification_routes')
    .select('id, alert_type, telegram_chat_id, telegram_topic_id, enabled, description, created_at, updated_at')
    .order('alert_type', { ascending: true });

  if (error) {
    // Most likely the migration hasn't been applied. Return [] + a hint so
    // the UI can surface the migration filename without crashing.
    return NextResponse.json({
      routes: [],
      table_missing: true,
      hint: 'notification_routes table not found — apply migration 20260503_notification_routes.sql',
      allowed_alert_types: ALLOWED_ALERT_TYPES,
      env_default_set: Boolean((process.env.TELEGRAM_CHAT_ID || '').trim()),
    });
  }

  return NextResponse.json({
    routes: data ?? [],
    table_missing: false,
    allowed_alert_types: ALLOWED_ALERT_TYPES,
    env_default_set: Boolean((process.env.TELEGRAM_CHAT_ID || '').trim()),
  });
}

type UpsertBody = {
  alert_type?: string;
  telegram_chat_id?: string;
  telegram_topic_id?: string | null;
  enabled?: boolean;
  description?: string | null;
};

export async function POST(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as UpsertBody;
  if (!body.alert_type || !body.telegram_chat_id) {
    return NextResponse.json({ error: 'alert_type and telegram_chat_id are required' }, { status: 400 });
  }
  if (!ALLOWED_ALERT_TYPES.includes(body.alert_type)) {
    return NextResponse.json({
      error: `alert_type must be one of: ${ALLOWED_ALERT_TYPES.join(', ')}`,
    }, { status: 400 });
  }

  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('notification_routes')
    .insert({
      alert_type: body.alert_type,
      telegram_chat_id: body.telegram_chat_id,
      telegram_topic_id: body.telegram_topic_id || null,
      enabled: body.enabled !== false,
      description: body.description || null,
    })
    .select()
    .single();

  if (error) {
    await reportServerError('notification-routes.POST', error, { alert_type: body.alert_type }, 'settings-notification-routing');
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  invalidateRouteCache();
  return NextResponse.json({ route: data });
}

export async function PATCH(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as UpsertBody;
  const updates: Record<string, unknown> = {};
  if (typeof body.telegram_chat_id === 'string') updates.telegram_chat_id = body.telegram_chat_id;
  if ('telegram_topic_id' in body) updates.telegram_topic_id = body.telegram_topic_id || null;
  if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
  if ('description' in body) updates.description = body.description || null;
  if (body.alert_type) {
    if (!ALLOWED_ALERT_TYPES.includes(body.alert_type)) {
      return NextResponse.json({
        error: `alert_type must be one of: ${ALLOWED_ALERT_TYPES.join(', ')}`,
      }, { status: 400 });
    }
    updates.alert_type = body.alert_type;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('notification_routes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await reportServerError('notification-routes.PATCH', error, { id }, 'settings-notification-routing');
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  invalidateRouteCache();
  return NextResponse.json({ route: data });
}

export async function DELETE(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { error } = await sb.from('notification_routes').delete().eq('id', id);
  if (error) {
    await reportServerError('notification-routes.DELETE', error, { id }, 'settings-notification-routing');
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  invalidateRouteCache();
  return NextResponse.json({ ok: true });
}
