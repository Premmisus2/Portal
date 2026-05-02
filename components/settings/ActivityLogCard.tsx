'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import SettingsSection from './SettingsSection';

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

type ActorOption = { id: string; name: string; email: string };

type Payload = {
  rows: Row[];
  total: number;
  actor_options: ActorOption[];
  action_options: string[];
  table_missing: boolean;
  hint?: string;
};

type Range = '24h' | '7d' | '30d' | 'all';

const PAGE_SIZE = 25;

const inputStyle: CSSProperties = {
  padding: '6px 10px', background: '#0a0a0a', border: '1px solid #1f1f1f',
  borderRadius: '5px', color: '#fff', fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace', outline: 'none',
};

const cellHeader: CSSProperties = {
  fontSize: '9px', fontWeight: 800, color: '#555', letterSpacing: '.12em',
  textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
  padding: '6px 8px', textAlign: 'left',
};

const cell: CSSProperties = {
  padding: '8px', fontSize: '11px', color: '#bbb',
  fontFamily: 'JetBrains Mono, monospace',
  borderTop: '1px solid #141414', verticalAlign: 'top',
};

function rangeToFrom(range: Range): string | null {
  if (range === 'all') return null;
  const ms = range === '24h' ? 86_400_000 : range === '7d' ? 7 * 86_400_000 : 30 * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function actionColor(actionType: string): string {
  if (actionType.startsWith('close.approved')) return '#22c55e';
  if (actionType.startsWith('close.rejected')) return '#ff8080';
  if (actionType.startsWith('rep.deactivated')) return '#ff8080';
  if (actionType.startsWith('rep.activated')) return '#22c55e';
  if (actionType.startsWith('auth.signed_out_all')) return '#F59E0B';
  if (actionType.startsWith('auth.')) return '#9be7ff';
  if (actionType.startsWith('settings.')) return '#9be7ff';
  if (actionType.startsWith('lead.')) return '#00F0FF';
  if (actionType.startsWith('leads.imported')) return '#00F0FF';
  return '#bbb';
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Not signed in');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers, cache: 'no-store' });
}

export default function ActivityLogCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('7d');
  const [actor, setActor] = useState<string>('');
  const [actions, setActions] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showActionsPicker, setShowActionsPicker] = useState(false);

  const load = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actor) params.set('actor', actor);
      if (actions.size > 0) params.set('actions', Array.from(actions).join(','));
      const fromIso = rangeToFrom(range);
      if (fromIso) params.set('from', fromIso);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      const res = await authedFetch(`/api/settings/audit-log?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        reportClientError('ActivityLogCard.load', new Error(msg), undefined, 'settings-activity-log');
        return;
      }
      setData(json as Payload);
    } catch (err) {
      reportClientError('ActivityLogCard.load', err, undefined, 'settings-activity-log');
      setErrMsg(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [actor, actions, range, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [actor, actions, range]);

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (actor) params.set('actor', actor);
      if (actions.size > 0) params.set('actions', Array.from(actions).join(','));
      const fromIso = rangeToFrom(range);
      if (fromIso) params.set('from', fromIso);
      params.set('limit', '500');
      params.set('format', 'csv');
      const res = await authedFetch(`/api/settings/audit-log?${params.toString()}`);
      if (!res.ok) {
        setErrMsg(`Export failed: HTTP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      reportClientError('ActivityLogCard.exportCsv', err, undefined, 'settings-activity-log');
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages - 1);

  const actorLabel = useMemo(() => {
    if (!actor || !data) return 'Any actor';
    const a = data.actor_options.find((r) => r.id === actor);
    return a ? a.name : 'Any actor';
  }, [actor, data]);

  return (
    <SettingsSection
      title="Activity log"
      description="Audit trail of every consequential rep + director action. Filter by actor, action, and date range. Click a row to inspect metadata."
      badge={data
        ? (data.table_missing ? { label: 'MIGRATION', color: '#F59E0B' } : { label: `${data.total} EVENTS`, color: '#00F0FF' })
        : (loading ? { label: 'LOADING', color: '#666' } : { label: '—', color: '#666' })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {errMsg && (
          <p style={{ margin: 0, fontSize: '11px', color: '#ff6060', fontFamily: 'Roboto, sans-serif' }}>
            {errMsg}
          </p>
        )}

        {data?.table_missing && (
          <div style={{
            padding: '10px 12px', background: 'rgba(245,158,11,.06)',
            border: '1px solid rgba(245,158,11,.25)', borderRadius: '6px',
            fontSize: '11px', color: '#F59E0B', lineHeight: 1.55, fontFamily: 'Roboto, sans-serif',
          }}>
            {data.hint ?? 'audit_log table not found.'}
            <div style={{ marginTop: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#aaa' }}>
              Apply: <code style={{ color: '#F59E0B' }}>supabase/migrations/20260504_audit_log.sql</code>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <select value={range} onChange={(e) => setRange(e.target.value as Range)} style={inputStyle}>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>

          <select value={actor} onChange={(e) => setActor(e.target.value)} style={{ ...inputStyle, maxWidth: '200px' }}>
            <option value="">Any actor</option>
            {(data?.actor_options ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowActionsPicker(!showActionsPicker)}
              style={{ ...inputStyle, cursor: 'pointer', minWidth: '160px', textAlign: 'left' }}>
              {actions.size === 0 ? 'Any action' : `${actions.size} action${actions.size === 1 ? '' : 's'}`}
              <span style={{ float: 'right', color: '#555' }}>▾</span>
            </button>
            {showActionsPicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '6px',
                padding: '8px', minWidth: '240px', maxHeight: '300px', overflow: 'auto',
                zIndex: 50, display: 'flex', flexDirection: 'column', gap: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,.5)',
              }}>
                {(data?.action_options ?? []).length === 0 && (
                  <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>No actions yet.</p>
                )}
                {(data?.action_options ?? []).map((a) => {
                  const checked = actions.has(a);
                  return (
                    <label key={a} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '4px 6px', cursor: 'pointer', borderRadius: '3px',
                      background: checked ? 'rgba(0,240,255,.06)' : 'transparent',
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = new Set(actions);
                        if (next.has(a)) next.delete(a); else next.add(a);
                        setActions(next);
                      }} />
                      <span style={{
                        fontSize: '11px', color: actionColor(a),
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>{a}</span>
                    </label>
                  );
                })}
                {actions.size > 0 && (
                  <button onClick={() => setActions(new Set())} style={{
                    marginTop: '4px', padding: '4px 8px', borderRadius: '3px',
                    background: 'transparent', border: '1px solid #2a2a2a',
                    color: '#888', fontSize: '10px', cursor: 'pointer',
                  }}>
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          <button onClick={load} disabled={loading}
            style={{
              padding: '6px 12px', borderRadius: '5px',
              border: '1px solid rgba(0,240,255,.3)', background: 'rgba(0,240,255,.08)',
              color: '#00F0FF', fontSize: '10px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'JetBrains Mono, monospace', opacity: loading ? 0.5 : 1, letterSpacing: '.04em',
            }}>
            {loading ? '…' : '↻'}
          </button>

          <button onClick={exportCsv} disabled={loading || (data?.rows.length ?? 0) === 0}
            style={{
              padding: '6px 12px', borderRadius: '5px',
              border: '1px solid #2a2a2a', background: 'transparent',
              color: '#888', fontSize: '10px', fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.04em',
              opacity: (data?.rows.length ?? 0) === 0 ? 0.4 : 1,
            }}>
            EXPORT CSV
          </button>
        </div>

        {/* Active filters summary */}
        {(actor || actions.size > 0 || range !== '7d') && (
          <p style={{ margin: 0, fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
            {actorLabel} · {actions.size === 0 ? 'all actions' : `${actions.size} actions`} · {range === 'all' ? 'all time' : range}
          </p>
        )}

        {/* Table */}
        {data && !data.table_missing && data.rows.length === 0 && !loading && (
          <p style={{ margin: '4px 0', fontSize: '11px', color: '#666', fontFamily: 'Roboto, sans-serif' }}>
            No events match the current filters.
          </p>
        )}

        {data && data.rows.length > 0 && (
          <div style={{ overflow: 'auto', border: '1px solid #141414', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead style={{ background: '#0a0a0a' }}>
                <tr>
                  <th style={cellHeader}>When</th>
                  <th style={cellHeader}>Actor</th>
                  <th style={cellHeader}>Action</th>
                  <th style={cellHeader}>Target</th>
                  <th style={cellHeader}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const expanded = expandedId === r.id;
                  const metaSummary = r.metadata && typeof r.metadata === 'object'
                    ? Object.keys(r.metadata).slice(0, 3).join(', ')
                    : '';
                  return (
                    <>
                      <tr key={r.id} onClick={() => setExpandedId(expanded ? null : r.id)}
                        style={{ cursor: 'pointer', background: expanded ? 'rgba(0,240,255,.03)' : 'transparent' }}>
                        <td style={{ ...cell, color: '#666', whiteSpace: 'nowrap' }}>
                          <span title={r.created_at}>{relTime(r.created_at)}</span>
                        </td>
                        <td style={{ ...cell, color: '#fff' }}>
                          <div style={{ fontWeight: 700 }}>{r.actor_email || '—'}</div>
                          {r.actor_role && (
                            <div style={{ fontSize: '9px', color: '#555', marginTop: '2px', letterSpacing: '.08em' }}>
                              {r.actor_role.toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td style={{ ...cell, color: actionColor(r.action_type) }}>
                          {r.action_type}
                        </td>
                        <td style={{ ...cell, color: '#888' }}>
                          {r.target_type ? <span>{r.target_type}{r.target_id ? `#${r.target_id.slice(0, 8)}` : ''}</span> : '—'}
                        </td>
                        <td style={{ ...cell, color: '#666', fontSize: '10px' }}>
                          {metaSummary || '—'} <span style={{ color: '#444' }}>{expanded ? '▾' : '▸'}</span>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${r.id}-x`}>
                          <td colSpan={5} style={{ padding: '10px 14px', borderTop: '1px solid #141414', background: '#070707' }}>
                            <pre style={{
                              margin: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                              color: '#9be7ff', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            }}>
{JSON.stringify({
  id: r.id,
  actor_rep_id: r.actor_rep_id,
  actor_email: r.actor_email,
  actor_role: r.actor_role,
  action_type: r.action_type,
  target_type: r.target_type,
  target_id: r.target_id,
  metadata: r.metadata,
  user_agent: r.user_agent,
  ip_address: r.ip_address,
  created_at: r.created_at,
}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}
              style={{
                padding: '5px 12px', borderRadius: '5px', border: '1px solid #1f1f1f',
                background: '#0e0e0e', color: safePage === 0 ? '#333' : '#bbb',
                fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                cursor: safePage === 0 ? 'not-allowed' : 'pointer',
              }}>
              ← PREV
            </button>
            <span style={{ fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
              {safePage + 1} / {totalPages} · {data.total} events
            </span>
            <button onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1}
              style={{
                padding: '5px 12px', borderRadius: '5px', border: '1px solid #1f1f1f',
                background: '#0e0e0e', color: safePage >= totalPages - 1 ? '#333' : '#bbb',
                fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}>
              NEXT →
            </button>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
