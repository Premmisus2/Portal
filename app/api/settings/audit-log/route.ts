// Premmisus Sales Portal — Audit log read endpoint
//
// Director-only. Returns filtered + paginated rows from audit_log, with the
// distinct list of action_types and reps for the filter dropdowns.
//
// Query params:
//   actor=<rep_id>            — filter by actor rep_id
//   actions=<csv>             — filter by action_type, comma-separated
//   from=<ISO>                — created_at >= from
//   to=<ISO>                  — created_at < to
//   limit=<n>                 — default 50, max 500
//   offset=<n>                — default 0
//   format=csv                — return text/csv attachment instead of JSON

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDirector } from '@/lib/api-auth';
import { reportServerError } from '@/lib/server-error';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  actor_rep_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

function admin() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !serviceKey) return null;
  return createClient(sbUrl, serviceKey);
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(rows: Row[]): string {
  const header = ['created_at', 'actor_email', 'actor_role', 'action_type', 'target_type', 'target_id', 'metadata'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.created_at, r.actor_email, r.actor_role, r.action_type,
      r.target_type, r.target_id, r.metadata,
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export async function GET(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const url = new URL(request.url);
  const actor = url.searchParams.get('actor');
  const actionsCsv = url.searchParams.get('actions') || '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const format = url.searchParams.get('format');

  const actions = actionsCsv ? actionsCsv.split(',').map((s) => s.trim()).filter(Boolean) : [];

  let q = sb.from('audit_log').select(
    'id, actor_rep_id, actor_email, actor_role, action_type, target_type, target_id, metadata, ip_address, user_agent, created_at',
    { count: 'exact' },
  );
  if (actor) q = q.eq('actor_rep_id', actor);
  if (actions.length > 0) q = q.in('action_type', actions);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lt('created_at', to);
  q = q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    // Most likely the migration hasn't been applied. Return [] + table_missing
    // so the UI surfaces an actionable hint rather than crashing.
    const code = (error as { code?: string }).code || '';
    if (code === '42P01' || /relation/i.test(error.message || '')) {
      return NextResponse.json({
        rows: [],
        total: 0,
        actor_options: [],
        action_options: [],
        table_missing: true,
        hint: 'audit_log table not found — apply migration 20260504_audit_log.sql',
      });
    }
    await reportServerError('audit-log.GET', error, undefined, 'settings-activity-log');
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as Row[];

  if (format === 'csv') {
    return new NextResponse(rowsToCsv(rows), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Distinct action_types + actors for the filter UI. One small extra query
  // each — cheap, gives us a stable filter dropdown that doesn't depend on
  // what's currently visible.
  const [{ data: actionRows }, { data: repRows }] = await Promise.all([
    sb.from('audit_log').select('action_type').limit(2000),
    sb.from('reps').select('id, name, email').order('name'),
  ]);

  const actionOptions = Array.from(new Set((actionRows ?? []).map((r: { action_type: string }) => r.action_type))).sort();

  return NextResponse.json({
    rows,
    total: count ?? rows.length,
    actor_options: repRows ?? [],
    action_options: actionOptions,
    table_missing: false,
  });
}
