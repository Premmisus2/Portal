'use client';

import { useState } from 'react';
import { supabase as sb } from '@/lib/supabase';
import { torontoDayBoundsUTC } from '@/lib/date';
import type { CallLog } from '@/lib/types';

interface CallLogTabProps {
  callLogs: CallLog[];
  repId: string;
}

const outcomes = [
  { value: 'no_answer', label: 'No Answer', color: '#555' },
  { value: 'voicemail_left', label: 'Left Voicemail', color: '#F59E0B' },
  { value: 'callback_requested', label: 'Callback Requested', color: '#a855f7' },
  { value: 'not_interested', label: 'Not Interested', color: '#ef4444' },
  { value: 'booked_call', label: 'Call Booked', color: '#00F0FF' },
  { value: 'wrong_number', label: 'Wrong Number', color: '#888' },
  { value: 'discovery_completed', label: 'Discovery Booked', color: '#22c55e' },
  { value: 'no_show', label: 'No Show', color: '#F59E0B' },
];

const niches = ['Cleaning', 'Landscaping', 'Plumbing', 'Window Washing', 'Pressure Washing', 'Construction', 'Roofing', 'Electrical', 'Painting', 'Pest Control', 'Moving', 'Auto Detailing', 'Flooring', 'Pool Cleaning'];

const outcomeColors: Record<string, string> = { no_answer: '#555', voicemail_left: '#F59E0B', callback_requested: '#a855f7', not_interested: '#ef4444', booked_call: '#00F0FF', wrong_number: '#888', discovery_completed: '#22c55e', no_show: '#F59E0B' };
const outcomeLabels: Record<string, string> = { no_answer: 'No Answer', voicemail_left: 'Voicemail', callback_requested: 'Callback', not_interested: 'Not Interested', booked_call: 'Booked', wrong_number: 'Wrong Number', discovery_completed: 'Discovery Booked', no_show: 'No Show' };

export default function CallLogTab({ callLogs, repId }: CallLogTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [callBiz, setCallBiz] = useState('');
  const [callNiche, setCallNiche] = useState('Cleaning');
  const [callOutcome, setCallOutcome] = useState('no_answer');
  const [callNotes, setCallNotes] = useState('');
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const saveCall = async () => {
    if (!callBiz.trim()) return;
    setSaving(true);
    const logs = JSON.parse(localStorage.getItem('pmss_call_logs') || '[]');
    logs.unshift({
      id: Date.now(),
      business_name: callBiz.trim(),
      niche: callNiche,
      outcome: callOutcome,
      notes: callNotes.trim(),
      call_date: callDate,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('pmss_call_logs', JSON.stringify(logs));
    try {
      const { error: clErr } = await sb.from('call_logs').insert({
        business_name: callBiz.trim(),
        niche: callNiche,
        outcome: callOutcome,
        notes: callNotes.trim(),
        call_date: callDate,
        rep_id: repId,
      });
      if (clErr) { alert('Failed to save call log: ' + clErr.message); setSaving(false); return; }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to save call log: ' + message);
      setSaving(false);
      return;
    }
    setCallBiz(''); setCallNotes(''); setCallOutcome('no_answer');
    setSaving(false);
    setShowForm(false);
    window.dispatchEvent(new Event('refreshCallLogs'));
  };

  const localLogs = JSON.parse(localStorage.getItem('pmss_call_logs') || '[]');
  const allLogs = [...callLogs, ...localLogs.filter((l: CallLog) => !callLogs.some(cl => cl.id === l.id))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalCalls = allLogs.length;
  const { startUTC: todayStartUTC, endUTC: todayEndUTC } = torontoDayBoundsUTC();
  const todayCalls = allLogs.filter((l: CallLog) => l.created_at >= todayStartUTC && l.created_at <= todayEndUTC).length;
  const interestedCalls = allLogs.filter((l: CallLog) => l.outcome === 'discovery_completed' || l.outcome === 'booked_call').length;
  const bookedCalls = allLogs.filter((l: CallLog) => l.outcome === 'booked_call').length;

  return (
    <div>
      {/* Call Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div className="card-glow" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 6px' }}>Total Calls</p>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'monospace' }}>{totalCalls}</p>
        </div>
        <div className="card-glow" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#F59E0B', margin: '0 0 6px' }}>Today</p>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#F59E0B', margin: 0, fontFamily: 'monospace' }}>{todayCalls}</p>
        </div>
        <div className="card-glow" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 6px' }}>Interested</p>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#22c55e', margin: 0, fontFamily: 'monospace' }}>{interestedCalls}</p>
        </div>
        <div className="card-glow" style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 6px' }}>Calls Booked</p>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#00F0FF', margin: 0, fontFamily: 'monospace' }}>{bookedCalls}</p>
        </div>
      </div>

      {/* Add Call Button */}
      <button onClick={() => setShowForm(!showForm)} style={{
        marginBottom: '16px', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
        border: '1px solid rgba(0,240,255,.4)', background: 'rgba(0,240,255,.05)', color: '#00F0FF',
        fontSize: '13px', fontWeight: 700, fontFamily: 'Inter,sans-serif', letterSpacing: '.06em', textTransform: 'uppercase',
      }}>
        {showForm ? '\u2715 Cancel' : '+ Log a Call'}
      </button>

      {/* Add Call Form */}
      {showForm && (
        <div className="card-glow" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>Log Call</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Business Name</label>
              <input className="field" value={callBiz} onChange={e => setCallBiz(e.target.value)} placeholder="e.g. King Quality Cleaning" />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Niche</label>
              <select className="field" value={callNiche} onChange={e => setCallNiche(e.target.value)}>
                {niches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Outcome</label>
              <select className="field" value={callOutcome} onChange={e => setCallOutcome(e.target.value)}>
                {outcomes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Call Date</label>
              <input className="field" type="date" value={callDate} onChange={e => setCallDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Notes</label>
            <textarea className="field" value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={2} placeholder="Ahmed — interested but in a month. Pixie Cleaners." />
          </div>
          <button onClick={saveCall} disabled={saving || !callBiz.trim()} style={{
            padding: '12px 28px', borderRadius: '8px', cursor: saving ? 'wait' : 'pointer',
            border: 'none', background: saving ? '#333' : '#00F0FF', color: '#000',
            fontSize: '13px', fontWeight: 800, fontFamily: 'Inter,sans-serif', letterSpacing: '.06em', textTransform: 'uppercase',
            opacity: !callBiz.trim() ? .4 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Call'}
          </button>
        </div>
      )}

      {/* Call History */}
      <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Call History</h3>
      {allLogs.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#444', fontSize: '14px', margin: 0 }}>No calls logged yet. Click &quot;Log a Call&quot; to start tracking.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allLogs.slice(0, 50).map((log: CallLog, i: number) => {
            const oc = log.outcome || 'no_answer';
            return (
              <div key={log.id || i} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: outcomeColors[oc] || '#555', boxShadow: `0 0 6px ${outcomeColors[oc] || '#555'}55` }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{log.business_name || (log as any).leads?.business_name || '—'}</span>
                    <span style={{ fontSize: '11px', color: '#444' }}>{(log as any).niche}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', border: `1px solid ${outcomeColors[oc]}33`, color: outcomeColors[oc], background: `${outcomeColors[oc]}11`, fontFamily: 'JetBrains Mono,monospace' }}>{outcomeLabels[oc]}</span>
                    <span style={{ fontSize: '11px', color: '#333' }}>{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {log.notes && <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666', lineHeight: 1.5 }}>{log.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
