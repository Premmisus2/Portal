'use client';

import TopBar from '@/components/layout/TopBar';
import LadderPanel from '@/components/ladder/LadderPanel';

const LadderView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, closeHistory, shadowMode }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0 }}>
    <TopBar
      title="The Ladder" subtitle="Section 08 — Commission Calculator"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints}
      addClose={addClose} undoClose={undoClose}
    />
    {/* Full-height container — LadderPanel manages its own two-panel layout */}
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <LadderPanel
        totalCloses={totalCloses} totalPoints={totalPoints}
        addClose={addClose} undoClose={undoClose}
        closeHistory={closeHistory || []}
      />
    </div>
  </div>
);

export default LadderView;
