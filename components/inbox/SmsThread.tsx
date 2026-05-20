'use client';

// Reusable SMS bubble thread — matches the rep-cockpit mockup
// (mockups/2026-05-19-rep-cockpit/drawer-open.html). Used in both the top-level
// Inbox view and inline on the expanded lead row.

import React from 'react';

type Msg = {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status?: string | null;
  keyword?: string | null;
  created_at: string;
};

type Props = {
  messages: Msg[];
  emptyLabel?: string;
};

const fmtTs = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'America/Toronto',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    }) + ' ET';
  } catch { return ''; }
};

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      timeZone: 'America/Toronto',
      month: 'short',
      day: 'numeric',
    });
  } catch { return ''; }
};

const SmsThread = ({ messages, emptyLabel = 'No messages yet' }: Props) => {
  if (!messages || messages.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '11px', fontStyle: 'italic' }}>
        {emptyLabel}
      </div>
    );
  }

  // Chronological order (oldest top), Twilio-style.
  const ordered = [...messages].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  let lastDate: string | null = null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
      {ordered.map(m => {
        const isOut = m.direction === 'outbound';
        const dateStr = fmtDate(m.created_at);
        const showDateDivider = dateStr !== lastDate;
        lastDate = dateStr;
        return (
          <React.Fragment key={m.id}>
            {showDateDivider && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 2px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.12em', textTransform: 'uppercase' }}>{dateStr}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
            )}
            <div style={{
              alignSelf: isOut ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '8px 11px',
              fontSize: '12.5px',
              lineHeight: 1.5,
              borderRadius: '12px',
              background: isOut ? 'var(--accent-glow-08)' : 'var(--bg-elev-1)',
              border: `1px solid ${isOut ? 'var(--accent-glow-22)' : 'var(--border)'}`,
              color: isOut ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottomRightRadius: isOut ? '3px' : '12px',
              borderBottomLeftRadius: isOut ? '12px' : '3px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {m.body}
            </div>
            <span style={{
              alignSelf: isOut ? 'flex-end' : 'flex-start',
              fontFamily: 'JetBrains Mono,monospace',
              fontSize: '9px',
              color: 'var(--text-muted)',
              letterSpacing: '.1em',
              margin: '0 4px',
              textTransform: 'uppercase',
            }}>
              {isOut ? 'SENT' : 'RECEIVED'} · {fmtTs(m.created_at)}
              {m.keyword ? ` · ${m.keyword}` : ''}
              {m.status === 'failed' ? ' · ⚠ FAILED' : ''}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default SmsThread;
