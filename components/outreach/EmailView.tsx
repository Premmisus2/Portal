'use client';

import TopBar from '@/components/layout/TopBar';
import EmailPanel from '@/components/outreach/EmailPanel';
import NotesPad from '@/components/ui/NotesPad';

const EmailView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0 }}>
    <TopBar title="Email Outreach" subtitle="Section 11 — 3-Touch Cold Sequence"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} />
    <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      <EmailPanel />
      <NotesPad storageKey="notes_email" />
    </main>
  </div>
);

export default EmailView;
