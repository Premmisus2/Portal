'use client';

// Timeline of every touchpoint on a lead. Renders TimelineEntry[] from
// features/leads/getLeadTimeline — calls + outbound SMS, sorted newest-first.
// Used inside the Sales Floor drawer.

import { useState } from 'react';
import type { TimelineEntry } from '@/features/leads';

interface LeadTimelineProps {
  entries: TimelineEntry[];
  loading: boolean;
  error: string | null;
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const OUTCOME_LABELS: Record<string, string> = {
  no_answer: 'No Answer',
  voicemail_left: 'Voicemail Left',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  booked_call: 'Booked Discovery',
  wrong_number: 'Wrong Number',
  discovery_completed: 'Discovery Completed',
  no_show: 'No Show',
  inbound_callback: 'Inbound Callback',
  ai_receptionist: 'AI Receptionist',
};

const CONNECT_OUTCOMES = new Set([
  'callback_requested', 'not_interested', 'booked_call',
  'discovery_completed', 'inbound_callback',
]);

function CallEntry({ entry }: { entry: Extract<TimelineEntry, { kind: 'call' }> }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const isConnect = CONNECT_OUTCOMES.has(entry.outcome);
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a1a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isConnect ? '#22c55e' : '#888' }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: isConnect ? '#22c55e' : '#888' }}>
            {isConnect ? 'CONNECT' : 'TOUCH'} · CALL
          </span>
          <span style={{ fontSize: 11, color: '#888' }}>{OUTCOME_LABELS[entry.outcome] || entry.outcome}</span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#555' }}>
          {shortTime(entry.created_at)}
          {entry.duration_seconds ? ` · ${entry.duration_seconds}s` : ''}
        </span>
      </div>
      {entry.notes && (
        <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5, marginTop: 4 }}>
          {entry.notes}
        </div>
      )}
      {entry.transcript && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setTranscriptOpen((v) => !v)}
            style={{
              background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: '.1em', textTransform: 'uppercase', color: '#888', cursor: 'pointer',
            }}
          >
            {transcriptOpen ? '▼ Hide Transcript' : '▶ Show Transcript'}
          </button>
          {transcriptOpen && (
            <div style={{ marginTop: 6, padding: 10, background: '#0d0d0d', borderRadius: 6, fontSize: 12, color: '#aaa', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {entry.transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SmsEntry({ entry }: { entry: Extract<TimelineEntry, { kind: 'sms' }> }) {
  const outbound = entry.direction === 'outbound';
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1a1a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: outbound ? '#00F0FF' : '#F59E0B' }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: outbound ? '#00F0FF' : '#F59E0B' }}>
            {outbound ? 'SENT · SMS' : 'INBOUND · SMS'}
          </span>
          {entry.status && entry.status !== 'queued' && entry.status !== 'sent' && entry.status !== 'delivered' && (
            <span style={{ fontSize: 10, color: '#ff6060', fontFamily: "'JetBrains Mono',monospace" }}>
              · {entry.status.toUpperCase()}
            </span>
          )}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#555' }}>
          {shortTime(entry.created_at)}
        </span>
      </div>
      <div style={{
        marginTop: 4, padding: 10,
        background: outbound ? 'rgba(0,240,255,.04)' : 'rgba(245,158,11,.04)',
        border: `1px solid ${outbound ? 'rgba(0,240,255,.15)' : 'rgba(245,158,11,.15)'}`,
        borderRadius: 8, fontSize: 12, color: '#ccc', lineHeight: 1.5,
      }}>
        {entry.body}
      </div>
    </div>
  );
}

export default function LeadTimeline({ entries, loading, error }: LeadTimelineProps) {
  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 12, height: 64, background: '#0d0d0d', borderRadius: 8, opacity: 0.5 }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 16, color: '#ff6060', fontSize: 12 }}>
        Timeline unavailable: {error}
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#555', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
        No touches yet. Be the first.
      </div>
    );
  }
  return (
    <div>
      {entries.map((entry) =>
        entry.kind === 'call'
          ? <CallEntry key={`call-${entry.id}`} entry={entry} />
          : <SmsEntry key={`sms-${entry.id}`} entry={entry} />
      )}
    </div>
  );
}
