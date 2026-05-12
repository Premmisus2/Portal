'use client';

import TopBar from '@/components/layout/TopBar';
import PostCallPanel from '@/components/postcall/PostCallPanel';
import NotesPad from '@/components/ui/NotesPad';

const PostCallView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, shadowMode }: any) => (
  <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0}}>
    <TopBar title="Post-Call Protocols" subtitle="Section 07 — Follow-Through"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={()=>{}}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}/>
    <main className="print-area section-main" style={{flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:'900px', width:'100%', margin:'0 auto'}}>
      <PostCallPanel/>
      <NotesPad storageKey="notes_postcall" />
    </main>
  </div>
);

export default PostCallView;
