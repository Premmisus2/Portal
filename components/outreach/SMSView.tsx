'use client';

import TopBar from '@/components/layout/TopBar';
import SMSPanel from '@/components/outreach/SMSPanel';
import NotesPad from '@/components/ui/NotesPad';

const SMSView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0 }}>
    <TopBar title="SMS Sequences" subtitle="Section 12 — Warm Leads Only"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} />
    <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      <SMSPanel />
      <NotesPad storageKey="notes_sms" />
    </main>
  </div>
);

export default SMSView;
