'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Body } from '@/components/ui/Typography';
import { supabase } from '@/lib/supabase';
import { HANDOFF_WEBHOOK } from '@/lib/constants';

const HandoffPanel = ({ userName, userEmail, repId }: any) => {
  const empty = { company:'', niche:'', painPoint:'', nextStep:'Meet Booked', notes:'' };
  const [form, setForm] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const pingText = `// Internal Ping
Rep: ${userName}
Lead / Company: ${form.company}
Niche: ${form.niche}
Pain Point: ${form.painPoint}
Next Step: ${form.nextStep}${form.notes ? `\nNotes: ${form.notes}` : ''}`;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSending(true);
    setSendError('');
    let supabaseOk = false;
    // Save to Supabase
    if (repId) {
      try {
        const { error } = await supabase.from('handoffs').insert({
          rep_id: repId,
          company: form.company,
          niche: form.niche,
          pain_point: form.painPoint,
          next_step: form.nextStep,
          notes: form.notes,
        });
        if (!error) supabaseOk = true;
      } catch {}
    }
    // Also log to Google Sheets (backup)
    try {
      await fetch(HANDOFF_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          repName: userName,
          repEmail: userEmail || '',
          businessName: form.company,
          niche: form.niche,
          painPoint: form.painPoint,
          nextStep: form.nextStep,
          notes: form.notes,
        }),
      });
    } catch {}
    setSending(false);
    if (supabaseOk) {
      setSubmitted(true);
      // Notification triggers for handoff
      fetch('/api/notify-sms', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ type: 'handoff', repName: userName, businessName: form.company, niche: form.niche, nextStep: form.nextStep, painPoint: form.painPoint })
      }).catch(() => {});
      fetch('/api/notify-telegram', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ type: 'handoff', repName: userName, businessName: form.company, niche: form.niche, nextStep: form.nextStep, painPoint: form.painPoint })
      }).catch(() => {});
    } else {
      setSendError('Handoff failed to save. Check your connection and try again.');
    }
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(pingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleReset = () => { setForm(empty); setSubmitted(false); setCopied(false); };

  const fieldLabel = (txt: string) => (
    <label style={{display:'block', fontSize:'10px', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'#555', marginBottom:'6px'}}>{txt}</label>
  );

  return (
    <div>
      <div style={{marginBottom:'6px'}}><span className="tag">09</span></div>
      <h2 style={{fontSize:'26px', fontWeight:900, color:'#fff', margin:'8px 0 4px'}}>Director Handoff</h2>
      <Body>Fill this out after every close or booked meet. Ping Elliott with the formatted output.</Body>
      <div className="divider" style={{margin:'16px 0'}}/>

      {!submitted ? (
        <form onSubmit={handleSubmit} style={{maxWidth:'620px', display:'flex', flexDirection:'column', gap:'16px'}}>
          <div>
            {fieldLabel('Rep')}
            <input className="field" value={userName} readOnly style={{opacity:.5, cursor:'default'}}/>
          </div>
          <div>
            {fieldLabel('Lead Name / Company')}
            <input className="field" placeholder="e.g. John Smith / Smith HVAC" required
              value={form.company} onChange={(e: any)=>setForm((p: any)=>({...p,company:e.target.value}))}/>
          </div>
          <div>
            {fieldLabel('Niche')}
            <input className="field" placeholder="e.g. HVAC, Plumbing, Construction"
              value={form.niche} onChange={(e: any)=>setForm((p: any)=>({...p,niche:e.target.value}))}/>
          </div>
          <div>
            {fieldLabel('Pain Point Uncovered')}
            <textarea className="field" rows={3} placeholder='e.g. "Hates current Meta ads, leads are low quality"' required
              style={{resize:'vertical'}}
              value={form.painPoint} onChange={(e: any)=>setForm((p: any)=>({...p,painPoint:e.target.value}))}/>
          </div>
          <div>
            {fieldLabel('Next Step')}
            <select className="field" value={form.nextStep} onChange={(e: any)=>setForm((p: any)=>({...p,nextStep:e.target.value}))}>
              <option>Meet Booked</option>
              <option>Invoice Sent</option>
              <option>Follow-up Pending</option>
              <option>Closed — Won</option>
            </select>
          </div>
          <div>
            {fieldLabel('Notes (optional)')}
            <textarea className="field" rows={2} placeholder="Any additional context..."
              style={{resize:'vertical'}}
              value={form.notes} onChange={(e: any)=>setForm((p: any)=>({...p,notes:e.target.value}))}/>
          </div>
          {sendError && <p style={{color:'#ff6060', fontSize:'12px', margin:0}}>{sendError}</p>}
          <div style={{paddingTop:'4px'}}>
            <button type="submit" className="btn-primary" disabled={sending} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', opacity: sending ? .6 : 1}}>
              <Icon name="send" size={14}/> {sending ? 'Logging...' : 'Generate Ping'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{maxWidth:'620px', display:'flex', flexDirection:'column', gap:'12px'}} className="fadein">
          <div className="card-glow" style={{padding:'20px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px'}}>
              <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px rgba(34,197,94,.5)'}}/>
              <span style={{fontSize:'12px', fontWeight:700, color:'#22c55e', letterSpacing:'.1em', textTransform:'uppercase'}}>Handoff Ready</span>
            </div>
            <pre style={{
              margin:0, fontFamily:'monospace', fontSize:'13px', lineHeight:1.7,
              color:'#ccc', background:'rgba(0,240,255,.03)', border:'1px solid rgba(0,240,255,.12)',
              borderRadius:'8px', padding:'16px', whiteSpace:'pre-wrap', wordBreak:'break-word',
            }}>{pingText}</pre>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={handleCopy} className="btn-pdf" style={{flex:1, justifyContent:'center'}}>
              <Icon name={copied ? 'check' : 'copy'} size={13}/>
              {copied ? 'Copied!' : 'Copy Ping'}
            </button>
            <button onClick={handleReset} className="btn-back" style={{flex:1, justifyContent:'center', color: '#555'}}>
              New Handoff
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandoffPanel;
