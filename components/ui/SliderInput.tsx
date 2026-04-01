'use client';

import Icon from '@/components/ui/Icon';

const SliderInput = ({ label, sublabel, value, min, max, onChange, locked, lockLabel }: any) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{opacity: locked ? .35 : 1, pointerEvents: locked ? 'none' : 'auto', transition:'opacity .2s'}}>
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'6px', gap:'8px'}}>
        <div style={{minWidth:0, flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
            <span style={{fontSize:'13px', color:'#c8cfe0'}}>{label}</span>
            {locked && (
              <span style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'9px', fontWeight:700, color:'#555', background:'#0d0d0d', border:'1px solid #252525', padding:'2px 7px', borderRadius:'5px', whiteSpace:'nowrap'}}>
                <Icon name="lock" size={9}/> {lockLabel}
              </span>
            )}
          </div>
          {sublabel && <div style={{fontSize:'10px', color:'#555', marginTop:'2px'}}>{sublabel}</div>}
        </div>
        <span style={{fontSize:'13px', fontWeight:800, color:'#fff', fontFamily:'monospace', flexShrink:0}}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e: any) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to right, #00F0FF ${pct}%, #1a1a1a ${pct}%)` }}
      />
      <div style={{display:'flex', justifyContent:'space-between', fontSize:'9px', color:'#2a2a2a', fontFamily:'monospace', marginTop:'2px'}}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
};

export default SliderInput;
