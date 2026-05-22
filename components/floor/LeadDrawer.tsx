'use client';

// LeadDrawer — slides in from the right when a row is clicked on /floor.
//
// Per 2026-05-21 pre-build audit:
//   * Rendered via React Portal to document.body so the mobile fullscreen
//     modal layout doesn't get trapped by an ancestor's containing block.
//   * Stays open even if an action would have filtered the lead out of the
//     parent sheet (pinned-active-lead pattern enforced in LeadSheet via
//     data memo + at the FloorPage level).
//   * On mutation error: toast + revert optimistic, NEVER unmount the drawer
//     (rep loses their call notes).

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { FloorLead } from './types';
import { getLeadTimeline, updateLeadOutcome, type TimelineEntry, type LeadStatus } from '@/features/leads';
import { sendSms } from '@/features/messaging';
import { scheduleCallback, findCallbackConflicts } from '@/features/reminders';
import { recordAuditEvent } from '@/features/audit';
import LeadTimeline from './LeadTimeline';

interface LeadDrawerProps {
  lead: FloorLead;
  repId: string;
  onClose: () => void;
  onLeadUpdated: (updated: Partial<FloorLead> & { id: string }) => void;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'callback', label: 'Callback' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'booked', label: 'Booked' },
  { value: 'discovery_completed', label: 'Discovery Completed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'wrong_number', label: 'Wrong Number' },
];

function ordinal(n: number): string {
  if (n <= 0) return '0';
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

export default function LeadDrawer({ lead, repId, onClose, onLeadUpdated }: LeadDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [smsComposerOpen, setSmsComposerOpen] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [callbackPickerOpen, setCallbackPickerOpen] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [callbackNotes, setCallbackNotes] = useState('');
  const [callbackBusy, setCallbackBusy] = useState(false);
  const [callbackRecurrence, setCallbackRecurrence] = useState<string>(''); // '' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  const [callbackConflicts, setCallbackConflicts] = useState<Array<{ id: string; businessName: string; scheduledAtUtc: string }>>([]);

  // Conflict detection — debounced query when date+time both set. Warns
  // (never blocks) per audit consensus. Per-rep scoped via RPC.
  useEffect(() => {
    if (!callbackDate || !callbackTime || !repId) {
      setCallbackConflicts([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const target = new Date(`${callbackDate}T${callbackTime}:00`);
        if (Number.isNaN(target.getTime())) return;
        const conflicts = await findCallbackConflicts({ repId, targetUtc: target, windowMinutes: 15 });
        // Filter out the lead's own existing callback (rescheduling shouldn't warn about self).
        setCallbackConflicts(conflicts.filter(c => c.id !== lead.id));
      } catch {
        // Silent — conflict detection is advisory only.
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [callbackDate, callbackTime, repId, lead.id]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Esc closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Body scroll lock while drawer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fetch timeline on lead change. AbortController prevents an in-flight
  // request for the previous lead from racing with the new one when the
  // rep clicks rapidly through multiple leads.
  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    setTimelineLoading(true);
    setTimelineError(null);
    getLeadTimeline(lead.id)
      .then((entries) => {
        if (cancelled || ac.signal.aborted) return;
        setTimeline(entries);
      })
      .catch((err: Error) => {
        if (cancelled || ac.signal.aborted) return;
        setTimelineError(err.message);
      })
      .finally(() => { if (!cancelled && !ac.signal.aborted) setTimelineLoading(false); });
    return () => { cancelled = true; ac.abort(); };
  }, [lead.id]);

  const flashToast = useCallback((text: string, tone: 'success' | 'error' = 'success') => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── ACTION: Call Now ─────────────────────────────────────────────
  const handleCallNow = useCallback(async () => {
    if (!lead.phone) { flashToast('Lead has no phone number', 'error'); return; }
    try {
      const res = await fetch('/api/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, repId, phone: lead.phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      flashToast('☎ Dialing — pick up your cell');
      void recordAuditEvent({
        actionType: 'floor.lead_navigated',
        leadId: lead.id,
        payload: { action: 'call_now_initiated', source: 'cockpit' },
      });
    } catch (err) {
      flashToast(`Call failed: ${(err as Error).message}`, 'error');
    }
  }, [lead.id, lead.phone, repId, flashToast]);

  // ── ACTION: Update Status ────────────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: LeadStatus) => {
    const prevStatus = lead.status;
    // Optimistic.
    onLeadUpdated({ id: lead.id, status: newStatus });
    try {
      await updateLeadOutcome({
        leadId: lead.id,
        newStatus,
        reason: 'manual override via /floor drawer',
      });
      flashToast(`Status → ${newStatus}`);
    } catch (err) {
      // Revert.
      onLeadUpdated({ id: lead.id, status: prevStatus });
      flashToast(`Status update failed: ${(err as Error).message}`, 'error');
    }
  }, [lead.id, lead.status, onLeadUpdated, flashToast]);

  // ── ACTION: Send SMS ─────────────────────────────────────────────
  const handleSendSms = useCallback(async () => {
    if (!smsBody.trim()) { flashToast('SMS body empty', 'error'); return; }
    setSmsSending(true);
    const result = await sendSms({
      leadId: lead.id,
      repId,
      body: smsBody.trim(),
    });
    setSmsSending(false);
    if (result.success) {
      flashToast('SMS sent');
      setSmsBody('');
      setSmsComposerOpen(false);
      // Refresh timeline.
      getLeadTimeline(lead.id).then(setTimeline).catch(() => {});
    } else {
      flashToast(`SMS failed: ${result.error}`, 'error');
    }
  }, [smsBody, lead.id, repId, flashToast]);

  // ── ACTION: Schedule Callback ────────────────────────────────────
  // Toggles the picker. The actual scheduling happens on Confirm via
  // handleConfirmCallback below. Rep enters date + time in their own
  // timezone (browser default); we convert to UTC at write time and store
  // the wall-clock + tz alongside for DST verification.
  const handleScheduleCallback = useCallback(() => {
    setCallbackPickerOpen((v) => !v);
  }, []);

  const handleConfirmCallback = useCallback(async () => {
    if (!callbackDate || !callbackTime) {
      flashToast('Pick a date and time', 'error');
      return;
    }
    // Build a Date in the browser's local timezone, then send as UTC.
    // The rep's timezone is captured from Intl — matches whatever their
    // browser says they're in. Stored alongside for DST safety.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
    const local = new Date(`${callbackDate}T${callbackTime}:00`);
    if (Number.isNaN(local.getTime())) {
      flashToast('Invalid date or time', 'error');
      return;
    }
    setCallbackBusy(true);
    try {
      await scheduleCallback({
        leadId: lead.id,
        repId,
        scheduledAtUtc: local,
        scheduledLocalTime: callbackTime,
        scheduledTz: tz,
        notes: callbackNotes.trim() || null,
        recurrenceRule: callbackRecurrence ? `FREQ=${callbackRecurrence}` : null,
      });
      flashToast(`Callback scheduled for ${callbackDate} ${callbackTime}`);
      // Optimistic: update local lead state so the row + drawer reflect callback.
      onLeadUpdated({
        id: lead.id,
        status: 'callback' as LeadStatus,
        callback_date: callbackDate,
      });
      // Reset picker.
      setCallbackPickerOpen(false);
      setCallbackDate('');
      setCallbackTime('');
      setCallbackNotes('');
      setCallbackRecurrence('');
      setCallbackConflicts([]);
      // Refresh timeline (the scheduled callback isn't a timeline event yet, but
      // status change + future audit_log row may be relevant).
      getLeadTimeline(lead.id).then(setTimeline).catch(() => {});
    } catch (err) {
      flashToast(`Schedule failed: ${(err as Error).message}`, 'error');
    } finally {
      setCallbackBusy(false);
    }
  }, [callbackDate, callbackTime, callbackNotes, callbackRecurrence, lead.id, repId, flashToast, onLeadUpdated]);

  if (!mounted) return null;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Lead detail: ${lead.business_name}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: '#080808', borderLeft: '1px solid #1e1e1e',
          zIndex: 1001, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,.6)',
        }}
      >
        {/* Header */}
        <header style={{ padding: '16px 18px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', marginBottom: 4 }}>
                LEAD · {lead.niche || '—'}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.business_name}
              </h2>
              {lead.contact_name && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {lead.contact_name}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              style={{
                background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 6,
                width: 28, height: 28, color: '#888', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8,
              }}
            >✕</button>
          </div>
          {/* Banner: Nth call · Mth connect */}
          <div style={{
            display: 'flex', gap: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
            color: '#888', marginTop: 6,
          }}>
            <span><strong style={{ color: '#ccc' }}>{ordinal(lead.touch_count || 0)}</strong> call</span>
            <span>·</span>
            <span><strong style={{ color: '#ccc' }}>{ordinal(lead.connect_count || 0)}</strong> connect</span>
            {lead.phone && (
              <>
                <span>·</span>
                <a href={`tel:${lead.phone}`} style={{ color: '#00F0FF', textDecoration: 'none' }}>{lead.phone}</a>
              </>
            )}
          </div>
        </header>

        {/* Timeline (scrollable middle) */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            padding: '12px 18px 6px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
            letterSpacing: '.15em', textTransform: 'uppercase', color: '#555',
          }}>
            Timeline
          </div>
          <LeadTimeline entries={timeline} loading={timelineLoading} error={timelineError} />

          {/* Callback scheduler (collapsible) */}
          {callbackPickerOpen && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid #1a1a1a', background: '#0a0a0a' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 8 }}>
                ⏱ SCHEDULE CALLBACK
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{
                    flex: 1, background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                    padding: '10px 12px', color: '#fff', fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    colorScheme: 'dark',
                  }}
                />
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  style={{
                    width: 110, background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                    padding: '10px 12px', color: '#fff', fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    colorScheme: 'dark',
                  }}
                />
              </div>
              {/* Conflict warning — advisory only, never blocks. Audit-locked per-rep scope. */}
              {callbackConflicts.length > 0 && (
                <div style={{
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)',
                  borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 11,
                  color: '#fbbf24', fontFamily: 'Inter, sans-serif',
                }}>
                  ⚠️ Overlaps within ±15min:{' '}
                  {callbackConflicts.slice(0, 2).map(c => c.businessName).join(', ')}
                  {callbackConflicts.length > 2 && ` +${callbackConflicts.length - 2}`}
                </div>
              )}
              <textarea
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                placeholder="Why are you calling them back? (optional)"
                rows={2}
                style={{
                  width: '100%', background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                  padding: 10, color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif',
                  resize: 'vertical', minHeight: 50,
                }}
              />
              {/* Recurrence picker — sets RRULE FREQ. Server expands next occurrence on Complete. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#888', fontFamily: 'Inter, sans-serif' }}>Repeat:</span>
                <select
                  value={callbackRecurrence}
                  onChange={(e) => setCallbackRecurrence(e.target.value)}
                  style={{
                    background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                    padding: '6px 8px', color: '#fff', fontSize: 12, fontFamily: 'Inter, sans-serif',
                    colorScheme: 'dark', cursor: 'pointer',
                  }}
                >
                  <option value="">No repeat</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Every 2 weeks</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div style={{ fontSize: 10, color: '#555', fontFamily: "'JetBrains Mono', monospace", marginTop: 6, marginBottom: 8 }}>
                Reminders T-60/30/10 · auto-confirm SMS to lead at booking · {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setCallbackPickerOpen(false); setCallbackDate(''); setCallbackTime(''); setCallbackNotes(''); setCallbackRecurrence(''); setCallbackConflicts([]); }}
                  style={{ background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: '#888', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >Cancel</button>
                <button
                  onClick={handleConfirmCallback}
                  disabled={callbackBusy || !callbackDate || !callbackTime}
                  style={{
                    background: !callbackBusy && callbackDate && callbackTime ? '#F59E0B' : '#1e1e1e',
                    color: !callbackBusy && callbackDate && callbackTime ? '#000' : '#555', border: 'none',
                    borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 800,
                    cursor: callbackBusy ? 'not-allowed' : 'pointer',
                    letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif',
                  }}
                >{callbackBusy ? 'Scheduling…' : 'Schedule'}</button>
              </div>
            </div>
          )}

          {/* SMS composer (collapsible) */}
          {smsComposerOpen && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid #1a1a1a', background: '#0a0a0a' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', marginBottom: 8 }}>
                COMPOSE SMS · TO {lead.phone || '—'}
              </div>
              <textarea
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                style={{
                  width: '100%', background: '#000', border: '1px solid #1e1e1e', borderRadius: 6,
                  padding: 10, color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif',
                  resize: 'vertical', minHeight: 80,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: '#555', fontFamily: "'JetBrains Mono',monospace" }}>
                  {smsBody.length} / 1500
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setSmsComposerOpen(false); setSmsBody(''); }}
                    style={{ background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: '#888', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >Cancel</button>
                  <button
                    onClick={handleSendSms}
                    disabled={smsSending || !smsBody.trim()}
                    style={{
                      background: smsBody.trim() ? '#00F0FF' : '#1e1e1e',
                      color: smsBody.trim() ? '#000' : '#555', border: 'none',
                      borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 800,
                      cursor: smsBody.trim() && !smsSending ? 'pointer' : 'not-allowed',
                      letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif',
                    }}
                  >{smsSending ? 'Sending…' : 'Send SMS'}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <footer style={{ padding: 14, borderTop: '1px solid #1e1e1e', background: '#0a0a0a', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={handleCallNow}
            style={{
              flex: '1 1 100px', background: '#00F0FF', color: '#000', border: 'none',
              borderRadius: 8, padding: '10px 14px', fontWeight: 800, fontSize: 12,
              letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >☎ Call Now</button>
          <button
            onClick={() => setSmsComposerOpen((v) => !v)}
            style={{
              flex: '1 1 100px', background: 'transparent', color: '#00F0FF',
              border: '1px solid rgba(0,240,255,.3)', borderRadius: 8, padding: '10px 14px',
              fontWeight: 700, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >💬 {smsComposerOpen ? 'Hide SMS' : 'Send SMS'}</button>
          <button
            onClick={handleScheduleCallback}
            style={{
              flex: '1 1 100px', background: 'transparent', color: '#ccc',
              border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 14px',
              fontWeight: 700, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >⏱ Schedule Callback</button>
          {/* Status select */}
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            style={{
              flex: '1 1 100px', background: '#000', color: '#ccc',
              border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px',
              fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </footer>

        {/* Toast */}
        {toast && (
          <div
            role="status"
            style={{
              position: 'absolute', bottom: 76, left: '50%', transform: 'translateX(-50%)',
              background: '#0d0d0d',
              border: `1px solid ${toast.tone === 'error' ? 'rgba(255,68,68,.4)' : 'rgba(0,240,255,.4)'}`,
              borderRadius: 8, padding: '8px 14px',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700,
              color: toast.tone === 'error' ? '#ff6060' : '#00F0FF',
              boxShadow: '0 8px 32px rgba(0,0,0,.5)',
              letterSpacing: '.06em', textTransform: 'uppercase',
              maxWidth: 380, textAlign: 'center',
            }}
          >
            {toast.text}
          </div>
        )}
      </aside>
    </>
  );

  return createPortal(drawerContent, document.body);
}
