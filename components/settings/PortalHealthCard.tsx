'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import SettingsSection from './SettingsSection';

type Status = 'ok' | 'warn' | 'down' | 'unknown';

type Subsystem = {
  key: string;
  group: 'cron' | 'integration' | 'storage';
  name: string;
  status: Status;
  detail: string;
  meta?: Record<string, unknown>;
};

type HealthPayload = {
  checked_at: string;
  subsystems: Subsystem[];
  build: {
    version: string;
    commit: string | null;
    branch: string | null;
    deploy_url: string | null;
    deployed_at: string | null;
  };
};

const STATUS_COLOR: Record<Status, string> = {
  ok: '#22c55e',
  warn: '#F59E0B',
  down: '#ff6060',
  unknown: 'var(--text-muted)',
};

const GROUP_LABEL: Record<Subsystem['group'], string> = {
  cron: 'Crons',
  integration: 'Integrations',
  storage: 'Storage',
};

const tileStyle: CSSProperties = {
  background: '#0e0e0e', border: '1px solid var(--border-soft)', borderRadius: '8px',
  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
};

const groupHeaderStyle: CSSProperties = {
  fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '.16em',
  textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
  margin: '12px 0 8px',
};

function statusBadge(status: Status): { label: string; color: string } {
  if (status === 'ok') return { label: 'OK', color: STATUS_COLOR.ok };
  if (status === 'warn') return { label: 'WARN', color: STATUS_COLOR.warn };
  if (status === 'down') return { label: 'DOWN', color: STATUS_COLOR.down };
  return { label: '—', color: STATUS_COLOR.unknown };
}

function summaryBadge(subs: Subsystem[]): { label: string; color: string } {
  if (subs.length === 0) return { label: '—', color: STATUS_COLOR.unknown };
  if (subs.some((s) => s.status === 'down')) return { label: 'ISSUES', color: STATUS_COLOR.down };
  if (subs.some((s) => s.status === 'warn')) return { label: 'WATCH', color: STATUS_COLOR.warn };
  if (subs.every((s) => s.status === 'ok')) return { label: 'HEALTHY', color: STATUS_COLOR.ok };
  return { label: 'UNKNOWN', color: STATUS_COLOR.unknown };
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: STATUS_COLOR[status], flexShrink: 0,
      boxShadow: status === 'ok' ? `0 0 8px ${STATUS_COLOR.ok}55` : undefined,
    }} />
  );
}

function Tile({ sub }: { sub: Subsystem }) {
  const badge = statusBadge(sub.status);
  return (
    <div style={tileStyle}>
      <StatusDot status={sub.status} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sub.name}
        </div>
        <div style={{
          fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'Roboto, sans-serif',
          marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sub.detail}
        </div>
      </div>
      <span style={{
        fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '3px',
        background: `${badge.color}15`, border: `1px solid ${badge.color}40`,
        color: badge.color, fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '.08em', flexShrink: 0,
      }}>
        {badge.label}
      </span>
    </div>
  );
}

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function PortalHealthCard() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session?.access_token) {
      setLoading(false);
      setErrMsg('Not signed in. Sign in again to view health.');
      return;
    }
    try {
      const res = await fetch('/api/health/all', {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        reportClientError('PortalHealthCard.load', new Error(msg), { status: res.status }, 'settings-portal-health');
        return;
      }
      setData(json as HealthPayload);
    } catch (err) {
      reportClientError('PortalHealthCard.load', err, undefined, 'settings-portal-health');
      setErrMsg(err instanceof Error ? err.message : 'Failed to load health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const subs = data?.subsystems ?? [];
  const groups: Subsystem['group'][] = ['cron', 'integration', 'storage'];
  const summary = summaryBadge(subs);

  return (
    <SettingsSection
      title="Portal health"
      description="Live status across crons, integrations, and storage. Refresh re-runs every check."
      badge={loading && !data ? { label: 'LOADING', color: 'var(--text-muted)' } : summary}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {errMsg && (
          <p style={{ margin: 0, fontSize: '11px', color: '#ff6060', fontFamily: 'Roboto, sans-serif' }}>
            {errMsg}
          </p>
        )}

        {!data && loading && (
          <p style={{ margin: '6px 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Roboto, sans-serif' }}>
            Probing subsystems…
          </p>
        )}

        {data && groups.map((g) => {
          const inGroup = subs.filter((s) => s.group === g);
          if (inGroup.length === 0) return null;
          return (
            <div key={g}>
              <div style={groupHeaderStyle}>{GROUP_LABEL[g]}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                {inGroup.map((sub) => <Tile key={sub.key} sub={sub} />)}
              </div>
            </div>
          );
        })}

        {data && (
          <div style={{
            marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #141414',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              v{data.build.version}
              {data.build.commit && <> · <span style={{ color: 'var(--text-tertiary)' }}>{data.build.commit}</span></>}
              {data.build.branch && <> · {data.build.branch}</>}
              {data.checked_at && <> · checked {relTime(data.checked_at)}</>}
            </div>
            <button onClick={load} disabled={loading}
              style={{
                padding: '6px 14px', borderRadius: '5px',
                border: '1px solid var(--accent-glow-30)', background: 'var(--accent-glow-08)',
                color: 'var(--accent-ink)', fontSize: '10px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'Inter, sans-serif', opacity: loading ? 0.5 : 1, letterSpacing: '.04em',
              }}>
              {loading ? 'REFRESHING…' : '↻ REFRESH'}
            </button>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
