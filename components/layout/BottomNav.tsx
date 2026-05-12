'use client';

import { useState } from 'react';
import { CLOSE_PRODUCTS } from '@/lib/constants';

export default function BottomNav({ currentView, onNav, addClose, shadowMode }: { currentView: any; onNav: any; addClose: any; shadowMode: any }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const items = [
    {
      key: 'home',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
      ),
    },
    {
      key: 'scripts',
      label: 'Scripts',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      ),
    },
    {
      key: 'close',
      label: '+ Close',
      isCenter: true,
      icon: (
        <svg viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    },
    {
      key: 'handoff',
      label: 'Handoff',
      icon: (
        <svg viewBox="0 0 24 24">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
    },
    {
      key: 'coach',
      label: 'Coach',
      icon: (
        <svg viewBox="0 0 24 24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Mobile navigation">
      {items.map((item) => {
        if (item.isCenter) {
          return (
            <div key={item.key} className="bottom-nav-item bottom-nav-center" style={{position:'relative'}}>
              {pickerOpen && (
                <div className="fadein" style={{position:'fixed', bottom:'80px', left:'14px', right:'14px', background:'var(--bg-elev-pill)', border:'2px solid var(--accent-glow-30)', borderRadius:'12px', boxShadow:'0 16px 48px rgba(0,0,0,.9), 0 0 30px var(--accent-glow-10)', zIndex:500, padding:'6px'}}>
                  <p style={{margin:'6px 8px 4px', fontSize:'9px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.15em', textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace'}}>What did you close?</p>
                  <p style={{margin:'0 8px 4px', fontSize:'8px', fontWeight:700, color:'var(--text-faint)', letterSpacing:'.12em', textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace'}}>— Marketing</p>
                  {CLOSE_PRODUCTS.filter(p => !p.id.startsWith('ai')).map(prod => (
                    <button key={prod.id} onClick={()=>{ addClose(prod.pts); setPickerOpen(false); }}
                      style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 10px', borderRadius:'7px', background:'none', border:'none', cursor:'pointer', textAlign:'left'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-sidebar-line)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <div>
                        <p style={{margin:0, fontSize:'12px', fontWeight:700, color:'var(--text-primary)', fontFamily:'Inter,sans-serif'}}>{prod.label}</p>
                        <p style={{margin:'1px 0 0', fontSize:'10px', color:'var(--text-faint)', fontFamily:'Roboto,sans-serif'}}>{prod.price}</p>
                      </div>
                      <span style={{fontSize:'10px', fontWeight:800, padding:'3px 8px', borderRadius:'20px', background:'var(--accent-glow-08)', border:'1px solid var(--accent-glow-22)', color:'var(--accent-ink)', fontFamily:'JetBrains Mono,monospace', flexShrink:0}}>+{prod.pts}pt{prod.pts>1?'s':''}</span>
                    </button>
                  ))}
                  <p style={{margin:'6px 8px 4px', fontSize:'8px', fontWeight:700, color:'var(--accent-ink)', letterSpacing:'.12em', textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace'}}>— AI Services</p>
                  {CLOSE_PRODUCTS.filter(p => p.id.startsWith('ai')).map(prod => (
                    <button key={prod.id} onClick={()=>{ addClose(prod.pts); setPickerOpen(false); }}
                      style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 10px', borderRadius:'7px', background:'none', border:'none', cursor:'pointer', textAlign:'left'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-sidebar-line)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <div>
                        <p style={{margin:0, fontSize:'12px', fontWeight:700, color:'var(--text-primary)', fontFamily:'Inter,sans-serif'}}>{prod.label}</p>
                        <p style={{margin:'1px 0 0', fontSize:'10px', color:'var(--text-muted)', fontFamily:'Roboto,sans-serif'}}>{prod.price}</p>
                      </div>
                      <span style={{fontSize:'10px', fontWeight:800, padding:'3px 8px', borderRadius:'20px', background:'var(--accent-glow-08)', border:'1px solid var(--accent-glow-22)', color:'var(--accent-ink)', fontFamily:'JetBrains Mono,monospace', flexShrink:0}}>+{prod.pts}pt{prod.pts>1?'s':''}</span>
                    </button>
                  ))}
                </div>
              )}
              {pickerOpen && <div onClick={()=>setPickerOpen(false)} style={{position:'fixed', inset:0, zIndex:499}}/>}
              <button
                className="bottom-nav-center-btn"
                onClick={() => { if (!shadowMode) setPickerOpen(p=>!p); }}
                aria-label="Log a close"
                style={shadowMode ? {opacity:.4, cursor:'not-allowed', background:'var(--text-muted)', boxShadow:'none'} : {}}
              >
                {item.icon}
              </button>
              <span className="bottom-nav-label" style={{ color: 'var(--accent-ink)', marginTop: 4 }}>
                {item.label}
              </span>
            </div>
          );
        }
        const isActive = currentView === item.key;
        return (
          <button
            key={item.key}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={() => item.key === 'coach' ? onNav('home') : onNav(item.key)}
            aria-label={`Go to ${item.label}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon}
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
