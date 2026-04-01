'use client';

import React, { useState } from 'react';

const CallTranscriptToggle = ({ transcript }: any) => {
  const [show, setShow] = useState(false);
  if (!transcript) return null;
  return (
    <div style={{marginTop:'6px'}}>
      <button onClick={e=>{e.stopPropagation(); setShow(!show);}}
        style={{background:'none', border:'1px solid #1e1e1e', borderRadius:'6px', padding:'4px 10px', cursor:'pointer', fontSize:'10px', fontWeight:700, color:'#666', fontFamily:'Inter,sans-serif', transition:'all .15s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,240,255,.3)'; e.currentTarget.style.color='#00F0FF';}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e'; e.currentTarget.style.color='#666';}}>
        {show ? 'Hide Transcript' : 'Show Transcript'}
      </button>
      {show && (
        <div style={{marginTop:'8px', padding:'12px', background:'rgba(255,255,255,.02)', border:'1px solid #1e1e1e', borderRadius:'8px', maxHeight:'250px', overflowY:'auto'}}>
          <p style={{margin:0, fontSize:'12px', color:'#aaa', lineHeight:'1.6', whiteSpace:'pre-wrap'}}>{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default CallTranscriptToggle;
