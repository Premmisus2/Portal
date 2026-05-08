'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS, CALL_LOG_WEBHOOK } from '@/lib/constants';

const CallLogger = ({ lead, repId, onLogged, existingCallLogId, userName }: any) => {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackReason, setCallbackReason] = useState('');
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
      if (!outcome) setOutcome(data.outcome_auto);
    };
    tick();
    const interval = setInterval(tick, 8000);
    const stop = setTimeout(() => clearInterval(interval), 90000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(stop); };
  }, [existingCallLogId]);

  const handleSubmit = async () => {
    if (!outcome) return;
    setSaving(true);
    try {
      const insertPayload = { lead_id: lead.id, rep_id: repId, outcome, notes: notes || null, callback_date: callbackDate || null, business_name: lead.business_name || null, callback_reason: callbackReason || null, booking_type: bookingType || null };
      if (existingCallLogId) {
        // Update mode — Twilio call already created the row, just add outcome + notes
        const { error: updateLogErr } = await supabase.from('call_logs').update({ outcome, notes: notes || null, callback_date: callbackDate || null, callback_reason: callbackReason || null, booking_type: bookingType || null }).eq('id', existingCallLogId);
        if (updateLogErr) { alert('Failed to update call log: ' + updateLogErr.message); setSaving(false); return; }
      } else {
        const { error: insertErr } = await supabase.from('call_logs').insert(insertPayload);
        if (insertErr) { alert('Failed to save call log: ' + insertErr.message); setSaving(false); return; }
      }
      const statusMap: Record<string, string> = { no_answer:'contacted', voicemail_left:'voicemail', callback_requested:'callback', not_interested:'not_interested', booked_call:'booked', discovery_completed:'discovery_completed', no_show:'no_show', wrong_number:'wrong_number' };
      const { error: updateErr } = await supabase.from('leads').update({ status: statusMap[outcome] || 'contacted', updated_at: new Date().toISOString() }).eq('id', lead.id);
      if (updateErr) { alert('Call logged but failed to update lead status: ' + updateErr.message); setSaving(false); return; }
      if (CALL_LOG_WEBHOOK) {
        fetch(CALL_LOG_WEBHOOK, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ businessName: lead.business_name, contactName: lead.contact_name, phone: lead.phone, niche: lead.niche, city: lead.city, outcome, notes, callbackDate, priority: lead.priority, source: 'Cold Call', timestamp: new Date().toISOString() })
        }).catch(()=>{});
      }
      onLogged(lead.id, outcome, statusMap[outcome]);
      window.dispatchEvent(new Event('refreshCallLogs'));
      // Notification triggers
      if (outcome === 'booked_call' || outcome === 'discovery_completed') {
        fetch('/api/notify-sms', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ type: 'booked', repName: userName || 'Rep', businessName: lead.business_name, phone: lead.phone, notes: notes })
        }).catch(() => {});
        fetch('/api/notify-telegram', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ type: 'booked', repName: userName || 'Rep', businessName: lead.business_name, phone: lead.phone, notes: notes })
        }).catch(() => {});
      }
      if (outcome === 'callback_requested') {
        fetch('/api/notify-sms', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ type: 'callback', repName: userName || 'Rep', businessName: lead.business_name, notes: notes })
        }).catch(() => {});
      }
      setOutcome(''); setNotes(''); setCallbackDate('');
    } catch (err: any) { console.error('Call log error:', err); alert('Failed to save call log: ' + (err.message || 'Unknown error')); }
    setSaving(false);
  };

  return (
    <div style={{marginTop:'14px', padding:'16px', background:'rgba(0,240,255,.03)', border:'1px solid rgba(0,240,255,.15)', borderRadius:'10px'}} className="fadein">
      <p style={{margin:'0 0 12px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#00F0FF'}}>Log Call</p>
      {aiSuggestion && (
        <div style={{marginBottom:'12px', padding:'10px 12px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.25)', borderRadius:'8px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
            <span style={{fontSize:'9px', fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', color:'#3B82F6'}}>AI suggests</span>
            <span style={{fontSize:'12px', fontWeight:700, color: OUTCOME_COLORS[aiSuggestion.outcome] || '#fff'}}>{OUTCOME_LABELS[aiSuggestion.outcome] || aiSuggestion.outcome}</span>
            <span style={{fontSize:'10px', color:'#888', fontFamily:'JetBrains Mono,monospace'}}>{Math.round(aiSuggestion.confidence * 100)}% confidence</span>
          </div>
          {aiSuggestion.reasoning && (
            <p style={{margin:'6px 0 0', fontSize:'11px', color:'#888', fontStyle:'italic', lineHeight:1.4}}>{aiSuggestion.reasoning}</p>
          )}
        </div>
      )}
      <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'12px'}}>
        {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
          <button key={key} onClick={()=>setOutcome(key)}
            style={{padding:'7px 14px', borderRadius:'7px', cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s',
              background: outcome===key ? `${OUTCOME_COLORS[key]}18` : 'transparent',
              border: `1px solid ${outcome===key ? OUTCOME_COLORS[key]+'66' : '#1e1e1e'}`,
              color: outcome===key ? OUTCOME_COLORS[key] : '#555',
            }}>{label}</button>
        ))}
      </div>
      {outcome === 'callback_requested' && (
        <div style={{marginBottom:'12px'}}>
          <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Callback Date</label>
          <input type="date" value={callbackDate} onChange={e=>setCallbackDate(e.target.value)}
            className="field" style={{maxWidth:'200px', colorScheme:'dark'}}/>
          <div style={{marginTop:'10px'}}>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Callback Reason</label>
            <select value={callbackReason} onChange={e => setCallbackReason(e.target.value)} className="field" style={{maxWidth:'280px', padding:'8px 12px', fontSize:'12px'}}>
              <option value="">Select reason...</option>
              <option value="too_busy">Too Busy / On Job Site</option>
              <option value="has_someone">Has Someone Working On It</option>
              <option value="call_later">Asked to Call Back Later</option>
              <option value="interested">Interested But Not Ready</option>
              <option value="wants_info">Wants More Information</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      )}
      {outcome === 'booked_call' && (
        <div style={{marginBottom:'12px'}}>
          <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Booking Type</label>
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
      <button onClick={handleSubmit} disabled={!outcome || saving}
        style={{padding:'10px 24px', borderRadius:'8px', cursor: (!outcome||saving)?'not-allowed':'pointer', border:'none',
          background: outcome ? '#00F0FF' : '#1e1e1e', color: outcome ? '#000' : '#444',
          fontWeight:800, fontSize:'12px', fontFamily:'Inter,sans-serif', letterSpacing:'.06em', textTransform:'uppercase',
          opacity: saving ? .6 : 1, transition:'all .15s',
        }}>{saving ? 'Saving...' : 'Log Call'}</button>
    </div>
  );
};

export default CallLogger;
