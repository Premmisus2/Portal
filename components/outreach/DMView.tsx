'use client';

import TopBar from '@/components/layout/TopBar';
import DMPanel from '@/components/outreach/DMPanel';
import NotesPad from '@/components/ui/NotesPad';

const DMView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', paddingTop: shadowMode ? '40px' : 0 }}>
    <TopBar title="DM Scripts" subtitle="Section 10 — Instagram · LinkedIn · Facebook"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} />
    <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      <DMPanel />
      <NotesPad storageKey="notes_dms" />
    </main>
  </div>
);

export default DMView;
