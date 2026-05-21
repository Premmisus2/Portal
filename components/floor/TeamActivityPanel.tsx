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
      {/* Leaderboard */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
          letterSpacing: '.18em', textTransform: 'uppercase', color: '#00F0FF',
          whiteSpace: 'nowrap',
        }}>
          ⚡ Today
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', minWidth: 0 }}>
          {counts.length === 0 && (
            <span style={{ fontSize: 11, color: '#555', fontFamily: "'JetBrains Mono',monospace" }}>
              No reps active.
            </span>
          )}
          {counts.map((c, idx) => (
            <div key={c.rep_id} style={{
              display: 'flex', alignItems: 'baseline', gap: 6,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
              whiteSpace: 'nowrap',
            }}>
              {idx === 0 && c.call_count > 0 && (
                <span style={{ color: '#F59E0B', fontSize: 10 }}>👑</span>
              )}
              <span style={{ color: '#ccc', fontWeight: 700 }}>{firstName(c.rep_name)}</span>
              <span style={{ color: c.call_count === 0 ? '#555' : '#fff', fontWeight: 800 }}>
                {c.call_count}
              </span>
              <span style={{ color: '#555', fontSize: 9 }}>calls</span>
              {c.booked_count > 0 && (
                <>
                  <span style={{ color: '#22c55e', fontWeight: 800 }}>· {c.booked_count}</span>
                  <span style={{ color: '#555', fontSize: 9 }}>booked</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Headline events */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
        borderLeft: '1px solid #1e1e1e', paddingLeft: 18,
      }}>
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
