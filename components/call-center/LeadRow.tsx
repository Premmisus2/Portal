'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS } from '@/lib/constants';
import { todayInToronto } from '@/lib/date';
import { reportClientError } from '@/lib/error-reporting';
import { recordingProxySrc } from '@/lib/recording';
import CallLogger from './CallLogger';
import TwilioCallModal from './TwilioCallModal';
import InboundDispositionModal from './InboundDispositionModal';
import SmsThread from '@/components/inbox/SmsThread';
import SmsComposer from '@/components/inbox/SmsComposer';

const LeadRow = ({ lead, repId, isExpanded, onToggle, onLogged, callLogs, shadowMode, repPhone, setToast, leadNumber, userName }: any) => {
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [twilioCallData, setTwilioCallData] = useState<any>(null);
  const [dispositionLog, setDispositionLog] = useState<any>(null);
  const [smsMessages, setSmsMessages] = useState<any[] | null>(null);
  const untaggedInbound = Array.isArray(callLogs)
    ? callLogs.find((l: any) => l?.outcome === 'inbound_callback' && !l?.inbound_disposition)
    : null;

  const loadSms = useCallback(async () => {
    if (!lead?.id) return;
    const { data } = await supabase
      .from('sms_messages')
      .select('id, direction, body, status, keyword, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setSmsMessages(data || []);
  }, [lead?.id]);

  useEffect(() => {
    if (isExpanded && smsMessages === null) loadSms();
  }, [isExpanded, smsMessages, loadSms]);
  const priorityClass = lead.priority === 'HOT' ? 'priority-hot' : lead.priority === 'HIGH' ? 'priority-high' : 'priority-medium';
  const lastLog = callLogs && callLogs.length > 0 ? callLogs[0] : null;
  const today = todayInToronto();
  const isOverdue = lastLog?.callback_date && lastLog.callback_date < today;
  const isDueToday = lastLog?.callback_date && lastLog.callback_date === today;
  const isDnc = typeof lead.notes === 'string' && lead.notes.startsWith('🚫 DNC:');
  const statusBorderClass = (!isOverdue && !isDueToday && lead.status && lead.status !== 'new') ? ` status-${lead.status}` : '';
  const rowClass = `lead-row${isExpanded ? ' expanded' : ''}${isOverdue ? ' callback-overdue' : ''}${isDueToday ? ' callback-today' : ''}${statusBorderClass}`;
  const statusColors: Record<string, string> = { new:'var(--green)', contacted:'#3B82F6', callback:'#A855F7', booked:'var(--accent-ink)', not_interested:'var(--text-muted)', discovery_completed:'var(--green)', no_show:'var(--red)', voicemail:'var(--amber)', wrong_number:'var(--text-muted)' };

  const handleMarkDead = async () => {
    const reason = window.prompt('Mark this lead as DEAD (will never be called again).\n\nReason? (e.g. cussed me out / wrong fit / out of business / has agency)');
    if (!reason || !reason.trim()) return;
    const tag = `🚫 DNC: ${reason.trim()} — `;
    const existing = typeof lead.notes === 'string' && !lead.notes.startsWith('🚫 DNC:') ? lead.notes : '';
    const newNotes = tag + existing;
    try {
      const { error } = await supabase.from('leads').update({ status: 'not_interested', notes: newNotes, updated_at: new Date().toISOString() }).eq('id', lead.id);
      if (error) {
        reportClientError('LeadRow.markDead', error, { lead_id: lead.id, reason }, 'mark-dead');
        if (setToast) setToast({ message: 'Failed to mark dead — try again', type: 'error' });
        return;
      }
      if (setToast) setToast({ message: '🚫 Marked dead — won\'t call again', type: 'success' });
      if (onLogged) onLogged(lead.id, 'not_interested', 'not_interested');
      window.dispatchEvent(new Event('refreshCallLogs'));
    } catch (err) {
      reportClientError('LeadRow.markDead.exception', err, { lead_id: lead.id, reason }, 'mark-dead');
      if (setToast) setToast({ message: 'Failed to mark dead — try again', type: 'error' });
    }
  };

  return (
    <div className={rowClass} onClick={()=>onToggle(lead.id)}>
      <div className="lead-row-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1, minWidth:0}}>
          {leadNumber && <span style={{fontSize:'10px', color:'var(--text-faint)', fontFamily:'JetBrains Mono,monospace', fontWeight:600, minWidth:'28px'}}>#{leadNumber}</span>}
          <span className={priorityClass}>{lead.priority}</span>
          <span style={{fontSize:'14px', fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lead.business_name}</span>
          <span className="niche-badge">{lead.niche}</span>
          {lead.status && lead.status !== 'new' && (
            <span style={{fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', background:`${statusColors[lead.status] || 'var(--text-muted)'}15`, color: statusColors[lead.status] || 'var(--text-muted)', letterSpacing:'.05em', textTransform:'uppercase'}}>{lead.status.replace('_',' ')}</span>
          )}
          {isDnc && (
            <span title={lead.notes} style={{fontSize:'9px', fontWeight:800, padding:'2px 8px', borderRadius:'4px', background:'rgba(255,96,96,.15)', color:'var(--red)', letterSpacing:'.08em', textTransform:'uppercase', cursor:'help'}}>🚫 Dead</span>
          )}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px', flexShrink:0}}>
          {lead.city && <span style={{fontSize:'11px', color:'var(--text-faint)'}}>{lead.city}</span>}
          {repPhone && !shadowMode ? (
            <button onClick={e=>{e.stopPropagation(); setShowCallModal(true);}} className="lr-action-btn"
              style={{display:'flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'JetBrains Mono,monospace',
                background:'transparent', border:'1px solid var(--accent-glow-30)', color:'var(--accent-ink)', transition:'all .15s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='var(--accent-glow-08)'; (e.currentTarget as HTMLElement).style.borderColor='var(--accent-glow-50)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.borderColor='var(--accent-glow-30)';}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {lead.phone}
            </button>
          ) : (
            // Tap-to-call fallback (no rep phone configured OR shadow mode): open native dialer only.
            // Do NOT auto-log a row here — it inflates dial counts with phantom rows that never went through Twilio.
            // Rep must use the "Log Call" button after the call to record outcome.
            <a href={'tel:' + lead.phone}
              onClick={e=>e.stopPropagation()}
              style={{fontSize:'12px', color:'var(--accent-ink)', textDecoration:'none', fontFamily:'JetBrains Mono,monospace', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0}}>{lead.phone}</a>
          )}
          {lastLog && (
            <span style={{fontSize:'10px', color: OUTCOME_COLORS[lastLog.outcome] || 'var(--text-muted)', fontWeight:700}}>{OUTCOME_LABELS[lastLog.outcome]}</span>
          )}
          {lastLog?.callback_date && (
            <span style={{fontSize:'10px', color: isOverdue ? 'var(--red)' : isDueToday ? 'var(--amber)' : 'var(--text-faint)', fontWeight:600}}>
              {isOverdue ? '⚠ Overdue' : isDueToday ? '📞 Today' : `CB: ${lastLog.callback_date}`}
            </span>
          )}
          {untaggedInbound && !shadowMode && (
            <button onClick={e=>{e.stopPropagation(); setDispositionLog(untaggedInbound);}}
              title="They called back — tag the disposition so it's logged correctly."
              style={{padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'9px', fontWeight:800, fontFamily:'JetBrains Mono,monospace', letterSpacing:'.08em', textTransform:'uppercase', transition:'all .15s',
                background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.45)', color:'var(--amber)',
                animation:'pulse-amber 2s ease-in-out infinite'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(245,158,11,.22)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(245,158,11,.12)';}}>
              📞 Tag Callback
            </button>
          )}
          <button onClick={e=>{e.stopPropagation(); if(!shadowMode) setShowQuickLog(!showQuickLog);}}
            disabled={shadowMode} className="lr-action-btn"
            style={{padding:'5px 12px', borderRadius:'6px', cursor: shadowMode ? 'not-allowed' : 'pointer', fontSize:'10px', fontWeight:800, fontFamily:'Inter,sans-serif', letterSpacing:'.06em', textTransform:'uppercase', transition:'all .15s',
              background: shadowMode ? 'rgba(255,255,255,.03)' : showQuickLog ? 'var(--accent-glow-15)' : 'var(--accent-glow-06)',
              border: `1px solid ${shadowMode ? 'var(--border)' : showQuickLog ? 'var(--accent-glow-40)' : 'var(--accent-glow-15)'}`,
              color: shadowMode ? 'var(--text-faint)' : 'var(--accent-ink)', opacity: shadowMode ? .5 : 1,
            }}>{shadowMode ? 'Read Only' : 'Log Call'}</button>
          {!shadowMode && !isDnc && (
            <button onClick={e=>{e.stopPropagation(); handleMarkDead();}} title="Mark dead — never call again" className="lr-action-btn lr-action-btn--dnc"
              style={{padding:'5px 9px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:700, lineHeight:1, transition:'all .15s',
                background:'transparent', border:'1px solid rgba(255,96,96,.25)', color:'var(--red)'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,96,96,.1)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,96,96,.5)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.borderColor='rgba(255,96,96,.25)';}}>
              🚫
            </button>
          )}
        </div>
      </div>

      {/* Quick Inline Logger — visible without expanding, hidden in shadow mode */}
      {showQuickLog && !isExpanded && !shadowMode && (
        <div className="fadein" onClick={e=>e.stopPropagation()} style={{marginTop:'12px', padding:'12px 16px', background:'rgba(0,240,255,.02)', borderRadius:'8px', border:'1px solid var(--accent-glow-08)'}}>
          <CallLogger lead={lead} repId={repId} userName={userName} onLogged={(leadId: any, outcome: any, newStatus: any) => { setTwilioCallData(null); onLogged(leadId, outcome, newStatus); setShowQuickLog(false); }} existingCallLogId={twilioCallData?.callLogId || null}/>
        </div>
      )}

      {isExpanded && (
        <div className="fadein" onClick={e=>e.stopPropagation()} style={{marginTop:'16px'}}>
          {/* Lead Details */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'10px', marginBottom:'14px'}}>
            {lead.contact_name && <div><span style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase'}}>Contact</span><p style={{margin:'2px 0 0', fontSize:'13px', color:'var(--text-secondary)'}}>{lead.contact_name}</p></div>}
            {lead.website && <div><span style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase'}}>Website</span><p style={{margin:'2px 0 0', fontSize:'13px'}}><a href={lead.website} target="_blank" rel="noopener" style={{color:'var(--accent-ink)', textDecoration:'none'}}>{lead.website}</a></p></div>}
            {lead.email && <div><span style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase'}}>Email</span><p style={{margin:'2px 0 0', fontSize:'13px', color:'var(--text-secondary)'}}>{lead.email}</p></div>}
            {lead.instagram && <div><span style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase'}}>Instagram</span><p style={{margin:'2px 0 0', fontSize:'13px', color:'var(--text-secondary)'}}>{lead.instagram}</p></div>}
            <div><span style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase'}}>Google Reviews</span><p style={{margin:'2px 0 0', fontSize:'13px', color:'var(--text-secondary)'}}>{lead.google_reviews || 0}</p></div>
            {lead.notes && <div style={{gridColumn:'1 / -1'}}><span style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase'}}>Notes</span><p style={{margin:'2px 0 0', fontSize:'13px', color:'var(--text-tertiary)'}}>{lead.notes}</p></div>}
          </div>

          {/* Call History */}
          {callLogs && callLogs.length > 0 && (
            <div style={{marginBottom:'14px'}}>
              <p style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase', margin:'0 0 8px'}}>Call History</p>
              <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                {callLogs.slice(0, 5).map((log: any) => {
                  const autoConfPct = typeof log.outcome_auto_confidence === 'number' ? Math.round(log.outcome_auto_confidence * 100) : null;
                  const aiDisagrees = !!log.outcome_auto && log.outcome_auto !== log.outcome && (log.outcome_auto_confidence || 0) > 0.7;
                  const aiAgrees = !!log.outcome_auto && log.outcome_auto === log.outcome;
                  const aiBadgeColor = aiDisagrees ? 'var(--amber)' : aiAgrees ? 'var(--green)' : '#3B82F6';
                  return (
                  <div key={log.id} style={{display:'flex', flexDirection:'column', gap:'4px', padding:'6px 10px', background:'var(--bg-elev-2)', borderRadius:'6px', border:`1px solid ${aiDisagrees ? 'rgba(245,158,11,.35)' : '#151515'}`}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                      <div className={`call-history-dot outcome-${log.outcome}`}/>
                      <span style={{fontSize:'11px', color: OUTCOME_COLORS[log.outcome], fontWeight:600}}>{OUTCOME_LABELS[log.outcome]}</span>
                      {log.call_sid && <span style={{fontSize:'8px', fontWeight:700, padding:'1px 5px', borderRadius:'3px', background:'rgba(124,58,237,.15)', color:'#a78bfa', letterSpacing:'.05em', textTransform:'uppercase'}}>Twilio</span>}
                      {log.outcome_auto && (
                        <span title={log.outcome_auto_reasoning || ''} style={{fontSize:'8px', fontWeight:700, padding:'1px 5px', borderRadius:'3px', background:`${aiBadgeColor}1f`, color:aiBadgeColor, letterSpacing:'.05em', textTransform:'uppercase', cursor: log.outcome_auto_reasoning ? 'help' : 'default'}}>
                          AI: {(OUTCOME_LABELS[log.outcome_auto] || log.outcome_auto).toUpperCase()}{autoConfPct != null ? ` ${autoConfPct}%` : ''}{aiDisagrees ? ' ⚠' : aiAgrees ? ' ✓' : ''}
                        </span>
                      )}
                      {log.duration_seconds != null && log.duration_seconds > 0 && (
                        <span style={{fontSize:'10px', color:'var(--text-tertiary)', fontFamily:'JetBrains Mono,monospace', fontWeight:500}}>{Math.floor(log.duration_seconds/60)}m {log.duration_seconds%60}s</span>
                      )}
                      <span style={{fontSize:'10px', color:'var(--text-faint)', marginLeft:'auto', fontFamily:'monospace'}}>{new Date(log.created_at).toLocaleDateString(undefined, { timeZone: 'America/Toronto' })}</span>
                      {log.notes && (
                        log.notes.length > 80 && expandedNote !== log.id
                          ? <span onClick={e=>{e.stopPropagation(); setExpandedNote(log.id);}} style={{fontSize:'10px', color:'var(--text-muted)', fontStyle:'italic', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer'}} title="Click to expand">— {log.notes.slice(0,80)}...</span>
                          : <span onClick={e=>{e.stopPropagation(); setExpandedNote(expandedNote === log.id ? null : log.id);}} style={{fontSize:'10px', color:'var(--text-muted)', fontStyle:'italic', wordBreak:'break-word', whiteSpace:'normal', cursor: log.notes.length > 80 ? 'pointer' : 'default'}}>— {log.notes}</span>
                      )}
                    </div>
                    {aiDisagrees && log.outcome_auto_reasoning && (
                      <div style={{paddingLeft:'20px', fontSize:'10px', color:'var(--amber)', fontStyle:'italic'}}>
                        AI suggests {OUTCOME_LABELS[log.outcome_auto] || log.outcome_auto}: {log.outcome_auto_reasoning}
                      </div>
                    )}
                    {(() => { const src = recordingProxySrc(log); return src ? (
                      <div style={{paddingLeft:'20px'}} onClick={e=>e.stopPropagation()}>
                        <audio controls src={src} style={{width:'100%', height:'32px'}} preload="none"/>
                      </div>
                    ) : null; })()}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SMS Thread (inline) */}
          {smsMessages !== null && smsMessages.length > 0 && (
            <div style={{marginBottom:'14px'}}>
              <p style={{fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase', margin:'0 0 8px'}}>SMS Thread {smsMessages.length >= 10 ? '(last 10)' : ''}</p>
              <div style={{padding:'10px 12px', background:'var(--bg-elev-2)', borderRadius:'8px', border:'1px solid var(--border)', display:'flex', flexDirection:'column'}}>
                <SmsThread messages={smsMessages.slice(0,10) as any} />
              </div>
            </div>
          )}
          {/* SMS Composer — only when not opted out, has phone, not shadow */}
          {!shadowMode && lead.phone && !lead.sms_opted_out_at && repId && (
            <div style={{marginBottom:'14px'}} onClick={e=>e.stopPropagation()}>
              <SmsComposer leadId={lead.id} leadPhone={lead.phone} repId={repId} optedOut={false} onSent={loadSms} setToast={setToast}/>
            </div>
          )}
          {lead.sms_opted_out_at && (
            <div style={{marginBottom:'14px', padding:'8px 12px', background:'rgba(255,96,96,.08)', border:'1px solid rgba(255,96,96,.25)', borderRadius:'6px', color:'var(--red)', fontSize:'11px', fontWeight:600}}>
              🚫 SMS opted out — replied STOP
            </div>
          )}

          {/* Call Logger — hidden in shadow mode */}
          {!shadowMode && <CallLogger lead={lead} repId={repId} userName={userName} onLogged={(leadId: any, outcome: any, newStatus: any) => { setTwilioCallData(null); onLogged(leadId, outcome, newStatus); }} existingCallLogId={twilioCallData?.callLogId || null}/>}
        </div>
      )}

      {/* Twilio Call Modal */}
      {showCallModal && repPhone && (
        <TwilioCallModal lead={lead} repId={repId} repPhone={repPhone}
          onClose={() => setShowCallModal(false)}
          onCallComplete={(data: any) => { setTwilioCallData(data); setShowCallModal(false); setShowQuickLog(false); onToggle(lead.id); }}/>
      )}

      {/* Inbound Callback Disposition Modal */}
      {dispositionLog && (
        <InboundDispositionModal
          log={dispositionLog}
          businessName={lead.business_name}
          onClose={() => setDispositionLog(null)}
          onSaved={() => { window.dispatchEvent(new Event('refreshCallLogs')); if (setToast) setToast({ message: '✓ Callback tagged', type: 'success' }); }}/>
      )}
    </div>
  );
};

export default LeadRow;
