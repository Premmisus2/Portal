'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS, NICHE_LIST, CALL_LOG_WEBHOOK } from '@/lib/constants';

const CALL_TYPES: Record<string, string> = { cold_call:'Cold Call', discovery_call:'Discovery Call', follow_up:'Follow-Up', inbound:'Inbound Call' };

const QuickLogForm = ({ repId, onLogged }: any) => {
  const [form, setForm] = useState({ businessName:'', contactName:'', phone:'', niche:'', city:'', callType:'cold_call', outcome:'', notes:'', callbackDate:'' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const handleSubmit = async () => {
    if (!form.outcome || !form.businessName) return;
    setSaving(true);
    try {
      // Check if lead exists in Supabase by business name
      const { data: existing } = await supabase.from('leads').select('id').ilike('business_name', form.businessName).limit(1);
      let leadId = existing && existing.length > 0 ? existing[0].id : null;

      // If no existing lead, create one
      if (!leadId) {
        const { data: newLead, error: leadInsertErr } = await supabase.from('leads').insert({
          business_name: form.businessName,
          contact_name: form.contactName,
          phone: form.phone,
          niche: form.niche || 'Other',
          city: form.city,
          priority: 'HIGH',
          status: form.outcome === 'booked_call' ? 'booked' : form.outcome === 'no_show' ? 'no_show' : form.outcome === 'discovery_completed' ? 'discovery_completed' : 'contacted',
          assigned_rep_id: repId,
          google_reviews: 0,
          rating: 0,
        }).select('id').single();
        if (leadInsertErr) { alert('Failed to create lead: ' + leadInsertErr.message); setSaving(false); return; }
        leadId = newLead?.id;
      } else {
        // Update existing lead status
        const statusMap: Record<string, string> = { no_answer:'contacted', voicemail_left:'voicemail', callback_requested:'callback', not_interested:'not_interested', booked_call:'booked', discovery_completed:'discovery_completed', no_show:'no_show', wrong_number:'wrong_number' };
        const { error: leadUpdateErr } = await supabase.from('leads').update({ status: statusMap[form.outcome] || 'contacted', updated_at: new Date().toISOString() }).eq('id', leadId);
        if (leadUpdateErr) { alert('Failed to update lead status: ' + leadUpdateErr.message); setSaving(false); return; }
      }

      // Log the call
      if (leadId) {
        const { error: callLogErr } = await supabase.from('call_logs').insert({ lead_id: leadId, rep_id: repId, outcome: form.outcome, notes: form.notes || null, callback_date: form.callbackDate || null, business_name: form.businessName || null });
        if (callLogErr) { alert('Failed to save call log: ' + callLogErr.message); setSaving(false); return; }
      }

      // Push to Google Sheet
      if (CALL_LOG_WEBHOOK) {
        fetch(CALL_LOG_WEBHOOK, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ businessName: form.businessName, contactName: form.contactName, phone: form.phone, niche: form.niche, city: form.city, outcome: form.outcome, notes: form.notes, callbackDate: form.callbackDate, priority: '', source: CALL_TYPES[form.callType] || 'Manual Entry', timestamp: new Date().toISOString() })
        }).catch(()=>{});
      }

      setHistory(prev => [{ ...form, timestamp: new Date().toISOString() }, ...prev]);
      setForm({ businessName:'', contactName:'', phone:'', niche:'', city:'', callType:'cold_call', outcome:'', notes:'', callbackDate:'' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onLogged) onLogged();
    } catch (err: any) { console.error('Quick log error:', err); alert('Failed to save: ' + (err.message || 'Unknown error')); }
    setSaving(false);
  };

  const fieldStyle: React.CSSProperties = { width:'100%', padding:'10px 14px', background:'rgba(255,255,255,.03)', border:'1px solid #1e1e1e', borderRadius:'8px', color:'#fff', fontSize:'13px', fontFamily:'Inter,sans-serif', outline:'none', transition:'border-color .15s' };

  return (
    <div className="fadein">
      <div className="card-glow" style={{padding:'24px', marginBottom:'20px'}}>
        <p style={{margin:'0 0 20px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#00F0FF'}}>Log a Call</p>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px'}}>
          <div>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Business Name *</label>
            <input value={form.businessName} onChange={e=>setForm(p=>({...p, businessName:e.target.value}))} placeholder="King Quality Cleaning" style={fieldStyle} className="field"/>
          </div>
          <div>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Contact Name</label>
            <input value={form.contactName} onChange={e=>setForm(p=>({...p, contactName:e.target.value}))} placeholder="Farid" style={fieldStyle} className="field"/>
          </div>
          <div>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Phone</label>
            <input value={form.phone} onChange={e=>setForm(p=>({...p, phone:e.target.value}))} placeholder="(437) 770-8080" style={fieldStyle} className="field"/>
          </div>
          <div>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>City</label>
            <input value={form.city} onChange={e=>setForm(p=>({...p, city:e.target.value}))} placeholder="Richmond Hill" style={fieldStyle} className="field"/>
          </div>
          <div>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Niche</label>
            <select value={form.niche} onChange={e=>setForm(p=>({...p, niche:e.target.value}))} style={fieldStyle} className="field">
              <option value="">Select Niche</option>
              {NICHE_LIST.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Call Type</label>
            <select value={form.callType} onChange={e=>setForm(p=>({...p, callType:e.target.value}))} style={fieldStyle} className="field">
              {Object.entries(CALL_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginBottom:'16px'}}>
          <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'8px'}}>Outcome *</label>
          <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
            {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
              <button key={key} onClick={()=>setForm(p=>({...p, outcome:key}))}
                style={{padding:'7px 14px', borderRadius:'7px', cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s',
                  background: form.outcome===key ? `${OUTCOME_COLORS[key]}18` : 'transparent',
                  border: `1px solid ${form.outcome===key ? OUTCOME_COLORS[key]+'66' : '#1e1e1e'}`,
                  color: form.outcome===key ? OUTCOME_COLORS[key] : '#555',
                }}>{label}</button>
            ))}
          </div>
        </div>

        {form.outcome === 'callback_requested' && (
          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Callback Date</label>
            <input type="date" value={form.callbackDate} onChange={e=>setForm(p=>({...p, callbackDate:e.target.value}))} style={{...fieldStyle, maxWidth:'200px', colorScheme:'dark'}} className="field"/>
          </div>
        )}

        <div style={{marginBottom:'16px'}}>
          <label style={{fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'4px'}}>Notes</label>
          <textarea value={form.notes} onChange={e=>setForm(p=>({...p, notes:e.target.value}))} placeholder="What happened on this call..." style={{...fieldStyle, minHeight:'70px', resize:'vertical'}} className="field" rows={3}/>
        </div>

        <button onClick={handleSubmit} disabled={saving || !form.outcome || !form.businessName}
          style={{padding:'12px 28px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:800, fontFamily:'Inter,sans-serif', border:'none', transition:'all .15s',
            background: saved ? '#22c55e' : 'rgba(0,240,255,.15)', color: saved ? '#000' : '#00F0FF',
            opacity: (saving || !form.outcome || !form.businessName) ? 0.4 : 1,
          }}>
          {saving ? 'Saving...' : saved ? 'Logged!' : 'Log Call'}
        </button>
      </div>

      {/* Recent Quick Logs (session only) */}
      {history.length > 0 && (
        <div>
          <p style={{margin:'0 0 12px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#444'}}>Logged This Session</p>
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            {history.map((h, i) => (
              <div key={i} className="card" style={{padding:'10px 16px', display:'flex', alignItems:'center', gap:'12px', fontSize:'12px'}}>
                <span style={{color: OUTCOME_COLORS[h.outcome], fontWeight:700, fontSize:'10px', minWidth:'100px'}}>{OUTCOME_LABELS[h.outcome]}</span>
                <span style={{color:'#fff', fontWeight:600}}>{h.businessName}</span>
                {h.contactName && <span style={{color:'#555'}}>({h.contactName})</span>}
                <span style={{color:'#333', marginLeft:'auto', fontSize:'10px', fontFamily:'monospace'}}>{CALL_TYPES[h.callType]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickLogForm;
