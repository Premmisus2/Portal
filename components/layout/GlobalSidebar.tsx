'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const Logo = ({ height = 32 }: { height?: number }) => (
  <div style={{height, display:'flex', alignItems:'center'}}>
    <img src="/logo.png" alt="Premmisus" style={{height:'100%', objectFit:'contain'}} />
  </div>
);

export default function GlobalSidebar({ open, onClose, onNav, currentView, isDirector }: { open: any; onClose: any; onNav: any; currentView: any; isDirector: any }) {
  const [expanded, setExpanded] = useState({ outreach: false, scripts: false });
  const [unreadSms, setUnreadSms] = useState<number>(0);
  const toggle = (cat: string) => setExpanded(e => ({ ...e, [cat]: !e[cat] }));
  const go = (key: string) => { onNav(key); onClose(); };

  // Poll unread inbound SMS count every 30s for the Inbox badge.
  // Keep last known count on network failure rather than zeroing it.
  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const { count, error } = await supabase
          .from('sms_messages')
          .select('id', { count: 'exact', head: true })
          .eq('direction', 'inbound')
          .eq('is_read', false);
        if (!cancelled && !error && typeof count === 'number') setUnreadSms(count);
      } catch {
        // Keep last known count on failure.
      }
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const unreadDisplay = unreadSms > 99 ? '99+' : String(unreadSms);
  return (
    <>
      <div className={`global-sidebar-overlay${open ? ' open' : ''}`} onClick={onClose}/>
      <nav className={`global-sidebar${open ? ' open' : ''}`}>
        <div style={{padding:'16px 20px', borderBottom:'1px solid var(--bg-sidebar-line)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <Logo height={22}/>
          <button aria-label="Close navigation" onClick={onClose} style={{background:'none', border:'1px solid var(--border)', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'var(--text-faint)', fontSize:'11px', fontFamily:'Inter'}}>&#10005;</button>
        </div>

        <div style={{padding:'12px 0'}}>
          {/* Sales Floor — new rep cockpit at its own /floor route (not part of
              the SPA's internal currentView system). Sits at the top to surface
              the new surface while ColdCallView stays available below during
              the dual-track window. */}
          <div className="gs-category">
            <a
              href="/floor"
              className="gs-item"
              style={{
                paddingLeft:'20px', display:'flex', alignItems:'center', gap:'8px',
                textDecoration:'none', color:'var(--accent-ink)', fontWeight:700,
                borderLeft:'2px solid var(--accent)',
              }}
              onClick={onClose}
            >
              <span style={{fontSize:'14px'}}>&#9889;</span>
              <span>Sales Floor</span>
              <span style={{
                marginLeft:'auto', fontSize:'8px', fontWeight:800,
                padding:'2px 6px', borderRadius:'4px',
                background:'var(--accent-glow-15)', border:'1px solid var(--accent-glow-50)',
                color:'var(--accent-ink)', letterSpacing:'.1em',
                fontFamily:'JetBrains Mono, monospace',
              }}>NEW</span>
            </a>
          </div>

          {/* Cold Calling (legacy — kept during dual-track per audit decision Option C) */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='coldcall'?' active':''}`} onClick={()=>go('coldcall')} style={{paddingLeft:'20px'}}>
              <span style={{fontSize:'14px'}}>&#9742;</span> Call Center
            </button>
          </div>

          {/* Inbox (SMS conversations) */}
          <div className="gs-category">
            <button className={`gs-item${currentView==='inbox'?' active':''}`} onClick={()=>go('inbox')} style={{paddingLeft:'20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span><span style={{fontSize:'14px'}}>&#128172;</span> Inbox</span>
              {unreadSms > 0 && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'var(--accent-glow-15)',
                  border: '1px solid var(--accent-glow-50)',
                  color: 'var(--accent-ink)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '.02em',
                  minWidth: '22px',
                  textAlign: 'center',
                }}>{unreadDisplay}</span>
              )}
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
            <div className="gs-category" style={{borderTop:'1px solid var(--bg-sidebar-line)', marginTop:'8px', paddingTop:'8px'}}>
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
