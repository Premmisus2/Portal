'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import Logo from '@/components/shared/Logo';
import ProfileDropdown from '@/components/layout/ProfileDropdown';
import ClosesTracker from '@/components/shared/ClosesTracker';
import RotatingHeadline from '@/components/home/RotatingHeadline';
import AnnouncementsBanner from '@/components/home/AnnouncementsBanner';

interface HomeViewProps {
  userName: any;
  userEmail: any;
  onNav: any;
  onLogout: any;
  totalCloses: any;
  setTotalCloses: any;
  totalPoints: any;
  addClose: any;
  undoClose: any;
  onShortcuts: any;
  isDirector: any;
  onToggleSidebar: any;
  actuallyDirector: any;
  viewAsRep: any;
  onToggleView: any;
  shadowMode: any;
  shadowRepName: any;
  allReps: any;
  enterShadow: any;
  exitShadow: any;
  missedEventCount?: any;
}

export default function HomeView({ userName, userEmail, onNav, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, onShortcuts, isDirector, onToggleSidebar, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow, missedEventCount = 0 }: HomeViewProps) {
  const sections: any[] = [
    {
      key: 'coldcall',
      num: '\u260E',
      title: 'Call Center',
      desc: 'Your leads, your calls, your numbers. Log any call \u2014 cold, discovery, follow-up, no-show. Track callbacks and see your stats.',
      pills: ['Call List', 'Call Logger', 'Callbacks', 'Calendar', 'My Stats'],
      featured: true,
    },
    {
      key: 'foundation',
      num: '01',
      title: 'Foundation & Blueprint',
      desc: 'The immovable core. Who we are, who we target, how we get paid, and the three rules that govern every call.',
      pills: ['Mission', 'Revenue Blueprint', 'Career Ladder', 'Anti-Agency Rules'],
    },
    {
      key: 'scripts',
      num: '02 \u2013 06',
      title: 'Scripts & Sequences',
      desc: 'Your live-call arsenal. Five fully loaded scripts covering openers, hooks, objections, recovery moves, and the close.',
      pills: ['Entry Matrices', 'Verbatim Hooks', 'Objection Handling', 'Misstep Corrections', 'The Financial Close'],
      featured: true,
    },
    {
      key: 'outreach',
      num: '10 \u2013 12',
      title: 'Written Outreach',
      desc: 'DM, email, and SMS scripts and sequences. Instagram, LinkedIn, Facebook, cold email, and warm SMS \u2014 all copy-ready.',
      pills: ['DMs', 'Email', 'SMS', '3-Touch Sequences'],
    },
    {
      key: 'postcall',
      num: '07',
      title: 'Post-Call Protocols',
      desc: 'What happens after you hang up determines the outcome. SMS templates, asset collection, and the internal ping format.',
      pills: ['SMS Templates', '5-Day Protocol', 'Internal Ping'],
    },
    {
      key: 'ladder',
      num: '08',
      title: 'The Ladder',
      desc: 'Real-time commission calculator. Track closes, unlock tier benefits, and project your monthly and annual CAD income.',
      pills: ['Commission Math', 'Tier Tracker', 'Income Projections', '10K Blueprint'],
      featured: true,
    },
    {
      key: 'handoff',
      num: '09',
      title: 'Director Handoff',
      desc: 'Generate the internal ping for Elliott. Log the lead, the pain point, and the next step after every close or booked meet.',
      pills: ['Internal Ping', 'Lead Capture', 'Meet Lock-In'],
    },
    {
      key: 'aitools',
      num: '\u26A1',
      title: 'AI Tools',
      desc: 'Voice assistants, chatbot widgets, and AI-powered automation tools we deploy for clients.',
      pills: ['Voice AI', 'Chatbot', 'Automated Outreach'],
    },
    {
      key: 'training',
      num: '\uD83D\uDCD6',
      title: 'Training / SOPs',
      desc: 'Video training, standard operating procedures, and the career path to operator.',
      pills: ['Masterclass', 'SOPs', 'Operator Track'],
    },
  ];

  if (isDirector) {
    sections.push({
      key: 'director',
      num: 'D',
      title: 'Director Dashboard',
      desc: 'Real-time view of all rep performance, closes, tier progress, handoff submissions, and lead assignment.',
      pills: ['Rep Roster', 'Team Stats', 'Handoff Feed', 'Lead Assignment', 'Lead Import'],
      featured: true,
    });
    sections.push({
      key: 'newupdates',
      num: '\uD83D\uDD27',
      title: 'New Updates',
      desc: 'New features built but not yet active. Build these once the current sales portal is up to speed.',
      pills: ['0.5\u21921.0 Upsell', 'Voicemail Scripts', 'Discovery Call', 'No-Show Recovery', 'Proof Points'],
    });
  }

  return (
    <div style={{minHeight:'100vh', background:'#000', display:'flex', flexDirection:'column', paddingTop: shadowMode ? '40px' : 0}}>
      <header className="no-print home-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid #0f0f0f', background:'#040404', gap:'12px', flexWrap:'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <button className="hamburger-btn" onClick={onToggleSidebar}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
          </button>
          <Logo height={26}/>
        </div>
        <div className="closes-tracker-full"><ClosesTracker totalCloses={totalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}/></div>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <div className="pulse"/>
            <span style={{fontSize:'11px', fontWeight:600, color:'#444', letterSpacing:'.08em'}}>{userName}</span>
          </div>
          <ProfileDropdown userName={userName} userEmail={userEmail} totalCloses={totalCloses} totalPoints={totalPoints} onLogout={onLogout} onShortcuts={onShortcuts} actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView} shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow}/>
        </div>
      </header>

      <div className="hub-hero" style={{position:'relative', overflow:'hidden', padding:'40px 20px 36px', textAlign:'center'}}>
        <div className="grid-bg" style={{position:'absolute', inset:0, opacity:.4, pointerEvents:'none'}}/>
        <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,240,255,.07) 0%, transparent 65%)', pointerEvents:'none'}}/>
        <div style={{position:'relative', zIndex:1}}>
          <span className="tag" style={{marginBottom:'20px', display:'inline-block'}}>Premmisus Sales Command</span>
          <RotatingHeadline />
          <p className="hub-subtitle" style={{color:'#555', fontSize:'15px', maxWidth:'480px', margin:'0 auto 8px', lineHeight:1.6}}>
            Your full sales operating system. Scripts, outreach, commissions, and coaching — all in one place.
          </p>
          <p className="hub-shortcuts" style={{color:'#2e2e2e', fontSize:'11px', margin:0, letterSpacing:'.12em', textTransform:'uppercase', fontWeight:600}}>
            Shift + 1–8 to jump · Press ? for shortcuts
          </p>
        </div>
      </div>

      <AnnouncementsBanner/>
      <div style={{padding:'0 16px 60px', maxWidth:'1100px', margin:'0 auto', width:'100%'}}>
        <div className="hub-grid" style={{
          display:'grid',
          gridTemplateColumns:'repeat(3, 1fr)',
          gridTemplateAreas: isDirector
            ? `"coldcall coldcall coldcall" "foundation scripts scripts" "outreach postcall ladder" "handoff aitools training" "director director director" "newupdates newupdates newupdates"`
            : `"coldcall coldcall coldcall" "foundation scripts scripts" "outreach postcall ladder" "handoff aitools training"`,
          gap:'16px',
        }}>
          {sections.map((s: any)=>(
            <button key={s.key} className="hub-card fadein" onClick={()=>{ if (!s.locked) onNav(s.key === 'outreach' ? 'dms' : s.key); }}
              style={{
                gridArea: s.key,
                padding:'28px',
                textAlign:'left',
                cursor: s.locked ? 'default' : 'pointer',
                border: s.featured ? '1px solid rgba(0,240,255,.3)' : '1px solid #1a1a1a',
                outline:'none',
                font:'inherit',
                opacity: s.locked ? .35 : 1,
                pointerEvents: s.locked ? 'none' : 'auto',
              }}>
              {/* Notification badge for Director Dashboard */}
              {s.key === 'director' && missedEventCount > 0 && (
                <span style={{position:'absolute', top:'-1px', right:'-1px', background:'#ff4444', color:'#fff', borderRadius:'12px', minWidth:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, padding:'0 6px', boxShadow:'0 0 12px rgba(255,68,68,.5)', zIndex:2}}>{missedEventCount}</span>
              )}
              <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px'}}>
                <span style={{fontSize:'10px', fontWeight:800, letterSpacing:'.2em', color:'#00F0FF'}}>{s.num}</span>
                <div style={{flex:1, height:'1px', background:'rgba(0,240,255,.15)'}}/>
                {s.featured && (
                  <span style={{fontSize:'9px', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', color:'#00F0FF', background:'rgba(0,240,255,.08)', border:'1px solid rgba(0,240,255,.25)', borderRadius:'4px', padding:'2px 8px', flexShrink:0}}>
                    {s.key === 'ladder' ? 'Live Calculator' : s.key === 'scripts' ? 'Live Scripts' : s.key === 'coldcall' ? 'Command Center' : 'Featured'}
                  </span>
                )}
              </div>
              <h2 style={{fontSize: s.key==='scripts' ? '24px' : '20px', fontWeight:800, color:'#fff', margin:'0 0 10px', letterSpacing:'-.01em'}}>{s.title}</h2>
              <p style={{color:'#666', fontSize:'13px', lineHeight:1.6, margin:'0 0 20px'}}>{s.desc}</p>
              <div style={{display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'24px'}}>
                {s.pills.map((pill: any)=>(
                  <span key={pill} style={{fontSize:'10px', fontWeight:600, color:'#444', background:'rgba(255,255,255,.03)', border:'1px solid #1e1e1e', borderRadius:'4px', padding:'2px 8px'}}>{pill}</span>
                ))}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'8px', color: s.locked ? '#555' : '#00F0FF', fontSize:'12px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase'}}>
                {s.locked ? <><Icon name="lock" size={13}/> {s.lockLabel}</> : <>Open Section <Icon name="arrow" size={13}/></>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="home-footer" style={{borderTop:'1px solid #0f0f0f', padding:'14px 32px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <p style={{margin:0, fontSize:'10px', color:'#2a2a2a', letterSpacing:'.15em', textTransform:'uppercase'}}>Premmisus · Internal Use Only · Confidential</p>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <div className="pulse" style={{width:'5px',height:'5px'}}/>
          <p style={{margin:0, fontSize:'10px', color:'#2a2a2a', letterSpacing:'.1em'}}>Sales Command Rev 2.2</p>
        </div>
      </div>
    </div>
  );
}
