'use client';

// SMS composer — used in InboxView and inline on the lead row.
// Calls /api/send-sms which handles Twilio + opt-out check + sms_messages insert.

import React, { useState } from 'react';

type Props = {
  leadId: string;
  leadPhone: string;
  repId: string;
  optedOut?: boolean;
  onSent?: () => void;
  setToast?: (t: { message: string; type: 'success' | 'error' }) => void;
  initialBody?: string;
  autoFocus?: boolean;
};

const SmsComposer = ({ leadId, leadPhone, repId, optedOut, onSent, setToast, initialBody, autoFocus }: Props) => {
  const [body, setBody] = useState(initialBody || '');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, rep_id: repId, body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (setToast) setToast({ message: data.error || 'Failed to send SMS', type: 'error' });
        setSending(false);
        return;
      }
      if (setToast) setToast({ message: '✓ SMS sent', type: 'success' });
      setBody('');
      if (onSent) onSent();
    } catch (err: any) {
      if (setToast) setToast({ message: err.message || 'Network error', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (optedOut) {
    return (
      <div style={{ padding: '10px 12px', background: 'rgba(255,96,96,.08)', border: '1px solid rgba(255,96,96,.25)', borderRadius: '8px', color: 'var(--red)', fontSize: '11px', fontWeight: 600 }}>
        🚫 This lead opted out of SMS (replied STOP). Sending is blocked.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
        placeholder={`Text ${leadPhone} — ⌘↵ to send`}
        rows={initialBody ? 5 : 2}
        disabled={sending}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          padding: '10px 12px',
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontFamily: 'Inter,sans-serif',
          resize: 'vertical',
          minHeight: '42px',
        }}
      />
      <button
        onClick={send}
        disabled={sending || !body.trim()}
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          background: sending || !body.trim() ? 'var(--bg-elev-2)' : 'var(--accent-glow-15)',
          border: `1px solid ${sending || !body.trim() ? 'var(--border)' : 'var(--accent-glow-50)'}`,
          color: sending || !body.trim() ? 'var(--text-faint)' : 'var(--accent-ink)',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          cursor: sending || !body.trim() ? 'not-allowed' : 'pointer',
          transition: 'all .15s',
          whiteSpace: 'nowrap',
        }}
      >
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
};

export default SmsComposer;
