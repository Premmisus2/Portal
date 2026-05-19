'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS, CALLBACK_REASON_LABELS, CALLBACK_REASON_COLORS, CALL_LOG_WEBHOOK } from '@/lib/constants';

const STATUS_MAP: Record<string, string> = {
  no_answer: 'contacted',
  voicemail_left: 'voicemail',
  callback_requested: 'callback',
  not_interested: 'not_interested',
  booked_call: 'booked',
  discovery_completed: 'discovery_completed',
  no_show: 'no_show',
  wrong_number: 'wrong_number',
};

const CallLogger = ({ lead, repId, onLogged, existingCallLogId, userName }: any) => {
  // Ordered selection. First entry is the PRIMARY outcome (drives lead.status,
  // AI suggestion match, notifications). Subsequent entries are secondary tags.
  const [selected, setSelected] = useState<string[]>([]);
  const primary = selected[0] || '';
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [reasonSelected, setReasonSelected] = useState<string[]>([]);
  const callbackReason = reasonSelected[0] || '';
  const [bookingType, setBookingType] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ outcome: string; confidence: number; reasoning: string } | null>(null);

  useEffect(() => {
    if (!existingCallLogId) { setAiSuggestion(null); return; }
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase.from('call_logs').select('outcome_auto, outcome_auto_confidence, outcome_auto_reasoning').eq('id', existingCallLogId).maybeSingle();
      if (cancelled || !data?.outcome_auto) return;
      setAiSuggestion({
        outcome: data.outcome_auto,
        confidence: data.outcome_auto_confidence ?? 0,
        reasoning: data.outcome_auto_reasoning ?? '',
      });
      setSelected(prev => prev.length === 0 ? [data.outcome_auto] : prev);
    };
    tick();
    const interval = setInterval(tick, 8000);
    const stop = setTimeout(() => clearInterval(interval), 90000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(stop); };
  }, [existingCallLogId]);

  const toggleOutcome = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleReason = (key: string) => {
    setReasonSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSubmit = async () => {
    if (!primary) return;
    setSaving(true);
    const additional = selected.slice(1);
    const additionalReasons = reasonSelected.slice(1);
    try {
      const insertPayload: Record<string, any> = {
        lead_id: lead.id,
        rep_id: repId,
        outcome: primary,
        notes: notes || null,
        callback_date: callbackDate || null,
        callback_time: callbackTime || null,
        business_name: lead.business_name || null,
        callback_reason: callbackReason || null,
        booking_type: bookingType || null,
      };
      const updatePayload: Record<string, any> = {
        outcome: primary,
        notes: notes || null,
        callback_date: callbackDate || null,
        callback_time: callbackTime || null,
        callback_reason: callbackReason || null,
        booking_type: bookingType || null,
      };
      if (additional.length > 0) {
        insertPayload.additional_outcomes = additional;
        updatePayload.additional_outcomes = additional;
      }
      if (additionalReasons.length > 0) {
        insertPayload.additional_callback_reasons = additionalReasons;
        updatePayload.additional_callback_reasons = additionalReasons;
      }
      if (existingCallLogId) {
        const { error: updateLogErr } = await supabase.from('call_logs').update(updatePayload).eq('id', existingCallLogId);
        if (updateLogErr) { alert('Failed to update call log: ' + updateLogErr.message); setSaving(false); return; }
      } else {
        const { error: insertErr } = await supabase.from('call_logs').insert(insertPayload);
        if (insertErr) { alert('Failed to save call log: ' + insertErr.message); setSaving(false); return; }
      }
      const { error: updateErr } = await supabase.from('leads').update({ status: STATUS_MAP[primary] || 'contacted', updated_at: new Date().toISOString() }).eq('id', lead.id);
      if (updateErr) { alert('Call logged but failed to update lead status: ' + updateErr.message); setSaving(false); return; }
      if (CALL_LOG_WEBHOOK) {
        fetch(CALL_LOG_WEBHOOK, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ businessName: lead.business_name, contactName: lead.contact_name, phone: lead.phone, niche: lead.niche, city: lead.city, outcome: primary, additionalOutcomes: additional, notes, callbackDate, priority: lead.priority, source: 'Cold Call', timestamp: new Date().toISOString() })
        }).catch(()=>{});
      }
      onLogged(lead.id, primary, STATUS_MAP[primary]);
      window.dispatchEvent(new Event('refreshCallLogs'));
      // Notification triggers — fire on ANY selected outcome (primary or secondary).
      const bookedHit = selected.includes('booked_call') || selected.includes('discovery_completed');
      if (bookedHit) {
        fetch('/api/notify-sms', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ type: 'booked', repName: userName || 'Rep', businessName: lead.business_name, phone: lead.phone, notes: notes })
        }).catch(() => {});
        fetch('/api/notify-telegram', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ type: 'booked', repName: userName || 'Rep', businessName: lead.business_name, phone: lead.phone, notes: notes })
        }).catch(() => {});
      }
      if (selected.includes('callback_requested')) {
        fetch('/api/notify-sms', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ type: 'callback', repName: userName || 'Rep', businessName: lead.business_name, notes: notes })
        }).catch(() => {});
      }
      setSelected([]); setNotes(''); setCallbackDate(''); setCallbackTime(''); setReasonSelected([]); setBookingType('');
    } catch (err: any) { console.error('Call log error:', err); alert('Failed to save call log: ' + (err.message || 'Unknown error')); }
    setSaving(false);
  };

  const showCallback = selected.includes('callback_requested');
  const showBooking = selected.includes('booked_call');

  return (
    <div style={{marginTop:'14px', padding:'16px', background:'rgba(0,240,255,.03)', border:'1px solid var(--accent-glow-15)', borderRadius:'10px'}} className="fadein">
      <p style={{margin:'0 0 12px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--accent-ink)'}}>Log Call</p>
      {aiSuggestion && (
        <div style={{marginBottom:'12px', padding:'10px 12px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.25)', borderRadius:'8px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
            <span style={{fontSize:'9px', fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', color:'#3B82F6'}}>AI suggests</span>
            <span style={{fontSize:'12px', fontWeight:700, color: OUTCOME_COLORS[aiSuggestion.outcome] || 'var(--text-primary)'}}>{OUTCOME_LABELS[aiSuggestion.outcome] || aiSuggestion.outcome}</span>
            <span style={{fontSize:'10px', color:'var(--text-tertiary)', fontFamily:'JetBrains Mono,monospace'}}>{Math.round(aiSuggestion.confidence * 100)}% confidence</span>
          </div>
          {aiSuggestion.reasoning && (
            <p style={{margin:'6px 0 0', fontSize:'11px', color:'var(--text-tertiary)', fontStyle:'italic', lineHeight:1.4}}>{aiSuggestion.reasoning}</p>
          )}
        </div>
      )}
      <p style={{margin:'0 0 8px', fontSize:'9px', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--text-faint)'}}>
        Outcome — tap to select. First pick is primary; add more if needed.
      </p>
      <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'12px'}}>
        {Object.entries(OUTCOME_LABELS).map(([key, label]) => {
          const idx = selected.indexOf(key);
          const isPrimary = idx === 0;
          const isSecondary = idx > 0;
          const isSelected = idx >= 0;
          const color = OUTCOME_COLORS[key];
          return (
            <button key={key} onClick={()=>toggleOutcome(key)} className="outcome-chip"
              style={{
                padding:'7px 14px', borderRadius:'7px', cursor:'pointer', fontSize:'11px', fontWeight:700,
                fontFamily:'Inter,sans-serif', transition:'all .15s',
                display:'inline-flex', alignItems:'center', gap:'6px',
                background: isPrimary ? `${color}28` : isSecondary ? `${color}12` : 'transparent',
                border: `1px solid ${isPrimary ? color : isSecondary ? color + '55' : 'var(--border)'}`,
                color: isSelected ? color : 'var(--text-muted)',
                boxShadow: isPrimary ? `0 0 0 1px ${color}44 inset` : 'none',
              }}>
              {isSelected && (
                <span style={{
                  fontSize:'9px', fontWeight:800, padding:'1px 5px', borderRadius:'4px',
                  background: isPrimary ? `${color}44` : 'transparent',
                  border: isPrimary ? 'none' : `1px solid ${color}66`,
                  color: isPrimary ? 'var(--text-primary)' : color,
                  fontFamily:'JetBrains Mono,monospace', letterSpacing:'.05em',
                }}>{isPrimary ? 'PRIMARY' : `+${idx}`}</span>
              )}
              {label}
            </button>
          );
        })}
      </div>
      {showCallback && (
        <div style={{marginBottom:'12px'}}>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <div>
              <label style={{fontSize:'10px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Callback Date</label>
              <input type="date" value={callbackDate} onChange={e=>setCallbackDate(e.target.value)}
                className="field" style={{maxWidth:'180px', colorScheme:'dark'}}/>
            </div>
            <div>
              <label style={{fontSize:'10px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Callback Time</label>
              <input type="time" value={callbackTime} onChange={e=>setCallbackTime(e.target.value)}
                className="field" style={{maxWidth:'140px', colorScheme:'dark'}}/>
            </div>
          </div>
          <div style={{marginTop:'12px'}}>
            <label style={{fontSize:'10px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Callback Reason</label>
            <p style={{margin:'0 0 8px', fontSize:'9px', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--text-faint)'}}>
              Tap to select. First pick is primary; add more if needed.
            </p>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
              {Object.entries(CALLBACK_REASON_LABELS).map(([key, label]) => {
                const idx = reasonSelected.indexOf(key);
                const isPrimary = idx === 0;
                const isSecondary = idx > 0;
                const isSelected = idx >= 0;
                const color = CALLBACK_REASON_COLORS[key];
                return (
                  <button key={key} onClick={()=>toggleReason(key)} className="reason-chip"
                    style={{
                      padding:'6px 12px', borderRadius:'7px', cursor:'pointer', fontSize:'11px', fontWeight:700,
                      fontFamily:'Inter,sans-serif', transition:'all .15s',
                      display:'inline-flex', alignItems:'center', gap:'6px',
                      background: isPrimary ? `${color}28` : isSecondary ? `${color}12` : 'transparent',
                      border: `1px solid ${isPrimary ? color : isSecondary ? color + '55' : 'var(--border)'}`,
                      color: isSelected ? color : 'var(--text-muted)',
                      boxShadow: isPrimary ? `0 0 0 1px ${color}44 inset` : 'none',
                    }}>
                    {isSelected && (
                      <span style={{
                        fontSize:'9px', fontWeight:800, padding:'1px 5px', borderRadius:'4px',
                        background: isPrimary ? `${color}44` : 'transparent',
                        border: isPrimary ? 'none' : `1px solid ${color}66`,
                        color: isPrimary ? 'var(--text-primary)' : color,
                        fontFamily:'JetBrains Mono,monospace', letterSpacing:'.05em',
                      }}>{isPrimary ? 'PRIMARY' : `+${idx}`}</span>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showBooking && (
        <div style={{marginBottom:'12px'}}>
          <label style={{fontSize:'10px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Booking Type</label>
          <select value={bookingType} onChange={e => setBookingType(e.target.value)} className="field" style={{maxWidth:'280px', padding:'8px 12px', fontSize:'12px'}}>
            <option value="">Select type...</option>
            <option value="sales_call">Sales Call (Video/Phone)</option>
            <option value="discovery">Discovery Call</option>
            <option value="scheduled_callback">Scheduled Callback</option>
          </select>
        </div>
      )}
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Quick notes (optional)..."
        className="field" style={{minHeight:'60px', resize:'vertical', marginBottom:'12px'}} rows={2}/>
      <button onClick={handleSubmit} disabled={!primary || saving}
        style={{padding:'10px 24px', borderRadius:'8px', cursor: (!primary||saving)?'not-allowed':'pointer', border:'none',
          background: primary ? 'var(--accent-ink)' : 'var(--border)', color: primary ? 'var(--bg-app)' : 'var(--text-faint)',
          fontWeight:800, fontSize:'12px', fontFamily:'Inter,sans-serif', letterSpacing:'.06em', textTransform:'uppercase',
          opacity: saving ? .6 : 1, transition:'all .15s',
        }}>{saving ? 'Saving...' : 'Log Call'}</button>
    </div>
  );
};

export default CallLogger;
