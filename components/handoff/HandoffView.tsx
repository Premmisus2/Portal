'use client';

import TopBar from '@/components/layout/TopBar';
import HandoffPanel from '@/components/handoff/HandoffPanel';

const HandoffView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, repId, shadowMode }: any) => (
  <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0}}>
    <TopBar title="Director Handoff" subtitle="Section 09 — Internal Ping"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}/>
    <main className="section-main" style={{flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:'700px', width:'100%', margin:'0 auto'}}>
      {shadowMode ? (
        <div className="card" style={{padding:'40px', textAlign:'center'}}>
          <p style={{color:'var(--amber)', fontSize:'14px', margin:0, fontWeight:700}}>Read Only — Shadow Mode</p>
          <p style={{color:'var(--text-faint)', fontSize:'12px', margin:'6px 0 0'}}>Cannot submit handoffs while shadowing a rep.</p>
        </div>
      ) : (
        <HandoffPanel userName={userName} userEmail={userEmail} repId={repId}/>
      )}
    </main>
  </div>
);

export default HandoffView;
