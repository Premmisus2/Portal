'use client';

import TopBar from '@/components/layout/TopBar';
import LadderPanel from '@/components/ladder/LadderPanel';

const LadderView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, closeHistory, shadowMode }: any) => (
  <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#000', paddingTop: shadowMode ? '40px' : 0}}>
    <TopBar title="The Ladder" subtitle="Section 08 — Commission Calculator"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}/>
    <main className="section-main" style={{flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:'1100px', width:'100%', margin:'0 auto'}}>
      <LadderPanel totalCloses={totalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} closeHistory={closeHistory||[]}/>
    </main>
  </div>
);

export default LadderView;
