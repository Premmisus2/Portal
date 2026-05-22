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

// Outcome sub-tags — Phase 2 of finish-build, locked 2026-05-22 audit verdict.
// OPTIONAL field (audit consensus: no friction on post-call). Drives AI-drafted
// SMS template matching: outcome+subtag finds the most specific template; falls
// back to outcome alone if no subtag-specific template exists.
const OUTCOME_SUBTAGS: Record<string, Array<{ key: string; label: string }>> = {
  not_interested: [
    { key: 'too_busy',           label: 'Too busy' },
    { key: 'using_competitor',   label: 'Using competitor' },
    { key: 'wrong_timing',       label: 'Wrong timing' },
    { key: 'not_decision_maker', label: 'Not decision maker' },
    { key: 'price_objection',    label: 'Price objection' },
    { key: 'vague_brushoff',     label: 'Vague brushoff' },
  ],
  voicemail_left: [
    { key: 'first_touch',    label: 'First touch' },
    { key: 'repeat_attempt', label: 'Repeat attempt' },
    { key: 'no_mailbox',     label: 'No mailbox' },
  ],
  no_answer: [
    { key: 'first_touch',    label: 'First touch' },
    { key: 'repeat_attempt', label: 'Repeat attempt' },
    { key: 'bad_number',     label: 'Bad number' },
  ],
};

function interpolateTemplate(body: string, lead: any, repName: string): string {
  const firstName = (lead.contact_name || '').split(/\s+/)[0] || 'there';
  return body
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, lead.business_name || 'your business')
    .replace(/\{\{rep_name\}\}/g, repName || 'Premmisus')
    .replace(/\{\{niche\}\}/g, lead.niche || 'business');
}

interface SmsTemplateRow {
  id: string;
  body_template: string;
  owner_rep_id: string | null;
  outcome_subtag: string | null;
}

/** Pick the most specific template for an outcome + optional subtag. */
async function fetchMatchingTemplate(outcome: string, subtag: string | null, repId: string): Promise<SmsTemplateRow | null> {
  // Priority: rep-owned + subtag → global + subtag → rep-owned (no subtag) → global (no subtag)
  const { data } = await supabase
    .from('sms_templates')
    .select('id, body_template, owner_rep_id, outcome_subtag')
    .eq('outcome_trigger', outcome)
    .eq('active', true);
  if (!data || data.length === 0) return null;
  const subtagMatches = (data as SmsTemplateRow[]).filter(t => subtag && t.outcome_subtag === subtag);
  const ownedSub = subtagMatches.find(t => t.owner_rep_id === repId);
  if (ownedSub) return ownedSub;
  const globalSub = subtagMatches.find(t => !t.owner_rep_id);
  if (globalSub) return globalSub;
  const fallbacks = (data as SmsTemplateRow[]).filter(t => !t.outcome_subtag);
  const ownedFallback = fallbacks.find(t => t.owner_rep_id === repId);
  if (ownedFallback) return ownedFallback;
  return fallbacks.find(t => !t.owner_rep_id) || null;
}

const CallLogger = ({ lead, repId, onLogged, existingCallLogId, userName }: any) => {
  // Ordered selection. First entry is the PRIMARY outcome (drives lead.status,
  // AI suggestion match, notifications). Subsequent entries are secondary tags.
  const [selected, setSelected] = useState<string[]>([]);
  const primary = selected[0] || '';
  const [outcomeSubtag, setOutcomeSubtag] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [reasonSelected, setReasonSelected] = useState<string[]>([]);
  const callbackReason = reasonSelected[0] || '';
  const [bookingType, setBookingType] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ outcome: string; confidence: number; reasoning: string } | null>(null);
  // Phase 2: AI-drafted SMS panel — shown after Log Call success.
  const [smsDraftPanel, setSmsDraftPanel] = useState<{
    body: string;
    templateId: string | null;
    callLogId: string | null;
  } | null>(null);
  const [smsDraftSending, setSmsDraftSending] = useState(false);

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
        outcome_subtag: outcomeSubtag || null,
        notes: notes || null,
        callback_date: callbackDate || null,
        callback_time: callbackTime || null,
        business_name: lead.business_name || null,
        callback_reason: callbackReason || null,
        booking_type: bookingType || null,
      };
      const updatePayload: Record<string, any> = {
        outcome: primary,
        outcome_subtag: outcomeSubtag || null,
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
      let resolvedCallLogId: string | null = existingCallLogId || null;
      if (existingCallLogId) {
        const { error: updateLogErr } = await supabase.from('call_logs').update(updatePayload).eq('id', existingCallLogId);
        if (updateLogErr) { alert('Failed to update call log: ' + updateLogErr.message); setSaving(false); return; }
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('call_logs').insert(insertPayload).select('id').single();
        if (insertErr) { alert('Failed to save call log: ' + insertErr.message); setSaving(false); return; }
        resolvedCallLogId = inserted?.id || null;
      }

      // Missed-call SMS auto-reply: fire idempotently when the rep logs a
      // dead-dial outcome. The route guards on auto_reply_sent_at + 24h cooldown.
      if (resolvedCallLogId && (primary === 'voicemail_left' || primary === 'no_answer')) {
        fetch('/api/missed-call-autoreply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ call_log_id: resolvedCallLogId }),
        }).catch(() => {});
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
      // Phase 2: AI-drafted SMS — fetch matching template, fill in vars, surface
      // editable textarea. Rep can Send / Edit-then-Send / Skip. Consent gate
      // already lives in /api/send-sms so no separate check here.
      // Skip if outcome is wrong_number / no_show / booked (booked has its own confirm flow).
      if (!['wrong_number', 'no_show', 'booked_call', 'discovery_completed'].includes(primary)) {
        try {
          const tpl = await fetchMatchingTemplate(primary, outcomeSubtag || null, repId);
          if (tpl) {
            const filledBody = interpolateTemplate(tpl.body_template, lead, userName || 'Premmisus');
            setSmsDraftPanel({ body: filledBody, templateId: tpl.id, callLogId: resolvedCallLogId });
          }
        } catch (err) {
          // Silent — AI draft is optional, don't block the post-call flow.
          console.warn('[CallLogger] template fetch failed', err);
        }
      }

      setSelected([]); setOutcomeSubtag(''); setNotes(''); setCallbackDate(''); setCallbackTime(''); setReasonSelected([]); setBookingType('');
    } catch (err: any) { console.error('Call log error:', err); alert('Failed to save call log: ' + (err.message || 'Unknown error')); }
    setSaving(false);
  };

  // Send the AI-drafted SMS (or edited version). Records draft → sent in
  // sms_drafts for future performance loop (which itself is deferred per audit).
  const handleSendDraft = async () => {
    if (!smsDraftPanel || !smsDraftPanel.body.trim()) return;
    setSmsDraftSending(true);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, rep_id: repId, body: smsDraftPanel.body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`SMS not sent: ${data?.error || res.status}`);
        setSmsDraftSending(false);
        return;
      }
      await supabase.from('sms_drafts').insert({
        lead_id: lead.id,
        rep_id: repId,
        call_log_id: smsDraftPanel.callLogId,
        template_id: smsDraftPanel.templateId,
        drafted_body: smsDraftPanel.body,
        final_body: smsDraftPanel.body,
        status: 'sent',
        sent_at: new Date().toISOString(),
        twilio_sid: data?.sid || null,
      });
      setSmsDraftPanel(null);
    } catch (err: any) {
      alert('SMS send failed: ' + (err.message || 'unknown'));
    } finally {
      setSmsDraftSending(false);
    }
  };

  const handleSkipDraft = async () => {
    if (!smsDraftPanel) return;
    // Record the skip for future template performance tuning.
    await supabase.from('sms_drafts').insert({
      lead_id: lead.id,
      rep_id: repId,
      call_log_id: smsDraftPanel.callLogId,
      template_id: smsDraftPanel.templateId,
      drafted_body: smsDraftPanel.body,
      final_body: null,
      status: 'skipped',
    }).then(() => {}, () => {});
    setSmsDraftPanel(null);
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
      {/* Phase 2 — Outcome sub-chips. Optional, appears AFTER primary outcome. */}
      {primary && OUTCOME_SUBTAGS[primary] && (
        <div style={{marginBottom:'12px'}}>
          <p style={{margin:'0 0 6px', fontSize:'9px', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--text-faint)'}}>
            Why? (optional, one tap)
          </p>
          <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
            {OUTCOME_SUBTAGS[primary].map(s => {
              const isOn = outcomeSubtag === s.key;
              return (
                <button key={s.key}
                  onClick={() => setOutcomeSubtag(isOn ? '' : s.key)}
                  style={{
                    padding:'4px 10px', borderRadius:'5px', cursor:'pointer', fontSize:'10px', fontWeight:600,
                    fontFamily:'Inter,sans-serif', transition:'all .15s',
                    background: isOn ? 'rgba(0,240,255,.15)' : 'transparent',
                    border: `1px solid ${isOn ? 'rgba(0,240,255,.45)' : 'var(--border)'}`,
                    color: isOn ? '#00F0FF' : 'var(--text-muted)',
                  }}>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
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

      {/* Phase 2 — AI-drafted SMS panel (audit-locked 2026-05-22). Appears
          after a non-booked outcome is logged. Pre-filled from sms_templates
          via outcome+subtag match. Consent gate enforced in /api/send-sms. */}
      {smsDraftPanel && (
        <div style={{
          marginTop: 16, padding: 14, background: 'rgba(0,240,255,.04)',
          border: '1px solid rgba(0,240,255,.25)', borderRadius: 10,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', textTransform:'uppercase', color:'#00F0FF' }}>
              ✨ AI-drafted follow-up SMS
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono,monospace' }}>
              {smsDraftPanel.body.length} chars · {Math.ceil(smsDraftPanel.body.length / 153)} seg
            </span>
          </div>
          <textarea
            value={smsDraftPanel.body}
            onChange={(e) => setSmsDraftPanel({ ...smsDraftPanel, body: e.target.value })}
            rows={4}
            style={{
              width:'100%', background:'#000', border:'1px solid var(--border)',
              borderRadius: 6, padding: 10, color:'#fff', fontSize: 13,
              fontFamily: 'Inter, sans-serif', resize: 'vertical', minHeight: 70,
            }}
          />
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-faint)' }}>
            CASL footer ("Reply STOP to unsubscribe") auto-added by the server. Lead opt-outs are honored.
          </div>
          <div style={{ marginTop: 10, display:'flex', gap: 8, justifyContent:'flex-end' }}>
            <button
              onClick={handleSkipDraft}
              disabled={smsDraftSending}
              style={{
                padding:'7px 14px', borderRadius:6, background:'transparent',
                border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer',
                fontSize: 11, fontFamily:'Inter, sans-serif',
              }}
            >Skip</button>
            <button
              onClick={handleSendDraft}
              disabled={smsDraftSending || !smsDraftPanel.body.trim()}
              style={{
                padding:'7px 16px', borderRadius:6,
                background: smsDraftSending ? '#1e1e1e' : '#00F0FF',
                color: smsDraftSending ? '#555' : '#000',
                border:'none', cursor: smsDraftSending ? 'not-allowed' : 'pointer',
                fontSize: 11, fontWeight: 700, fontFamily:'Inter, sans-serif',
                letterSpacing: '.05em', textTransform:'uppercase',
              }}
            >{smsDraftSending ? 'Sending…' : 'Send SMS'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogger;
