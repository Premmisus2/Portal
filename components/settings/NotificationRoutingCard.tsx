'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import SettingsSection from './SettingsSection';

type Route = {
  id: string;
  alert_type: string;
  telegram_chat_id: string;
  telegram_topic_id: string | null;
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type Payload = {
  routes: Route[];
  table_missing: boolean;
  hint?: string;
  allowed_alert_types: string[];
  env_default_set: boolean;
};

type Draft = {
  alert_type: string;
  telegram_chat_id: string;
  telegram_topic_id: string;
  description: string;
};

const inputStyle: CSSProperties = {
  width: '100%', padding: '7px 10px', background: 'var(--bg-elev-pill)', border: '1px solid #1f1f1f',
  borderRadius: '5px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
};

const cellHeader: CSSProperties = {
  fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '.12em',
  textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
  padding: '6px 8px', textAlign: 'left',
};

const cell: CSSProperties = {
  padding: '8px', verticalAlign: 'middle', borderTop: '1px solid #141414',
};

function emptyDraft(): Draft {
  return { alert_type: '', telegram_chat_id: '', telegram_topic_id: '', description: '' };
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Not signed in');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers, cache: 'no-store' });
}

export default function NotificationRoutingCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const load = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    try {
      const res = await authedFetch('/api/settings/notification-routes');
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        reportClientError('NotificationRoutingCard.load', new Error(msg), undefined, 'settings-notification-routing');
        return;
      }
      setData(json as Payload);
    } catch (err) {
      reportClientError('NotificationRoutingCard.load', err, undefined, 'settings-notification-routing');
      setErrMsg(err instanceof Error ? err.message : 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!draft.alert_type || !draft.telegram_chat_id) {
      setErrMsg('alert_type and telegram_chat_id are required');
      return;
    }
    setBusyId('new');
    setErrMsg(null);
    try {
      const res = await authedFetch('/api/settings/notification-routes', {
        method: 'POST',
        body: JSON.stringify({
          alert_type: draft.alert_type,
          telegram_chat_id: draft.telegram_chat_id.trim(),
          telegram_topic_id: draft.telegram_topic_id.trim() || null,
          description: draft.description.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        return;
      }
      setShowAdd(false);
      setDraft(emptyDraft());
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const patch = async (id: string, updates: Partial<Route>) => {
    setBusyId(id);
    setErrMsg(null);
    try {
      const res = await authedFetch(`/api/settings/notification-routes?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string, alertType: string) => {
    if (!confirm(`Delete the routing rule for ${alertType}? Future alerts will fall back to the default chat.`)) return;
    setBusyId(id);
    setErrMsg(null);
    try {
      const res = await authedFetch(`/api/settings/notification-routes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const usedTypes = new Set((data?.routes ?? []).map((r) => r.alert_type));
  const availableTypes = (data?.allowed_alert_types ?? []).filter((t) => !usedTypes.has(t));

  return (
    <SettingsSection
      title="Notification routing"
      description="Per-alert-type Telegram routing. Rows here override the default chat. Unset alert types fall back to TELEGRAM_CHAT_ID."
      badge={data
        ? (data.table_missing ? { label: 'MIGRATION', color: '#F59E0B' } : { label: `${data.routes.length} ROUTES`, color: 'var(--accent-ink)' })
        : (loading ? { label: 'LOADING', color: 'var(--text-muted)' } : { label: '—', color: 'var(--text-muted)' })}
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
            {data.hint ?? 'notification_routes table not found.'}
            <div style={{ marginTop: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-secondary)' }}>
              Apply: <code style={{ color: '#F59E0B' }}>supabase/migrations/20260503_notification_routes.sql</code>
            </div>
          </div>
        )}

        {data && !data.env_default_set && (
          <div style={{
            padding: '8px 10px', background: 'rgba(255,96,96,.06)',
            border: '1px solid rgba(255,96,96,.25)', borderRadius: '6px',
            fontSize: '11px', color: '#ff8080', fontFamily: 'Roboto, sans-serif',
          }}>
            TELEGRAM_CHAT_ID env var is not set — alerts without a route will fail silently.
          </div>
        )}

        {data && !data.table_missing && data.routes.length === 0 && (
          <p style={{ margin: '4px 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Roboto, sans-serif' }}>
            No routes configured. Every alert is going to the default chat from the env var.
          </p>
        )}

        {data && data.routes.length > 0 && (
          <div style={{ overflow: 'auto', border: '1px solid #141414', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead style={{ background: 'var(--bg-elev-pill)' }}>
                <tr>
                  <th style={cellHeader}>Alert type</th>
                  <th style={cellHeader}>Chat ID</th>
                  <th style={cellHeader}>Topic</th>
                  <th style={cellHeader}>Description</th>
                  <th style={cellHeader}>On</th>
                  <th style={cellHeader}></th>
                </tr>
              </thead>
              <tbody>
                {data.routes.map((r) => {
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} style={{ background: r.enabled ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                      <td style={{ ...cell, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9be7ff' }}>
                        {r.alert_type}
                      </td>
                      <td style={{ ...cell, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <input
                          defaultValue={r.telegram_chat_id}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== r.telegram_chat_id) patch(r.id, { telegram_chat_id: v });
                          }}
                          style={{ ...inputStyle, minWidth: '120px' }}
                          disabled={busy}
                        />
                      </td>
                      <td style={{ ...cell, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <input
                          defaultValue={r.telegram_topic_id ?? ''}
                          placeholder="—"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            const next = v || null;
                            if (next !== (r.telegram_topic_id ?? null)) patch(r.id, { telegram_topic_id: next });
                          }}
                          style={{ ...inputStyle, minWidth: '60px' }}
                          disabled={busy}
                        />
                      </td>
                      <td style={{ ...cell, fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'Roboto, sans-serif' }}>
                        <input
                          defaultValue={r.description ?? ''}
                          placeholder="optional"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            const next = v || null;
                            if (next !== (r.description ?? null)) patch(r.id, { description: next });
                          }}
                          style={{ ...inputStyle, fontFamily: 'Roboto, sans-serif', minWidth: '160px' }}
                          disabled={busy}
                        />
                      </td>
                      <td style={cell}>
                        <button onClick={() => patch(r.id, { enabled: !r.enabled })} disabled={busy}
                          style={{
                            padding: '4px 10px', borderRadius: '4px',
                            border: r.enabled ? '1px solid rgba(34,197,94,.4)' : '1px solid #2a2a2a',
                            background: r.enabled ? 'rgba(34,197,94,.1)' : '#0e0e0e',
                            color: r.enabled ? '#22c55e' : 'var(--text-muted)',
                            fontSize: '10px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                            cursor: busy ? 'wait' : 'pointer', letterSpacing: '.04em',
                          }}>
                          {r.enabled ? 'ON' : 'OFF'}
                        </button>
                      </td>
                      <td style={cell}>
                        <button onClick={() => remove(r.id, r.alert_type)} disabled={busy}
                          style={{
                            padding: '4px 8px', borderRadius: '4px',
                            border: '1px solid rgba(255,96,96,.3)', background: 'transparent',
                            color: '#ff8080', fontSize: '10px', fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                            cursor: busy ? 'wait' : 'pointer',
                          }}>
                          DELETE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && !data.table_missing && (
          <>
            {!showAdd && availableTypes.length > 0 && (
              <button onClick={() => setShowAdd(true)} disabled={loading}
                style={{
                  alignSelf: 'flex-start', padding: '7px 14px', borderRadius: '5px',
                  border: '1px solid var(--accent-glow-30)', background: 'var(--accent-glow-08)',
                  color: 'var(--accent-ink)', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                + Add route
              </button>
            )}
            {!showAdd && availableTypes.length === 0 && data.routes.length > 0 && (
              <p style={{ margin: '4px 0', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                Every alert type already has a route.
              </p>
            )}

            {showAdd && (
              <div style={{
                background: 'var(--bg-elev-pill)', border: '1px solid #1f1f1f', borderRadius: '6px',
                padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  <select value={draft.alert_type} onChange={(e) => setDraft({ ...draft, alert_type: e.target.value })}
                    style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}>
                    <option value="">— alert_type —</option>
                    {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={draft.telegram_chat_id} onChange={(e) => setDraft({ ...draft, telegram_chat_id: e.target.value })}
                    placeholder="chat id (e.g. -1001234567890)" style={inputStyle} />
                  <input value={draft.telegram_topic_id} onChange={(e) => setDraft({ ...draft, telegram_topic_id: e.target.value })}
                    placeholder="topic id (optional)" style={inputStyle} />
                  <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="description (optional)" style={{ ...inputStyle, fontFamily: 'Roboto, sans-serif' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowAdd(false); setDraft(emptyDraft()); setErrMsg(null); }}
                    style={{
                      padding: '6px 14px', borderRadius: '5px',
                      border: '1px solid #2a2a2a', background: 'transparent',
                      color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                    Cancel
                  </button>
                  <button onClick={create} disabled={busyId === 'new'}
                    style={{
                      padding: '6px 14px', borderRadius: '5px',
                      border: '1px solid var(--accent-glow-30)', background: 'var(--accent-glow-08)',
                      color: 'var(--accent-ink)', fontSize: '11px', fontWeight: 700,
                      cursor: busyId === 'new' ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
                      opacity: busyId === 'new' ? 0.5 : 1,
                    }}>
                    {busyId === 'new' ? 'Saving…' : 'Save route'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsSection>
  );
}
