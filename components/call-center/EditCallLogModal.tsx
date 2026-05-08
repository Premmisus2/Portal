'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS } from '@/lib/constants';

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
  const [outcome, setOutcome] = useState(log.outcome || '');
  const [notes, setNotes] = useState(log.notes || '');
  const [callbackDate, setCallbackDate] = useState(log.callback_date || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!outcome) { setError('Outcome is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, any> = {
        outcome,
        notes: notes || null,
        callback_date: outcome === 'callback_requested' ? (callbackDate || null) : null,
        business_name: businessName || null,
      };
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
    border: '1px solid #1e1e1e', borderRadius: '8px', color: '#fff',
    fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.1em',
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
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#00F0FF' }}>
            Edit Call Log
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#555',
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setOutcome(key)}
                style={{
                  padding: '7px 14px', borderRadius: '7px', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 700, fontFamily: 'Inter,sans-serif',
                  transition: 'all .15s',
                  background: outcome === key ? `${OUTCOME_COLORS[key]}18` : 'transparent',
                  border: `1px solid ${outcome === key ? OUTCOME_COLORS[key] + '66' : '#1e1e1e'}`,
                  color: outcome === key ? OUTCOME_COLORS[key] : '#555',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {outcome === 'callback_requested' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Callback Date</label>
            <input
              type="date"
              value={callbackDate}
              onChange={e => setCallbackDate(e.target.value)}
              style={{ ...fieldStyle, maxWidth: '200px', colorScheme: 'dark' }}
              className="field"
            />
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
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#ff6060' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            style={{
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, fontFamily: 'Inter,sans-serif',
              background: 'transparent', border: '1px solid rgba(255,96,96,.4)',
              color: '#ff6060',
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
                background: 'transparent', border: '1px solid #1e1e1e', color: '#888',
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || deleting || !outcome}
              style={{
                padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 800, fontFamily: 'Inter,sans-serif',
                border: 'none',
                background: 'rgba(0,240,255,.15)', color: '#00F0FF',
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
