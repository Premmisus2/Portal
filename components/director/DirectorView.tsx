'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import TopBar from '@/components/layout/TopBar';
import AllLeadsTable from '@/components/director/AllLeadsTable';
import CallLogTab from '@/components/director/CallLogTab';
import LeadImportTool from '@/components/director/LeadImportTool';
import PipelineFunnelView from '@/components/director/PipelineFunnelView';
import RepPhoneEditor from '@/components/director/RepPhoneEditor';
import type { Lead, CallLog } from '@/lib/types';

const DIRECTOR_TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'leads',    label: 'All Leads' },
  { id: 'calls',    label: 'Call Logs' },
  { id: 'import',   label: 'Import' },
  { id: 'settings', label: 'Settings' },
];

export default function DirectorView(props: any) {
  const { userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, repId, isDirector, shadowMode, actuallyDirector, viewAsRep, onToggleView, shadowRepName, allReps, enterShadow, exitShadow, onToggleSidebar, repPhone } = props;
  const [tab, setTab] = useState('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  useEffect(() => {
    const load = async () => {
      const [leadsRes, logsRes] = await Promise.all([
        supabase.from('leads').select('*, reps(name)').order('created_at', { ascending: false }),
        supabase.from('call_logs').select('*, reps(name)').order('created_at', { ascending: false }).limit(500),
      ]);
      if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
      if (logsRes.data) setCallLogs(logsRes.data as CallLog[]);
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
            style={{ fontSize: '11px', padding: '7px 16px', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {tab === 'pipeline' && <PipelineFunnelView leads={leads} reps={allReps} />}
        {tab === 'leads' && <AllLeadsTable reps={allReps} />}
        {tab === 'calls' && <CallLogTab callLogs={callLogs} repId={repId || ''} />}
        {tab === 'import' && <LeadImportTool />}
        {tab === 'settings' && <RepPhoneEditor repId={repId || ''} currentPhone={repPhone || ''} />}
      </main>
    </div>
  );
}
