'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS, CALLBACK_REASON_LABELS, CALLBACK_REASON_COLORS } from '@/lib/constants';

const STATUS_FROM_OUTCOME: Record<string, string> = {
  no_answer: 'contacted',
  voicemail_left: 'voicemail',
  callback_requested: 'callback',
  not_interested: 'not_interested',
  booked_call: 'booked',
  discovery_completed: 'discovery_completed',
  no_show: 'no_show',
  wrong_number: 'wrong_number',
};

type EditCallLogModalProps = {
  log: any;
  onClose: () => void;
  onSaved: () => void;
};

const EditCallLogModal = ({ log, onClose, onSaved }: EditCallLogModalProps) => {
  const [businessName, setBusinessName] = useState(log.business_name || '');
  const initialSelected = (() => {
    const arr: string[] = [];
    if (log.outcome) arr.push(log.outcome);
    if (Array.isArray(log.additional_outcomes)) {
      for (const o of log.additional_outcomes) if (o && !arr.includes(o)) arr.push(o);
    }
    return arr;
  })();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const outcome = selected[0] || '';
  const [notes, setNotes] = useState(log.notes || '');
  const [callbackDate, setCallbackDate] = useState(log.callback_date || '');
  const [callbackTime, setCallbackTime] = useState(log.callback_time || '');
  const initialReasonSelected = (() => {
    const arr: string[] = [];
    if (log.callback_reason) arr.push(log.callback_reason);
    if (Array.isArray(log.additional_callback_reasons)) {
      for (const r of log.additional_callback_reasons) if (r && !arr.includes(r)) arr.push(r);
    }
    return arr;
  })();
  const [reasonSelected, setReasonSelected] = useState<string[]>(initialReasonSelected);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOutcome = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const toggleReason = (key: string) => {
    setReasonSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!outcome) { setError('Outcome is required'); return; }
    setSaving(true);
    setError(null);
    const additional = selected.slice(1);
    const additionalReasons = reasonSelected.slice(1);
    const isCallback = selected.includes('callback_requested');
    const primaryReason = reasonSelected[0] || '';
    try {
      const updates: Record<string, any> = {
        outcome,
        notes: notes || null,
        callback_date: isCallback ? (callbackDate || null) : null,
        callback_time: isCallback ? (callbackTime || null) : null,
        callback_reason: isCallback ? (primaryReason || null) : null,
        business_name: businessName || null,
      };
      // Always write these fields so removing secondaries clears the stored array
      // instead of leaving stale tags from a prior save.
      updates.additional_outcomes = additional.length > 0 ? additional : null;
      updates.additional_callback_reasons = isCallback && additionalReasons.length > 0 ? additionalReasons : null;
      const { error: logErr } = await supabase.from('call_logs').update(updates).eq('id', log.id);
      if (logErr) throw logErr;

      if (log.lead_id && STATUS_FROM_OUTCOME[outcome]) {
        const { error: leadErr } = await supabase
          .from('leads')
          .update({ status: STATUS_FROM_OUTCOME[outcome], updated_at: new Date().toISOString() })
          .eq('id', log.lead_id);
        if (leadErr) throw leadErr;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete this call log for "${log.business_name || 'this lead'}"?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const { error: delErr } = await supabase.from('call_logs').delete().eq('id', log.id);
      if (delErr) throw delErr;

      if (log.lead_id) {
        const { data: remainingLogs } = await supabase
          .from('call_logs')
          .select('outcome, created_at')
          .eq('lead_id', log.lead_id)
          .order('created_at', { ascending: false })
          .limit(1);
        const newStatus = remainingLogs && remainingLogs.length > 0
          ? (STATUS_FROM_OUTCOME[remainingLogs[0].outcome] || 'contacted')
          : 'new';
        await supabase
          .from('leads')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', log.lead_id);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.03)',
    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
    fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.1em',
    textTransform: 'uppercase', display: 'block', marginBottom: '4px',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
        backdropFilter: 'blur(6px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card-glow"
        style={{
          width: '100%', maxWidth: '560px', padding: '24px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--accent-ink)' }}>
            Edit Call Log
          </p>
          <button
            onClick={onClose}
            className="modal-close-btn"
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              fontSize: '20px', cursor: 'pointer', padding: '0 6px', lineHeight: 1,
            }}
            aria-label="Close"
          >×</button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Business Name</label>
          <input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            style={fieldStyle}
            className="field"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Outcome *</label>
          <p style={{ margin: '0 0 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Tap to select. First pick is primary; add more if needed.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(OUTCOME_LABELS).map(([key, label]) => {
              const idx = selected.indexOf(key);
              const isPrimary = idx === 0;
              const isSecondary = idx > 0;
              const isSelected = idx >= 0;
              const color = OUTCOME_COLORS[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleOutcome(key)}
                  className="outcome-chip"
                  style={{
                    padding: '7px 14px', borderRadius: '7px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700, fontFamily: 'Inter,sans-serif',
                    transition: 'all .15s',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: isPrimary ? `${color}28` : isSecondary ? `${color}12` : 'transparent',
                    border: `1px solid ${isPrimary ? color : isSecondary ? color + '55' : 'var(--border)'}`,
                    color: isSelected ? color : 'var(--text-muted)',
                    boxShadow: isPrimary ? `0 0 0 1px ${color}44 inset` : 'none',
                  }}
                >
                  {isSelected && (
                    <span style={{
                      fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px',
                      background: isPrimary ? `${color}44` : 'transparent',
                      border: isPrimary ? 'none' : `1px solid ${color}66`,
                      color: isPrimary ? 'var(--text-primary)' : color,
                      fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.05em',
                    }}>{isPrimary ? 'PRIMARY' : `+${idx}`}</span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {selected.includes('callback_requested') && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Callback Date</label>
                <input
                  type="date"
                  value={callbackDate}
                  onChange={e => setCallbackDate(e.target.value)}
                  style={{ ...fieldStyle, maxWidth: '180px', colorScheme: 'dark' }}
                  className="field"
                />
              </div>
              <div>
                <label style={labelStyle}>Callback Time</label>
                <input
                  type="time"
                  value={callbackTime}
                  onChange={e => setCallbackTime(e.target.value)}
                  style={{ ...fieldStyle, maxWidth: '140px', colorScheme: 'dark' }}
                  className="field"
                />
              </div>
            </div>
            <label style={labelStyle}>Callback Reason</label>
            <p style={{ margin: '0 0 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              Tap to select. First pick is primary; add more if needed.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(CALLBACK_REASON_LABELS).map(([key, label]) => {
                const idx = reasonSelected.indexOf(key);
                const isPrimary = idx === 0;
                const isSecondary = idx > 0;
                const isSelected = idx >= 0;
                const color = CALLBACK_REASON_COLORS[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleReason(key)}
                    className="reason-chip"
                    style={{
                      padding: '6px 12px', borderRadius: '7px', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700, fontFamily: 'Inter,sans-serif',
                      transition: 'all .15s',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: isPrimary ? `${color}28` : isSecondary ? `${color}12` : 'transparent',
                      border: `1px solid ${isPrimary ? color : isSecondary ? color + '55' : 'var(--border)'}`,
                      color: isSelected ? color : 'var(--text-muted)',
                      boxShadow: isPrimary ? `0 0 0 1px ${color}44 inset` : 'none',
                    }}
                  >
                    {isSelected && (
                      <span style={{
                        fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px',
                        background: isPrimary ? `${color}44` : 'transparent',
                        border: isPrimary ? 'none' : `1px solid ${color}66`,
                        color: isPrimary ? 'var(--text-primary)' : color,
                        fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.05em',
                      }}>{isPrimary ? 'PRIMARY' : `+${idx}`}</span>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ ...fieldStyle, minHeight: '90px', resize: 'vertical' }}
            className="field"
            rows={4}
          />
        </div>

        {error && (
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--red)' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            style={{
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, fontFamily: 'Inter,sans-serif',
              background: 'transparent', border: '1px solid rgba(255,96,96,.4)',
              color: 'var(--red)',
              opacity: (saving || deleting) ? 0.4 : 1,
            }}
          >{deleting ? 'Deleting...' : 'Delete'}</button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={saving || deleting}
              style={{
                padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700, fontFamily: 'Inter,sans-serif',
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-tertiary)',
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || deleting || !outcome}
              style={{
                padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 800, fontFamily: 'Inter,sans-serif',
                border: 'none',
                background: 'var(--accent-glow-15)', color: 'var(--accent-ink)',
                opacity: (saving || deleting || !outcome) ? 0.4 : 1,
              }}
            >{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCallLogModal;
