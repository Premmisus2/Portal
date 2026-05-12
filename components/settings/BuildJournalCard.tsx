'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import SettingsSection from './SettingsSection';

type JournalStatus = 'shipped' | 'stub' | 'pending' | 'unknown';

type Entry = {
  id: string;
  date: string;
  tag: string | null;
  title: string;
  status: JournalStatus;
  body: string;
};

type Payload = {
  entries: Entry[];
  tags: string[];
  total: number;
  read_at: string;
};

const PAGE_SIZE = 5;

const STATUS_BADGE: Record<JournalStatus, { label: string; color: string }> = {
  shipped: { label: '✅ SHIPPED', color: '#22c55e' },
  stub:    { label: '🟡 STUB',    color: '#F59E0B' },
  pending: { label: '⏸ PENDING',  color: 'var(--text-tertiary)'    },
  unknown: { label: '·',           color: 'var(--text-muted)'    },
};

const tagPillStyle = (active: boolean): CSSProperties => ({
  padding: '4px 10px', borderRadius: '12px',
  border: active ? '1px solid rgba(0,240,255,.55)' : '1px solid #1f1f1f',
  background: active ? 'var(--accent-glow-12)' : '#0e0e0e',
  color: active ? 'var(--accent-ink)' : 'var(--text-tertiary)',
  fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
  letterSpacing: '.04em', cursor: 'pointer', whiteSpace: 'nowrap',
});

// Tiny inline markdown formatter: enough for our journal entries (bold, code,
// header lines, bullets) without pulling in a dependency. Treats input as
// preformatted-ish — preserves line breaks, lightly styles known patterns.
function renderMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const out: ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];

  const flushCode = () => {
    if (codeBuf.length === 0) return;
    out.push(
      <pre key={`c-${out.length}`} style={{
        background: 'var(--bg-elev-pill)', border: '1px solid var(--border-soft)', borderRadius: '6px',
        padding: '10px 12px', margin: '6px 0', fontSize: '11px', color: 'var(--text-secondary)',
        fontFamily: 'JetBrains Mono, monospace', overflow: 'auto', lineHeight: 1.55,
      }}>{codeBuf.join('\n')}</pre>,
    );
    codeBuf = [];
  };

  const inline = (text: string): ReactNode => {
    // Split on **bold** and `code` while keeping delimiters.
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text-primary)' }}>{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith('`') && p.endsWith('`')) {
        return <code key={i} style={{
          background: '#101010', border: '1px solid var(--border-soft)', borderRadius: '3px',
          padding: '0 4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9be7ff',
        }}>{p.slice(1, -1)}</code>;
      }
      return <span key={i}>{p}</span>;
    });
  };

  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      if (inCode) { flushCode(); inCode = false; }
      else { inCode = true; }
      return;
    }
    if (inCode) { codeBuf.push(line); return; }

    if (!line.trim()) { out.push(<div key={i} style={{ height: '6px' }} />); return; }

    if (line.startsWith('### ')) {
      out.push(<h4 key={i} style={{ margin: '10px 0 4px', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>{inline(line.slice(4))}</h4>);
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      out.push(<div key={i} style={{ margin: '2px 0 2px 8px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Roboto, sans-serif', lineHeight: 1.6 }}>{inline(line)}</div>);
      return;
    }
    if (line.startsWith('- ')) {
      out.push(<div key={i} style={{ margin: '2px 0 2px 8px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Roboto, sans-serif', lineHeight: 1.6 }}>• {inline(line.slice(2))}</div>);
      return;
    }
    out.push(<p key={i} style={{ margin: '2px 0', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Roboto, sans-serif', lineHeight: 1.6 }}>{inline(line)}</p>);
  });
  flushCode();
  return out;
}

function EntryCard({ entry, expanded, onToggle }: { entry: Entry; expanded: boolean; onToggle: () => void }) {
  const badge = STATUS_BADGE[entry.status];
  return (
    <div style={{ background: '#0e0e0e', border: '1px solid var(--border-soft)', borderRadius: '8px', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
        padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{
          fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)',
          letterSpacing: '.04em', flexShrink: 0,
        }}>{entry.date}</span>
        {entry.tag && (
          <span style={{
            fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
            background: 'var(--accent-glow-06)', border: '1px solid var(--accent-glow-22)',
            color: 'var(--accent-ink)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
          }}>#{entry.tag}</span>
        )}
        <span style={{
          flex: 1, minWidth: 0, fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700,
          fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{entry.title}</span>
        <span style={{
          fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
          background: `${badge.color}1a`, border: `1px solid ${badge.color}40`, color: badge.color,
          fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
        }}>{badge.label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid #141414' }}>
          {renderMarkdown(entry.body)}
        </div>
      )}
    </div>
  );
}

export default function BuildJournalCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrMsg(null);
    setLoading(true);
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session?.access_token) {
      setLoading(false);
      setErrMsg('Not signed in.');
      return;
    }
    try {
      const res = await fetch('/api/journal', {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
        setErrMsg(msg);
        reportClientError('BuildJournalCard.load', new Error(msg), { status: res.status }, 'settings-portal-health');
        return;
      }
      setData(json as Payload);
    } catch (err) {
      reportClientError('BuildJournalCard.load', err, undefined, 'settings-portal-health');
      setErrMsg(err instanceof Error ? err.message : 'Failed to load journal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!tagFilter) return data.entries;
    return data.entries.filter((e) => e.tag === tagFilter);
  }, [data, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <SettingsSection
      title="Build journal"
      description="Every change shipped to the portal. Tag-filtered, click an entry to expand the full markdown body."
      badge={data ? { label: `${data.total} ENTRIES`, color: 'var(--accent-ink)' } : (loading ? { label: 'LOADING', color: 'var(--text-muted)' } : { label: '—', color: 'var(--text-muted)' })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {errMsg && (
          <p style={{ margin: 0, fontSize: '11px', color: '#ff6060', fontFamily: 'Roboto, sans-serif' }}>
            {errMsg}
          </p>
        )}

        {data && data.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button onClick={() => { setTagFilter(null); setPage(0); }} style={tagPillStyle(tagFilter === null)}>
              ALL ({data.total})
            </button>
            {data.tags.map((t) => {
              const count = data.entries.filter((e) => e.tag === t).length;
              return (
                <button key={t} onClick={() => { setTagFilter(t); setPage(0); }} style={tagPillStyle(tagFilter === t)}>
                  #{t} ({count})
                </button>
              );
            })}
          </div>
        )}

        {!data && loading && (
          <p style={{ margin: '6px 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Roboto, sans-serif' }}>
            Loading journal…
          </p>
        )}

        {data && pageItems.length === 0 && (
          <p style={{ margin: '6px 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Roboto, sans-serif' }}>
            No entries match the current filter.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {pageItems.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            />
          ))}
        </div>

        {data && filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}
              style={{
                padding: '5px 12px', borderRadius: '5px', border: '1px solid #1f1f1f',
                background: '#0e0e0e', color: safePage === 0 ? 'var(--text-faint)' : 'var(--text-secondary)',
                fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                cursor: safePage === 0 ? 'not-allowed' : 'pointer',
              }}>
              ← PREV
            </button>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {safePage + 1} / {totalPages} · {filtered.length} entries
            </span>
            <button onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1}
              style={{
                padding: '5px 12px', borderRadius: '5px', border: '1px solid #1f1f1f',
                background: '#0e0e0e', color: safePage >= totalPages - 1 ? 'var(--text-faint)' : 'var(--text-secondary)',
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
