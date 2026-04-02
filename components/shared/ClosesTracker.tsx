'use client';

import { useState, useEffect, useRef } from 'react';
import { getTierInfo, CLOSE_PRODUCTS } from '@/lib/constants';

interface ClosesTrackerProps {
  totalCloses: number;
  totalPoints: number;
  addClose: (pts: number) => void;
  undoClose: () => void;
}

const ClosesTracker = ({ totalCloses, totalPoints, addClose, undoClose }: ClosesTrackerProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const tier = getTierInfo(totalPoints);
  const progress = tier.at ? Math.min((totalPoints / tier.at) * 100, 100) : 100;
  const ptsToPromo = tier.at ? tier.at - totalPoints : 0;
  useEffect(() => {
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
      {/* Tier progress */}
      <div style={{display:'flex', flexDirection:'column', gap:'5px', minWidth:'170px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px'}}>
          <span style={{fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', whiteSpace:'nowrap', background:tier.badge.bg, border:`1px solid ${tier.badge.border}`, color:tier.badge.color, fontFamily:'JetBrains Mono,monospace', letterSpacing:'.03em'}}>{tier.name}</span>
          {tier.next && <span style={{fontSize:'9px', color:'#333', whiteSpace:'nowrap'}}>{ptsToPromo} pts → {tier.next}</span>}
        </div>
        <div style={{height:'3px', background:'#1a1a1a', borderRadius:'2px', overflow:'hidden'}}>
          <div style={{height:'100%', borderRadius:'2px', background:tier.barColor, width:`${progress}%`, transition:'width .7s ease'}}/>
        </div>
      </div>
      {/* Counts display */}
      <div style={{display:'flex', alignItems:'center', gap:'5px', flexShrink:0}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', background:'#0d0d0d', border:'1px solid #1e1e1e', borderRadius:'7px', padding:'3px 9px', minWidth:'46px'}}>
          <span style={{fontSize:'13px', fontWeight:800, color:'#fff', fontFamily:'monospace', lineHeight:1.2}}>{totalCloses}</span>
          <span style={{fontSize:'7px', color:'#333', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase'}}>closes</span>
        </div>
        <span style={{fontSize:'10px', color:'#222', fontWeight:700}}>·</span>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', background:'#0d0d0d', border:`1px solid ${tier.badge.border}`, borderRadius:'7px', padding:'3px 9px', minWidth:'46px'}}>
          <span style={{fontSize:'13px', fontWeight:800, color:tier.badge.color, fontFamily:'monospace', lineHeight:1.2}}>{totalPoints}</span>
          <span style={{fontSize:'7px', color:'#333', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase'}}>pts</span>
        </div>
      </div>
      {/* Log close picker */}
      <div style={{position:'relative', flexShrink:0}} ref={pickerRef}>
        <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
          <button onClick={undoClose} title="Undo last close" aria-label="Undo last close" style={{width:'26px', height:'26px', borderRadius:'6px', background:'#0d0d0d', border:'1px solid #252525', color:'#555', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, lineHeight:1, transition:'color .15s, border-color .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#444';}}
            onMouseLeave={e=>{e.currentTarget.style.color='#555'; e.currentTarget.style.borderColor='#252525';}}>−</button>
          <button onClick={()=>setPickerOpen(p=>!p)} style={{padding:'5px 11px', borderRadius:'6px', background:pickerOpen?'rgba(0,240,255,.18)':'rgba(0,240,255,.1)', border:'1px solid rgba(0,240,255,.35)', color:'#00F0FF', cursor:'pointer', fontSize:'11px', fontWeight:800, letterSpacing:'.07em', textTransform:'uppercase', fontFamily:'Inter,sans-serif', transition:'background .15s', whiteSpace:'nowrap'}}>+ Log Close</button>
        </div>
        {pickerOpen && (
          <div style={{position:'absolute', top:'calc(100% + 8px)', right:0, width:'268px', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:'10px', boxShadow:'0 16px 48px rgba(0,0,0,.9)', zIndex:600, padding:'6px'}} className="fadein">
            <p style={{margin:'4px 8px 6px', fontSize:'9px', fontWeight:700, color:'#444', letterSpacing:'.15em', textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace'}}>What did you close?</p>
            {CLOSE_PRODUCTS.map(prod => (
              <button key={prod.id} onClick={()=>{ addClose(prod.pts); setPickerOpen(false); }}
                style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 10px', borderRadius:'7px', background:'none', border:'none', cursor:'pointer', transition:'background .15s', textAlign:'left'}}
                onMouseEnter={e=>e.currentTarget.style.background='#111'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <div>
                  <p style={{margin:0, fontSize:'12px', fontWeight:700, color:'#fff', fontFamily:'Inter,sans-serif'}}>{prod.label}</p>
                  <p style={{margin:'1px 0 0', fontSize:'10px', color:'#444', fontFamily:'Roboto,sans-serif'}}>{prod.price} · {prod.commission}</p>
                </div>
                <span style={{fontSize:'10px', fontWeight:800, padding:'3px 8px', borderRadius:'20px', background:'rgba(0,240,255,.08)', border:'1px solid rgba(0,240,255,.2)', color:'#00F0FF', fontFamily:'JetBrains Mono,monospace', flexShrink:0, marginLeft:'10px', whiteSpace:'nowrap'}}>+{prod.pts}pt{prod.pts>1?'s':''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClosesTracker;
