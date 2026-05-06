'use client';

import { useState } from 'react';

const Logo = ({ height = 32 }: { height?: number }) => (
  <div style={{height, display:'flex', alignItems:'center'}}>
    <img src="/logo.png" alt="Premmisus" style={{height:'100%', objectFit:'contain'}} />
  </div>
);

export default function GlobalSidebar({ open, onClose, onNav, currentView, isDirector }: { open: any; onClose: any; onNav: any; currentView: any; isDirector: any }) {
  const [expanded, setExpanded] = useState({ outreach: false, scripts: false });
  const toggle = (cat: string) => setExpanded(e => ({ ...e, [cat]: !e[cat] }));
  const go = (key: string) => { onNav(key); onClose(); };
  return (
    <>
      <div className={`global-sidebar-overlay${open ? ' open' : ''}`} onClick={onClose}/>
      <nav className={`global-sidebar${open ? ' open' : ''}`}>
        <div style={{padding:'16px 20px', borderBottom:'1px solid #111', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <Logo height={22}/>
          <button aria-label="Close navigation" onClick={onClose} style={{background:'none', border:'1px solid #1e1e1e', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'#444', fontSize:'11px', fontFamily:'Inter'}}>&#10005;</button>
        </div>

        <div style={{padding:'12px 0'}}>
          {/* Cold Calling */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='coldcall'?' active':''}`} onClick={()=>go('coldcall')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#9742;</span> Call Center
            </button>
          </div>

          {/* Leaderboard */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='leaderboard'?' active':''}`} onClick={()=>go('leaderboard')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#127942;</span> Leaderboard
            </button>
          </div>

          {/* Written Outreach */}
          <div className="gs-category">
            <div className="gs-category-label" onClick={()=>toggle('outreach')}>
              <span style={{fontSize:'8px', transition:'transform .15s', transform: expanded.outreach?'rotate(90deg)':'rotate(0)'}}>&#9654;</span>
              Written Outreach
            </div>
            {expanded.outreach && (
              <div className="fadein">
                <button className={`gs-item${currentView==='dms'?' active':''}`} onClick={()=>go('dms')}>DM Scripts</button>
                <button className={`gs-item${currentView==='email'?' active':''}`} onClick={()=>go('email')}>Email Outreach</button>
                <button className={`gs-item${currentView==='sms'?' active':''}`} onClick={()=>go('sms')}>SMS Sequences</button>
              </div>
            )}
          </div>

          {/* Scripts & Sequences */}
          <div className="gs-category">
            <div className="gs-category-label" onClick={()=>toggle('scripts')}>
              <span style={{fontSize:'8px', transition:'transform .15s', transform: expanded.scripts?'rotate(90deg)':'rotate(0)'}}>&#9654;</span>
              Scripts & Sequences
            </div>
            {expanded.scripts && (
              <div className="fadein">
                <button className={`gs-item${currentView==='foundation'?' active':''}`} onClick={()=>go('foundation')}>Foundation</button>
                <button className={`gs-item${currentView==='scripts'?' active':''}`} onClick={()=>go('scripts')}>Call Scripts</button>
                {isDirector && <button className={`gs-item${currentView==='voicemail'?' active':''}`} onClick={()=>go('voicemail')}>Voicemail Scripts</button>}
                {isDirector && <button className={`gs-item${currentView==='discovery'?' active':''}`} onClick={()=>go('discovery')}>Discovery Call</button>}
                {isDirector && <button className={`gs-item${currentView==='noshow'?' active':''}`} onClick={()=>go('noshow')}>No-Show Recovery</button>}
                {isDirector && <button className={`gs-item${currentView==='upsell'?' active':''}`} onClick={()=>go('upsell')}>0.5 &rarr; 1.0 Upsell</button>}
                <button className={`gs-item${currentView==='postcall'?' active':''}`} onClick={()=>go('postcall')}>Post-Call</button>
                <button className={`gs-item${currentView==='handoff'?' active':''}`} onClick={()=>go('handoff')}>Director Handoff</button>
                {isDirector && <button className={`gs-item${currentView==='proofpoints'?' active':''}`} onClick={()=>go('proofpoints')}>Proof Points & Ammo</button>}
              </div>
            )}
          </div>

          {/* The Ladder */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='ladder'?' active':''}`} onClick={()=>go('ladder')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#128200;</span> The Ladder
            </button>
          </div>

          {/* Offer Stack */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='offerstack'?' active':''}`} onClick={()=>go('offerstack')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#128142;</span> Offer Stack
            </button>
          </div>

          {/* AI Tools */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='aitools'?' active':''}`} onClick={()=>go('aitools')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#9889;</span> AI Tools
            </button>
          </div>

          {/* Training / SOPs */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='training'?' active':''}`} onClick={()=>go('training')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#128214;</span> Training / SOPs
            </button>
          </div>

          {/* Director Dashboard */}
          {isDirector && (
            <div className="gs-category" style={{borderTop:'1px solid #111', marginTop:'8px', paddingTop:'8px'}}>
              <button className={`gs-item${currentView==='director'?' active':''}`} onClick={()=>go('director')} style={{paddingLeft:'20px'}}>
                <span style={{fontSize:'14px'}}>&#127919;</span> Director Dashboard
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
