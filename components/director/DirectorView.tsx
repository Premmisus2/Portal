'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import TopBar from '@/components/layout/TopBar';
import AllLeadsTable from '@/components/director/AllLeadsTable';
import CallLogTab from '@/components/director/CallLogTab';
import LeadImportTool from '@/components/director/LeadImportTool';
import PipelineFunnelView from '@/components/director/PipelineFunnelView';
import PhoneSettings from '@/components/director/PhoneSettings';
import type { Lead, CallLog } from '@/lib/types';

const DIRECTOR_TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'closes',   label: 'Pending Closes' },
  { id: 'leads',    label: 'All Leads' },
  { id: 'calls',    label: 'Call Logs' },
  { id: 'import',   label: 'Import' },
  { id: 'settings', label: 'Settings' },
];


function PendingClosesTab({ closes, onApprove, onReject }: { closes: any[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  if (closes.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#333' }}>
      <p style={{ fontSize: '32px', margin: '0 0 12px' }}>✓</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#555', margin: 0 }}>No pending closes</p>
      <p style={{ fontSize: '12px', color: '#333', margin: '4px 0 0' }}>All closes have been reviewed.</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Pending Close Approvals</h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Review and approve or reject rep-submitted closes. Points only count after approval.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {closes.map((c: any) => {
          const date = new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          return (
            <div key={c.id} style={{ background: '#0d0d0d', border: '1px solid rgba(245,158,11,.2)', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>{c.reps?.name || 'Unknown Rep'}</span>
                  <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>PENDING</span>
                </div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#ccc' }}>{c.product_label || `${c.pts} pt close`}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>{date} · +{c.pts} pt{c.pts > 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => onReject(c.id)}
                  style={{ padding: '7px 14px', borderRadius: '7px', background: 'transparent', border: '1px solid #ff6060', color: '#ff6060', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,96,96,.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  Reject
                </button>
                <button onClick={() => onApprove(c.id)}
                  style={{ padding: '7px 14px', borderRadius: '7px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.35)', color: '#22c55e', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,.1)'; }}>
                  Approve
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DirectorView(props: any) {
  const { userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, repId, isDirector, shadowMode, actuallyDirector, viewAsRep, onToggleView, shadowRepName, allReps, enterShadow, exitShadow, onToggleSidebar, repPhone } = props;
  const [tab, setTab] = useState('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [pendingCloses, setPendingCloses] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const loadPendingCloses = async () => {
    const { data } = await supabase.from('closes').select('*, reps(name, email)').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) { setPendingCloses(data); setPendingCount(data.length); }
  };

  useEffect(() => {
    const load = async () => {
      const [leadsRes, logsRes] = await Promise.all([
        supabase.from('leads').select('*, reps(name)').order('created_at', { ascending: false }),
        supabase.from('call_logs').select('*, reps(name)').order('created_at', { ascending: false }).limit(500),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
      if (logsRes.data) setCallLogs(logsRes.data as CallLog[]);
      await loadPendingCloses();
    };
    load();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', paddingTop: shadowMode ? '40px' : 0 }}>
      <TopBar title="Director Dashboard" subtitle="Command & Control"
        userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
        totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}
        onToggleSidebar={onToggleSidebar}
        actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView}
        shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow} />

      {/* Tab bar */}
      <div className="no-print" style={{ display: 'flex', gap: '4px', padding: '8px 24px', borderBottom: '1px solid #111', background: '#050505', overflowX: 'auto', flexShrink: 0 }}>
        {DIRECTOR_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`call-tab${tab === t.id ? ' active' : ''}`}
            style={{ fontSize: '11px', padding: '7px 16px', whiteSpace: 'nowrap', position: 'relative' }}>
            {t.label}
            {t.id === 'closes' && pendingCount > 0 && (
              <span style={{ marginLeft: '6px', background: '#F59E0B', color: '#000', fontSize: '9px', fontWeight: 800, borderRadius: '10px', padding: '1px 6px', fontFamily: 'JetBrains Mono, monospace' }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {tab === 'pipeline' && <PipelineFunnelView leads={leads} reps={allReps} />}
        {tab === 'closes' && <PendingClosesTab closes={pendingCloses} onApprove={async (id: string) => {
          const close = pendingCloses.find((c: any) => c.id === id);
          await supabase.from('closes').update({ status: 'approved' }).eq('id', id);
          await loadPendingCloses();
          if (close) {
            fetch('/api/notify-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'close_approved', repName: close.reps?.name || 'Rep', businessName: close.product_label || `${close.pts}pt close` }) }).catch(() => {});
          }
        }} onReject={async (id: string) => {
          const close = pendingCloses.find((c: any) => c.id === id);
          await supabase.from('closes').update({ status: 'rejected' }).eq('id', id);
          await loadPendingCloses();
          if (close) {
            fetch('/api/notify-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'close_rejected', repName: close.reps?.name || 'Rep', businessName: close.product_label || `${close.pts}pt close` }) }).catch(() => {});
          }
        }} />}
        {tab === 'leads' && <AllLeadsTable reps={allReps} />}
        {tab === 'calls' && <CallLogTab callLogs={callLogs} repId={repId || ''} />}
        {tab === 'import' && <LeadImportTool />}
        {tab === 'settings' && <PhoneSettings />}
      </main>
    </div>
  );
}
