'use client';

// Agenda Queue — the "front door" of /floor. Sticky Next Action card at top
// shows the ONE most urgent callback. Below it: 🚨 Overdue / ⚡ Today / 📅 Upcoming
// collapsible sections.
//
// Phase 1 of finish-build (locked 2026-05-22 after 6-prong audit). The card +
// sections together replace the "rep has to hunt for their next call" gap —
// every prong flagged this as the highest-impact missing piece for adoption.

import { useEffect, useState, useCallback } from 'react';
import {
  getAgendaQueue,
  groupAgendaQueue,
  completeCallback,
  type AgendaQueueRow,
  type AgendaQueueGrouped,
} from '@/features/reminders';

interface AgendaQueueProps {
  /** The rep whose agenda to display. In shadow view this is the shadow rep id. */
  repId: string;
  /** Called when rep wants to open a lead drawer (deep-link to /floor?lead=…). */
  onOpenLead: (leadId: string) => void;
}

const POLL_INTERVAL_MS = 60_000; // gentle — agenda doesn't churn fast

function shortTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

function relativeWhen(iso: string, nowMs: number): string {
  const t = new Date(iso).getTime();
  const diffMin = Math.round((t - nowMs) / 60_000);
  if (diffMin < -60) return `${Math.floor(-diffMin / 60)}h overdue`;
  if (diffMin < 0) return `${-diffMin}m overdue`;
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `in ${diffMin}m`;
  return `in ${Math.floor(diffMin / 60)}h`;
}

function firstName(full: string | null): string {
  return full?.split(/\s+/)[0] || '';
}

export default function AgendaQueue({ repId, onOpenLead }: AgendaQueueProps) {
  const [rows, setRows] = useState<AgendaQueueRow[]>([]);
  const [grouped, setGrouped] = useState<AgendaQueueGrouped>({ overdue: [], today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [collapsedUpcoming, setCollapsedUpcoming] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repId) return;
    const next = await getAgendaQueue(repId);
    setRows(next);
    setGrouped(groupAgendaQueue(next));
    setLoading(false);
  }, [repId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    refresh();
    const id = setInterval(() => { if (mounted) refresh(); }, POLL_INTERVAL_MS);
    return () => { mounted = false; clearInterval(id); };
  }, [refresh]);

  const handleCallNow = (row: AgendaQueueRow) => {
    onOpenLead(row.lead_id);
  };

  const handleComplete = async (row: AgendaQueueRow) => {
    setBusyId(row.id);
    try {
      await completeCallback({ callbackTaskId: row.id, leadId: row.lead_id });
      await refresh();
    } catch (err) {
      console.error('[AgendaQueue] complete failed', err);
    } finally {
      setBusyId(null);
    }
  };

  // Pick the "Next Action": earliest overdue if any, else earliest today, else
  // earliest upcoming. Falls back to null if nothing in 7 days.
  const next: AgendaQueueRow | null =
    grouped.overdue[0] || grouped.today[0] || grouped.upcoming[0] || null;

  if (loading) {
    return (
      <div style={skeletonStyle} aria-busy="true">
        <div style={{ color: '#666', fontSize: 13 }}>Loading agenda…</div>
      </div>
    );
  }

  if (!next && rows.length === 0) {
    return null; // no callbacks at all — let the existing lead sheet show through
  }

  return (
    <div style={wrapperStyle}>
      {/* Sticky Next Action card */}
      {next && (
        <div style={nextCardStyle(next, Date.now())}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={badgeStyle(next, Date.now())}>
              {grouped.overdue.includes(next) ? '🚨 NEXT (overdue)' : '⚡ NEXT'}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00F0FF' }}>
              {shortTime(next.scheduled_at_utc, next.scheduled_tz)} · {relativeWhen(next.scheduled_at_utc, Date.now())}
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 600, color: '#fff' }}>
            {next.business_name}
            {next.contact_name && (
              <span style={{ color: '#aaa', fontWeight: 400, fontSize: 14 }}> · {next.contact_name}</span>
            )}
          </div>
          {next.notes && (
            <div style={{ marginTop: 4, fontSize: 13, color: '#888', fontStyle: 'italic' }}>
              "{next.notes.slice(0, 120)}{next.notes.length > 120 ? '…' : ''}"
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => handleCallNow(next)} style={primaryBtn}>
              📞 Open & Call Now
            </button>
            <button
              onClick={() => handleComplete(next)}
              disabled={busyId === next.id}
              style={secondaryBtn}
            >
              {busyId === next.id ? 'Saving…' : '✓ Mark Complete'}
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      {grouped.overdue.length > 1 && (
        <Section
          title="🚨 Overdue"
          color="#ef4444"
          rows={grouped.overdue.slice(1)} // first is in Next card
          nowMs={Date.now()}
          busyId={busyId}
          onCall={handleCallNow}
          onComplete={handleComplete}
          defaultOpen
        />
      )}
      {grouped.today.length > (grouped.overdue.length === 0 ? 1 : 0) && (
        <Section
          title="⚡ Today"
          color="#fbbf24"
          rows={grouped.overdue.length === 0 ? grouped.today.slice(1) : grouped.today}
          nowMs={Date.now()}
          busyId={busyId}
          onCall={handleCallNow}
          onComplete={handleComplete}
          defaultOpen
        />
      )}
      {grouped.upcoming.length > 0 && (
        <Section
          title="📅 Tomorrow & Upcoming"
          color="#3b82f6"
          rows={grouped.upcoming}
          nowMs={Date.now()}
          busyId={busyId}
          onCall={handleCallNow}
          onComplete={handleComplete}
          defaultOpen={!collapsedUpcoming}
          onToggle={() => setCollapsedUpcoming(c => !c)}
        />
      )}
    </div>
  );
}

function Section({
  title, color, rows, nowMs, busyId, onCall, onComplete, defaultOpen, onToggle,
}: {
  title: string;
  color: string;
  rows: AgendaQueueRow[];
  nowMs: number;
  busyId: string | null;
  onCall: (row: AgendaQueueRow) => void;
  onComplete: (row: AgendaQueueRow) => void;
  defaultOpen: boolean;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (rows.length === 0) return null;
  const toggle = () => {
    setOpen(o => !o);
    onToggle?.();
  };
  return (
    <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1a', borderRadius: 8 }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent',
          border: 'none', color, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
          letterSpacing: 0.5, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>{title} · {rows.length}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div>
          {rows.map(row => (
            <div key={row.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#888', minWidth: 60 }}>
                    {shortTime(row.scheduled_at_utc, row.scheduled_tz)}
                  </span>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{row.business_name}</span>
                  {row.contact_name && (
                    <span style={{ color: '#888', fontSize: 13 }}>· {firstName(row.contact_name)}</span>
                  )}
                  {row.recurrence_rule && <span title="Recurring" style={{ fontSize: 11 }}>🔁</span>}
                </div>
                {row.notes && (
                  <div style={{ marginTop: 2, fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.notes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => onCall(row)} style={smallBtn}>Open</button>
                <button
                  onClick={() => onComplete(row)}
                  disabled={busyId === row.id}
                  style={smallSecondaryBtn}
                >
                  {busyId === row.id ? '…' : '✓'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  padding: '16px',
  marginBottom: 16,
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(0,240,255,0.03), rgba(0,0,0,0))',
  border: '1px solid rgba(0,240,255,0.15)',
};

const skeletonStyle: React.CSSProperties = {
  padding: '24px',
  marginBottom: 16,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid #1a1a1a',
  textAlign: 'center',
};

function nextCardStyle(row: AgendaQueueRow, nowMs: number): React.CSSProperties {
  const overdue = new Date(row.scheduled_at_utc).getTime() < nowMs;
  return {
    padding: '14px 16px',
    borderRadius: 10,
    background: overdue ? 'rgba(239,68,68,0.08)' : 'rgba(0,240,255,0.05)',
    border: overdue ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(0,240,255,0.3)',
  };
}

function badgeStyle(row: AgendaQueueRow, nowMs: number): React.CSSProperties {
  const overdue = new Date(row.scheduled_at_utc).getTime() < nowMs;
  return {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    color: overdue ? '#ef4444' : '#00F0FF',
    padding: '3px 8px',
    borderRadius: 4,
    background: overdue ? 'rgba(239,68,68,0.15)' : 'rgba(0,240,255,0.1)',
  };
}

const primaryBtn: React.CSSProperties = {
  background: '#00F0FF',
  color: '#000',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 6,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14,
};

const secondaryBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#888',
  border: '1px solid #333',
  padding: '10px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  borderTop: '1px solid #1a1a1a',
};

const smallBtn: React.CSSProperties = {
  background: 'rgba(0,240,255,0.15)',
  color: '#00F0FF',
  border: '1px solid rgba(0,240,255,0.3)',
  padding: '4px 10px',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};

const smallSecondaryBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#666',
  border: '1px solid #333',
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};
