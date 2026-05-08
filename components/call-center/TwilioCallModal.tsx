'use client';

import React, { useState, useEffect, useRef } from 'react';
import { reportClientError } from '@/lib/error-reporting';

const TwilioCallModal = ({ lead, repId, repPhone, onClose, onCallComplete }: any) => {
  const [status, setStatus] = useState('initiating');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => { initiateCall(); return () => { clearInterval(timerRef.current); clearInterval(pollRef.current); }; }, []);

  const initiateCall = async () => {
    try {
      const res = await fetch('/api/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repPhone, leadPhone: lead.phone, leadName: lead.business_name,
          leadId: lead.id, repId
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCallSid(data.callSid);
      setCallLogId(data.callLogId);
      setStatus('ringing');
      pollStatus(data.callSid);
    } catch (err: any) {
      setError(err.message);
      setStatus('failed');
    }
  };

  // Poll the server-side /api/call-status-poll endpoint instead of hitting
  // Supabase directly with the anon key. Previously RLS could block the read
  // and the modal would silently stay stuck on "ringing" for 5 full minutes.
  // Server route uses SUPABASE_SERVICE_KEY (bypasses RLS) — see
  // app/api/call-status-poll/route.ts. Tagged #twilio-webhook-hardening.
  const pollStatus = (sid: string) => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/call-status-poll?sid=${encodeURIComponent(sid)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          // 4xx/5xx — surface to Telegram so we know the poll endpoint is broken,
          // but don't kill the poll loop (Twilio webhook may still update the row).
          reportClientError(
            'TwilioCallModal.pollStatus',
            `poll returned ${res.status}`,
            { call_sid: sid },
            'twilio-webhook-hardening',
          );
          return;
        }
        const { row } = await res.json();
        if (!row) return;

        if (row.twilio_status === 'in-progress' || row.twilio_status === 'answered') {
          setStatus('connected');
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
          }
        }
        if (row.twilio_status === 'completed') {
          setStatus('completed');
          setDuration(row.duration_seconds || 0);
          clearInterval(poll);
          clearInterval(timerRef.current);
        }
        if (row.twilio_status === 'busy' || row.twilio_status === 'no-answer' || row.twilio_status === 'failed' || row.twilio_status === 'canceled') {
          setStatus('failed');
          setError('Call ' + row.twilio_status);
          clearInterval(poll);
        }
      } catch (err) {
        reportClientError(
          'TwilioCallModal.pollStatus',
          err,
          { call_sid: sid },
          'twilio-webhook-hardening',
        );
      }
    }, 3000);
    pollRef.current = poll;
    setTimeout(() => clearInterval(poll), 300000);
  };

  const formatDuration = (s: number) => `${Math.floor(s/60)}m ${s%60}s`;

  // Always hand the callLogId up if we have one, so the next CallLogger
  // interaction UPDATEs the existing row instead of inserting a duplicate.
  // This is the fix for the double-logging bug — onCallComplete used to only
  // fire on the 'completed' branch, so failed/canceled/X-close paths left
  // CallLogger with no existingCallLogId and it inserted a fresh row.
  const handleClose = () => {
    if (callLogId) {
      onCallComplete({ callSid, callLogId, duration });
    } else {
      onClose();
    }
  };

  const statusConfig: Record<string, any> = {
    initiating: { dot: '#00F0FF', pulse: true, label: 'Initiating call...' },
    ringing:    { dot: '#F59E0B', pulse: true, label: 'Ringing your phone...' },
    connected:  { dot: '#22c55e', pulse: false, label: 'Connected — hang up on your phone when done' },
    completed:  { dot: '#22c55e', pulse: false, label: 'Call complete' },
    failed:     { dot: '#ff6060', pulse: false, label: error || 'Call failed' },
  };
  const cfg = statusConfig[status] || statusConfig.initiating;

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
      onClick={e => { if (e.target === e.currentTarget && (status === 'completed' || status === 'failed')) handleClose(); }}>
      <div style={{maxWidth:'400px', width:'100%', background:'#0d0d0d', border:'1px solid #1e1e1e', borderRadius:'12px', padding:'32px', position:'relative'}}>
        {/* Close X */}
        <button onClick={handleClose} style={{position:'absolute', top:'12px', right:'12px', background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'4px'}}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#fff'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#555'}>×</button>

        {/* Business Name */}
        <p style={{margin:'0 0 4px', fontSize:'10px', fontWeight:700, color:'#444', letterSpacing:'.12em', textTransform:'uppercase'}}>Calling</p>
        <p style={{margin:'0 0 24px', fontSize:'20px', fontWeight:800, color:'#fff', fontFamily:'Inter,sans-serif'}}>{lead.business_name}</p>

        {/* Status Indicator */}
        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px'}}>
          <div style={{width:'12px', height:'12px', borderRadius:'50%', background: cfg.dot, flexShrink:0,
            animation: cfg.pulse ? 'twiliopulse 1.5s ease-in-out infinite' : 'none'}}/>
          <span style={{fontSize:'14px', color: cfg.dot, fontWeight:600}}>{cfg.label}</span>
        </div>

        {/* Duration (connected or completed) */}
        {(status === 'connected' || status === 'completed') && (
          <div style={{marginBottom:'24px', textAlign:'center'}}>
            <p style={{margin:0, fontSize:'36px', fontWeight:700, color:'#00F0FF', fontFamily:'JetBrains Mono,monospace'}}>{formatDuration(duration)}</p>
          </div>
        )}

        {/* Completed icon */}
        {status === 'completed' && (
          <div style={{textAlign:'center', marginBottom:'16px'}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
        )}

        {/* Failed icon */}
        {status === 'failed' && (
          <div style={{textAlign:'center', marginBottom:'16px'}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff6060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap'}}>
          {status === 'completed' && (
            <button onClick={() => { onCallComplete({ callSid, callLogId, duration }); onClose(); }}
              style={{padding:'10px 24px', borderRadius:'8px', cursor:'pointer', border:'none', background:'#00F0FF', color:'#000',
                fontWeight:800, fontSize:'12px', fontFamily:'Inter,sans-serif', letterSpacing:'.06em', textTransform:'uppercase', transition:'opacity .15s'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity='.85'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity='1'}>
              Log Outcome
            </button>
          )}
          {status === 'failed' && (
            <a href={`tel:${lead.phone}`} onClick={handleClose} style={{padding:'10px 24px', borderRadius:'8px', textDecoration:'none', display:'inline-block',
              background:'transparent', border:'1px solid #333', color:'#888',
              fontWeight:800, fontSize:'12px', fontFamily:'Inter,sans-serif', letterSpacing:'.06em', textTransform:'uppercase', transition:'all .15s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#555'; (e.currentTarget as HTMLElement).style.color='#ccc';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#333'; (e.currentTarget as HTMLElement).style.color='#888';}}>
              Call Manually
            </a>
          )}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes twiliopulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.8); } }`}</style>
    </div>
  );
};

export default TwilioCallModal;
