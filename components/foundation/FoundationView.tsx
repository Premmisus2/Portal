'use client';

import TopBar from '@/components/layout/TopBar';
import FoundationPanel from '@/components/foundation/FoundationPanel';
import NotesPad from '@/components/ui/NotesPad';

const FoundationView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, shadowMode }: any) => (
  <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0}}>
    <TopBar title="Foundation & Blueprint" subtitle="Section 01 — Core Principles"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={()=>{}}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}/>
    <main className="print-area section-main" style={{flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:'900px', width:'100%', margin:'0 auto'}}>
      <FoundationPanel/>
      <NotesPad storageKey="notes_foundation" />
    </main>
  </div>
);

export default FoundationView;
