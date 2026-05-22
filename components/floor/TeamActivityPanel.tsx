'use client';

// Team Activity Panel — top strip on /floor showing the team's rhythm in
// real time. Visible to all reps.
//
// Two layers per locked permission model:
//   1. Leaderboard (always shown): per-rep today counts. Polled every 30s.
//   2. Headline events ticker: booked + discovery events from past 7 days.
//      Realtime channel + initial fetch. Lead business names hidden for
//      reps (niche-only); directors see full identity.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getTodayCounts,
  getRecentEvents,
  subscribeToFloorEvents,
  type TodayCountRow,
  type FloorEventRow,
} from '@/features/team-activity';

const POLL_INTERVAL_MS = 30_000;
const MAX_EVENTS_IN_TICKER = 8;

function shortTime(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function firstName(full: string): string {
  return full?.split(/\s+/)[0] || full || 'rep';
}

// Collapsed leaderboard — shows top rep + "▾ N more". Click to expand a
// dropdown listing all reps. Replaces inline rep list which wrapped to a
// second row past 5 reps (caught by Elliott eyeballing the deployed view).
function Leaderboard({ counts }: { counts: TodayCountRow[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const top = counts[0];
  const remaining = counts.length - 1;
  const teamTotal = counts.reduce((s, c) => s + c.call_count, 0);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
        letterSpacing: '.18em', textTransform: 'uppercase', color: '#00F0FF',
        whiteSpace: 'nowrap',
      }}>
        ⚡ Today
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 8,
          padding: '6px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
          color: '#ccc', whiteSpace: 'nowrap',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {top && top.call_count > 0 ? (
          <>
            <span style={{ color: '#F59E0B', fontSize: 11 }}>👑</span>
            <span style={{ fontWeight: 700 }}>{firstName(top.rep_name)}</span>
            <span style={{ color: '#fff', fontWeight: 800 }}>{top.call_count}</span>
            <span style={{ color: '#555', fontSize: 9 }}>calls</span>
            {top.booked_count > 0 && (
              <>
                <span style={{ color: '#22c55e', fontWeight: 800 }}>· {top.booked_count}</span>
                <span style={{ color: '#555', fontSize: 9 }}>booked</span>
              </>
            )}
          </>
        ) : (
          <span style={{ color: '#555' }}>No calls today yet</span>
        )}
        {remaining > 0 && (
          <span style={{
            color: '#555', fontSize: 9, marginLeft: 4,
            paddingLeft: 8, borderLeft: '1px solid #1e1e1e',
          }}>
            +{remaining} {open ? '▴' : '▾'}
          </span>
        )}
      </button>
      <span style={{ fontSize: 10, color: '#444', fontFamily: "'JetBrains Mono',monospace" }}>
        team: {teamTotal}
      </span>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 80,
            background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10,
            padding: '8px 0', minWidth: 260, zIndex: 50,
            boxShadow: '0 12px 32px rgba(0,0,0,.5)',
          }}
        >
          <div style={{
            padding: '4px 14px 8px', fontFamily: "'JetBrains Mono',monospace",
            fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase',
            color: '#555', borderBottom: '1px solid #1a1a1a',
          }}>
            Today's Leaderboard
          </div>
          {counts.map((c, idx) => (
            <div key={c.rep_id} style={{
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
              borderBottom: idx === counts.length - 1 ? 'none' : '1px solid #111',
            }}>
              <span style={{
                color: idx === 0 && c.call_count > 0 ? '#F59E0B' : '#444',
                width: 16, textAlign: 'center', fontSize: 10,
              }}>
                {idx === 0 && c.call_count > 0 ? '👑' : String(idx + 1)}
              </span>
              <span style={{ color: '#ccc', fontWeight: 700, flex: 1 }}>{firstName(c.rep_name)}</span>
              <span style={{ color: c.call_count === 0 ? '#444' : '#fff', fontWeight: 800, width: 32, textAlign: 'right' }}>
                {c.call_count}
              </span>
              <span style={{ color: '#444', fontSize: 9, width: 36 }}>calls</span>
              <span style={{ color: c.booked_count === 0 ? '#444' : '#22c55e', fontWeight: 800, width: 24, textAlign: 'right' }}>
                {c.booked_count}
              </span>
              <span style={{ color: '#444', fontSize: 9, width: 40 }}>booked</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function eventLine(e: FloorEventRow): string {
  const verb = e.event_type === 'booked' ? 'booked a discovery' : 'completed a discovery';
  const subject = e.business_name
    ? `with ${e.business_name}`
    : `· ${e.niche || 'cleaning'} niche`;
  return `🎯 ${firstName(e.rep_name)} ${verb} ${subject}`;
}

export default function TeamActivityPanel() {
  const [counts, setCounts] = useState<TodayCountRow[]>([]);
  const [events, setEvents] = useState<FloorEventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const mountedRef = useRef(true);

  // Initial fetch + 30s poll for counts.
  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      try {
        const [c, e] = await Promise.all([getTodayCounts(), getRecentEvents(25)]);
        if (!mountedRef.current) return;
        setCounts(c);
        setEvents(e);
        setLoaded(true);
      } catch {
        if (mountedRef.current) setLoaded(true);
      }
    };
    void load();
    const id = setInterval(() => {
      if (!paused) void load();
    }, POLL_INTERVAL_MS);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [paused]);

  // Realtime subscription for events.
  const onEvents = useCallback((next: FloorEventRow[]) => {
    if (!mountedRef.current) return;
    setEvents(next);
  }, []);
  useEffect(() => {
    const unsub = subscribeToFloorEvents(onEvents);
    return () => unsub();
  }, [onEvents]);

  // Pause polling when tab hidden to save Realtime + RPC quota.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!loaded) {
    return (
      <div style={{
        background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12,
        padding: '14px 18px', margin: '0 auto 14px', maxWidth: 1640, height: 56,
      }} />
    );
  }

  const topEvents = events.slice(0, MAX_EVENTS_IN_TICKER);

  return (
    <div style={{
      background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12,
      padding: '12px 18px', margin: '0 24px 14px',
      maxWidth: 1640, marginLeft: 'auto', marginRight: 'auto',
      display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 24,
      alignItems: 'center',
    }} className="team-activity-panel">
      {/* Leaderboard — collapsible. Top rep shown inline; full list opens
          on click. Survives 10+ reps without wrapping to a second row. */}
      <Leaderboard counts={counts} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
        borderLeft: '1px solid #1e1e1e', paddingLeft: 18,
      }}>
        {/* Headline events */}
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
          letterSpacing: '.18em', textTransform: 'uppercase', color: '#22c55e',
          whiteSpace: 'nowrap',
        }}>
          📡 Wins
        </div>
        <div style={{
          display: 'flex', gap: 14, overflow: 'hidden', minWidth: 0, flex: 1,
        }}>
          {topEvents.length === 0 && (
            <span style={{ fontSize: 11, color: '#555', fontFamily: "'JetBrains Mono',monospace" }}>
              No wins yet this week. Be the first.
            </span>
          )}
          {topEvents.map((e) => (
            <div key={e.event_id} style={{
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              fontSize: 11, color: '#ccc',
            }}>
              <span>{eventLine(e)}</span>
              <span style={{ color: '#555', fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>
                · {shortTime(e.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
