'use client';

// Disposition modal for inbound callbacks (call_logs.outcome = 'inbound_callback').
// When a lead calls our Twilio number back after a cold call, the rep needs to
// record what happened: were they interested? Asking for a follow-up date? DNC?
//
// Reuses callback_date + callback_time so cron-callback-reminder fires automatically
// for follow-up dispositions — no second reminder system needed.

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { INBOUND_DISPOSITION_LABELS, INBOUND_DISPOSITION_COLORS } from '@/lib/constants';
import { todayInToronto } from '@/lib/date';

type Props = {
  log: any;
  businessName?: string;
  onClose: () => void;
  onSaved: () => void;
};

const DISPOSITIONS = ['interested', 'follow_up', 'not_interested', 'dnc', 'wrong_person'] as const;

const InboundDispositionModal = ({ log, businessName, onClose, onSaved }: Props) => {
  const [disposition, setDisposition] = useState<string>(log.inbound_disposition || '');
  const [notes, setNotes] = useState(log.inbound_disposition_notes || '');
  const [followUpDate, setFollowUpDate] = useState(log.callback_date || '');
  const [followUpTime, setFollowUpTime] = useState(log.callback_time || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const today = todayInToronto();
  const needsFollowUp = disposition === 'follow_up' || disposition === 'interested';

  const handleSave = async () => {
    if (!disposition) { setError('Pick a disposition'); return; }
    if (needsFollowUp && !followUpDate) { setError('Follow-up date required for this disposition'); return; }
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, any> = {
        inbound_disposition: disposition,
        inbound_disposition_at: new Date().toISOString(),
        inbound_disposition_notes: notes || null,
        callback_date: needsFollowUp ? followUpDate : null,
        callback_time: needsFollowUp ? (followUpTime || null) : null,
      };
      const { error: logErr } = await supabase.from('call_logs').update(updates).eq('id', log.id);
      if (logErr) throw logErr;

      // Mirror disposition onto the lead so the row reflects it.
      if (log.lead_id) {
        const leadUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (disposition === 'dnc' || disposition === 'not_interested') leadUpdates.status = 'not_interested';
        else if (disposition === 'interested') leadUpdates.status = 'callback';
        else if (disposition === 'follow_up') leadUpdates.status = 'callback';
        await supabase.from('leads').update(leadUpdates).eq('id', log.lead_id);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.78)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg-elev-1)', border:'1px solid var(--accent-glow-30)', borderRadius:'12px', padding:'24px', maxWidth:'520px', width:'100%', maxHeight:'92vh', overflowY:'auto'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px'}}>
          <h3 style={{margin:0, fontSize:'16px', fontWeight:800, color:'var(--text-primary)', letterSpacing:'.02em'}}>Tag Inbound Callback</h3>
          <button onClick={onClose} style={{background:'none', border:'none', color:'var(--text-faint)', fontSize:'22px', cursor:'pointer', lineHeight:1, padding:'0 4px'}}>×</button>
        </div>
        {businessName && <p style={{margin:'0 0 18px', fontSize:'12px', color:'var(--text-tertiary)'}}>{businessName}</p>}

        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block', fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:'8px'}}>Disposition</label>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px'}}>
            {DISPOSITIONS.map(key => {
              const active = disposition === key;
              const color = INBOUND_DISPOSITION_COLORS[key];
              return (
                <button key={key} onClick={()=>setDisposition(key)}
                  style={{padding:'10px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:700, letterSpacing:'.03em', textAlign:'left', transition:'all .15s',
                    background: active ? `${color}1f` : 'var(--bg-elev-2)',
                    border: `1px solid ${active ? color : 'var(--border)'}`,
                    color: active ? color : 'var(--text-secondary)'}}>
                  {INBOUND_DISPOSITION_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>

        {needsFollowUp && (
          <div style={{marginBottom:'14px', padding:'12px', background:'rgba(245,158,11,.06)', borderRadius:'6px', border:'1px solid rgba(245,158,11,.2)'}}>
            <label style={{display:'block', fontSize:'9px', fontWeight:700, color:'var(--amber)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:'8px'}}>Follow Up On</label>
            <div style={{display:'flex', gap:'8px'}}>
              <input type="date" value={followUpDate} min={today} onChange={e=>setFollowUpDate(e.target.value)}
                style={{flex:1, padding:'8px 10px', background:'var(--bg-elev-2)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-primary)', fontSize:'13px', fontFamily:'JetBrains Mono,monospace'}}/>
              <input type="time" value={followUpTime} onChange={e=>setFollowUpTime(e.target.value)}
                style={{width:'120px', padding:'8px 10px', background:'var(--bg-elev-2)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-primary)', fontSize:'13px', fontFamily:'JetBrains Mono,monospace'}}/>
            </div>
          </div>
        )}

        <div style={{marginBottom:'16px'}}>
          <label style={{display:'block', fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:'6px'}}>Notes</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
            placeholder="e.g. don't need a website right now, big contracts pay the bills, follow up in a month or two"
            style={{width:'100%', padding:'10px', background:'var(--bg-elev-2)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text-primary)', fontSize:'13px', resize:'vertical', fontFamily:'Inter,sans-serif'}}/>
        </div>

        {error && <div style={{marginBottom:'12px', padding:'8px 12px', background:'rgba(255,96,96,.1)', border:'1px solid rgba(255,96,96,.3)', borderRadius:'6px', color:'var(--red)', fontSize:'12px'}}>{error}</div>}

        <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
          <button onClick={onClose} disabled={saving} style={{padding:'9px 16px', borderRadius:'6px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:'11px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer'}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{padding:'9px 18px', borderRadius:'6px', background:'var(--accent-glow-15)', border:'1px solid var(--accent-glow-50)', color:'var(--accent-ink)', fontSize:'11px', fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', cursor: saving ? 'wait' : 'pointer'}}>
            {saving ? 'Saving…' : 'Save Disposition'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboundDispositionModal;
