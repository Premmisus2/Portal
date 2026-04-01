'use client';

import { fmtCAD } from '@/lib/constants';

const IncomeBar = ({ label, amount, total, color }: any) => {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div style={{marginBottom:'12px'}}>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'5px', gap:'8px', flexWrap:'wrap'}}>
        <span style={{color:'#888', minWidth:0}}>{label}</span>
        <span style={{fontFamily:'monospace', fontWeight:700, color:'#fff', flexShrink:0}}>{fmtCAD(amount)}</span>
      </div>
      <div style={{height:'5px', background:'#1a1a1a', borderRadius:'3px', overflow:'hidden'}}>
        <div style={{height:'100%', borderRadius:'3px', background:color, width:`${pct}%`, transition:'width .5s ease'}}/>
      </div>
    </div>
  );
};

export default IncomeBar;
