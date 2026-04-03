'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Body } from '@/components/ui/Typography';
import SliderInput from '@/components/ui/SliderInput';
import IncomeBar from '@/components/ui/IncomeBar';
import { getTierInfo, fmtCAD } from '@/lib/constants';

const EARN_BY_PTS: Record<number, {label:string;flat:boolean;cad:number}> = { 1:{label:'Website Package',flat:true,cad:500}, 2:{label:'Foundation 1.0',flat:false,cad:112}, 3:{label:'Authority System 2.0',flat:false,cad:210}, 4:{label:'Market Domination 3.0',flat:false,cad:420} };

const AI_COMMISSION_TABLE = [
  { service: 'AI Receptionist',  setup: '$1,000', repSetup: '$500',  mrr: '$1,200-1,500/mo', repMrr: '~$84-105/mo' },
  { service: 'SMS Sequences',    setup: '$750',   repSetup: '$375',  mrr: '$500-750/mo',     repMrr: '~$35-52/mo'  },
  { service: 'Email Sequences',  setup: '$500',   repSetup: '$250',  mrr: '$400-500/mo',     repMrr: '~$28-35/mo'  },
  { service: 'Website Chatbot',  setup: '$750',   repSetup: '$375',  mrr: '$500-750/mo',     repMrr: '~$35-52/mo'  },
  { service: 'CRM Automation',   setup: '$750',   repSetup: '$375',  mrr: '$500-750/mo',     repMrr: '~$35-52/mo'  },
];

const LadderPanel = ({ totalCloses, totalPoints, addClose, undoClose, closeHistory }: any) => {
  const [closesPerWeek, setClosesPerWeek] = useState(5);
  const [recurringClients, setRecurringClients] = useState(5);
  const [managedReps, setManagedReps] = useState(2);
  const [repsClosesPerWeek, setRepsClosesPerWeek] = useState(4);

  const history = closeHistory || [];
  const pendingCloses = history.filter((c: any) => c.status === 'pending');
  const approvedCloses = history.filter((c: any) => (c.status || 'approved') === 'approved');
  // Tally earned by product (approved only)
  const earned: Record<number, number> = {};
  approvedCloses.forEach(({pts}: any) => { earned[pts] = (earned[pts]||0) + 1; });
  const flatTotal  = (earned[1]||0) * 500;
  const recurringTotal = ((earned[2]||0)*145) + ((earned[3]||0)*290) + ((earned[4]||0)*580);

  const tier = getTierInfo(totalPoints);
  const monthlyCloseIncome = closesPerWeek * 500 * 4;
  const recurringPerClientCAD = Math.round(1599 * 0.07);
  const monthlyRecurring = tier.hasRecurring ? recurringClients * recurringPerClientCAD : 0;
  const monthlyOverride = tier.hasOverride ? managedReps * repsClosesPerWeek * 15 * 4 : 0;
  const totalMonthly = monthlyCloseIncome + monthlyRecurring + monthlyOverride;
  const annualRunRate = totalMonthly * 12;
  const closesVolume = closesPerWeek * 4 * 1500;
  const recurringVolume = tier.hasRecurring ? recurringClients * 1599 : 0;
  const totalVolume = closesVolume + recurringVolume;

  const tableRows = [
    { goal: '$5K / mo',  closes: 2.5, calls: 35,  monthly: 5000  },
    { goal: '$10K / mo', closes: 5,   calls: 50,  monthly: 10000 },
    { goal: '$15K / mo', closes: 7.5, calls: 75,  monthly: 15000 },
    { goal: '$20K / mo', closes: 10,  calls: 100, monthly: 20000 },
  ];

  return (
    <div>
      <div style={{marginBottom:'6px'}}><span className="tag">08</span></div>
      <h2 style={{fontSize:'26px', fontWeight:900, color:'#fff', margin:'8px 0 4px'}}>The Ladder — Commission Calculator</h2>
      <Body>Drag the sliders. Watch your CAD income update in real time.</Body>
      <div className="divider" style={{margin:'16px 0'}}/>

      {/* Tier progress card */}
      <div style={{padding:'16px 20px', borderRadius:'12px', border:`1px solid ${tier.badge.border}`, background: tier.badge.bg, marginBottom:'20px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <Icon name="star" size={14} style={{color: tier.color}}/>
            <span style={{fontSize:'13px', fontWeight:700, color:'#fff'}}>Active Tier</span>
          </div>
          <span style={{fontSize:'13px', fontWeight:800, color: tier.color}}>{tier.name}</span>
        </div>
        {/* Progress bar */}
        <div style={{height:'4px', background:'rgba(0,0,0,.3)', borderRadius:'2px', overflow:'hidden', marginBottom:'12px'}}>
          <div style={{height:'100%', borderRadius:'2px', background:tier.barColor, width:`${tier.at ? Math.min((totalPoints / tier.at) * 100, 100) : 100}%`, transition:'width .7s ease'}}/>
        </div>
        {/* Stats row */}
        <div className="ladder-tier-stats" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', flexWrap:'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'20px', fontWeight:800, color:'#fff', fontFamily:'monospace', lineHeight:1}}>{totalCloses}</div>
              <div style={{fontSize:'8px', color:'#555', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginTop:'2px'}}>Closes</div>
            </div>
            <div style={{width:'1px', height:'24px', background:'rgba(255,255,255,.1)'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'20px', fontWeight:800, color:tier.badge.color, fontFamily:'monospace', lineHeight:1}}>{totalPoints}</div>
              <div style={{fontSize:'8px', color:'#555', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginTop:'2px'}}>Points</div>
            </div>
            {tier.next && (
              <>
                <div style={{width:'1px', height:'24px', background:'rgba(255,255,255,.1)'}}/>
                <div style={{fontSize:'10px', color:'#555'}}><span style={{color:'#fff', fontWeight:700}}>{tier.at! - totalPoints}</span> pts to {tier.next}</div>
              </>
            )}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
            <button onClick={undoClose} style={{width:'30px', height:'30px', borderRadius:'7px', background:'#0d0d0d', border:'1px solid #252525', color:'#555', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, lineHeight:1}}>−</button>
            <button onClick={()=>addClose(1)} style={{padding:'6px 14px', borderRadius:'7px', background:'rgba(0,240,255,.1)', border:'1px solid rgba(0,240,255,.35)', color:'#00F0FF', cursor:'pointer', fontSize:'11px', fontWeight:800, letterSpacing:'.05em', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap'}}>+ Close</button>
          </div>
        </div>
      </div>

      {/* Pending closes alert */}
      {pendingCloses.length > 0 && (
        <div style={{padding:'12px 18px', borderRadius:'10px', border:'1px solid rgba(245,158,11,.3)', background:'rgba(245,158,11,.05)', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px'}}>
          <div>
            <p style={{margin:'0 0 3px', fontSize:'13px', fontWeight:700, color:'#F59E0B'}}>⏳ {pendingCloses.length} close{pendingCloses.length > 1 ? 's' : ''} pending director approval</p>
            <p style={{margin:0, fontSize:'11px', color:'#666'}}>Points will be added once approved. {pendingCloses.map((c: any) => c.product_label || `${c.pts}pt`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="ladder-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'16px'}}>
        {/* Left: Controls */}
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          <div className="card" style={{padding:'20px', display:'flex', flexDirection:'column', gap:'24px'}}>
            <SliderInput label="Website Closes / Week" sublabel="$500 CAD commission each"
              value={closesPerWeek} min={1} max={20} onChange={setClosesPerWeek}/>
            <SliderInput label="1.0 Lead Gen Clients (Active)" sublabel="$1,599 CAD/mo — your 7% = ~$112 CAD/mo each"
              value={recurringClients} min={0} max={30} onChange={setRecurringClients}
              locked={!tier.hasRecurring} lockLabel="Unlocks at Field Commander"/>
            <SliderInput label="Managed Junior Reps" sublabel="3% override per their close ($15/close)"
              value={managedReps} min={1} max={10} onChange={setManagedReps}
              locked={!tier.hasOverride} lockLabel="Unlocks at Manager Growth Lead"/>
            {tier.hasOverride && (
              <SliderInput label="Rep Closes / Week (avg)"
                value={repsClosesPerWeek} min={1} max={10} onChange={setRepsClosesPerWeek}/>
            )}
          </div>
        </div>

        {/* Right: Output */}
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          {/* Income Breakdown */}
          <div className="card" style={{padding:'20px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px'}}>
              <Icon name="dollar" size={14}/>
              <span style={{fontSize:'13px', fontWeight:700, color:'#fff'}}>Income Breakdown (CAD / month)</span>
            </div>
            <IncomeBar label={`Close — ${closesPerWeek}/wk × $500 × 4`} amount={monthlyCloseIncome} total={totalMonthly} color="#00F0FF"/>
            <IncomeBar label={`Recurring 7% — ${recurringClients} × ~$${recurringPerClientCAD}`} amount={monthlyRecurring} total={totalMonthly} color={tier.hasRecurring ? '#22c55e' : '#1a1a1a'}/>
            <IncomeBar label={`Override 3% — ${managedReps} × ${repsClosesPerWeek} × $15`} amount={monthlyOverride} total={totalMonthly} color={tier.hasOverride ? '#0072FF' : '#1a1a1a'}/>
            <div style={{marginTop:'16px', paddingTop:'14px', borderTop:'1px solid #1e1e1e', display:'flex', alignItems:'flex-end', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'11px', color:'#555', marginBottom:'4px'}}>Monthly Total</div>
                <div style={{fontSize:'26px', fontWeight:900, color:'#fff', fontFamily:'monospace'}}>{fmtCAD(totalMonthly)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'11px', color:'#555', marginBottom:'4px'}}>Annual Run Rate</div>
                <div style={{fontSize:'16px', fontWeight:800, fontFamily:'monospace', color: tier.color}}>{fmtCAD(annualRunRate)}</div>
              </div>
            </div>
          </div>

          {/* CAD Sales Volume */}
          <div className="card" style={{padding:'20px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
              <Icon name="trending" size={14}/>
              <span style={{fontSize:'13px', fontWeight:700, color:'#fff'}}>CAD Sales Volume</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'6px 0'}}>
              <span style={{color:'#888'}}>New Sites ({closesPerWeek * 4}/mo × $1,500 CAD)</span>
              <span style={{fontFamily:'monospace', fontWeight:700, color:'#fff'}}>{fmtCAD(closesVolume)}</span>
            </div>
            {tier.hasRecurring && (
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', padding:'6px 0'}}>
                <span style={{color:'#888'}}>1.0 MRR ({recurringClients} × $1,599)</span>
                <span style={{fontFamily:'monospace', fontWeight:700, color:'#fff'}}>{fmtCAD(recurringVolume)}</span>
              </div>
            )}
            <div style={{paddingTop:'10px', borderTop:'1px solid #1e1e1e', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'4px'}}>
              <span style={{fontSize:'12px', fontWeight:700, color:'#888'}}>Total CAD Volume / Month</span>
              <span style={{fontSize:'16px', fontWeight:800, fontFamily:'monospace', color:'#22c55e'}}>{fmtCAD(totalVolume)}</span>
            </div>
          </div>

          {/* 10K Blueprint */}
          <div style={{padding:'16px 20px', borderRadius:'12px', background:'rgba(0,240,255,.04)', border:'1px solid rgba(0,240,255,.15)'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
              <Icon name="zap" size={13}/>
              <span style={{fontSize:'10px', fontWeight:800, color:'#00F0FF', letterSpacing:'.12em', textTransform:'uppercase'}}>The 10K Blueprint</span>
            </div>
            <p style={{fontSize:'12px', color:'#888', lineHeight:1.7, margin:0}}>
              <span style={{color:'#fff', fontWeight:700}}>$10,000 CAD/mo</span> = 5 closes/week × $500 × 4 weeks.{' '}
              <span style={{color:'#fff', fontWeight:700}}>5 closes/week</span> = ~1 close/day at quota.{' '}
              <span style={{color:'#fff', fontWeight:700}}>1 close/day</span> at 50 answered calls = achievable at standard dial volume.
            </p>
          </div>
        </div>
      </div>

      {/* Goal Reference Table */}
      <div className="card" style={{padding:'20px', marginTop:'16px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
          <Icon name="zap" size={14}/>
          <span style={{fontSize:'13px', fontWeight:700, color:'#fff'}}>Goal Targets — Quick Reference</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', fontSize:'12px', minWidth:'380px', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #1e1e1e'}}>
                {['Income Goal','Closes / Wk','Answered / Day','Monthly CAD'].map((h,i)=>(
                  <th key={i} style={{padding:'0 0 10px', textAlign: i===0?'left':'right', fontWeight:700, color:'#555'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #111'}}>
                  <td style={{padding:'10px 0', fontWeight:700, color:'#fff'}}>{row.goal}</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', color:'#888'}}>{row.closes}</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', color:'#888'}}>{row.calls}+</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'#22c55e'}}>{fmtCAD(row.monthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:'10px', color:'#333', marginTop:'10px'}}>Recurring and override income not included above. Field Commander+ stacks significantly exceed these figures.</p>
      </div>

      {/* AI Commission Reference */}
      <div className="card" style={{padding:'20px', marginTop:'16px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
          <Icon name="zap" size={14} style={{color:'#00F0FF'}}/>
          <span style={{fontSize:'13px', fontWeight:700, color:'#fff'}}>AI Services — Commission Reference</span>
        </div>
        <p style={{fontSize:'11px', color:'#444', margin:'0 0 14px'}}>Setup commission (50%) paid upfront on close. Recurring 7% paid monthly while client stays. Both require director approval.</p>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', fontSize:'12px', minWidth:'480px', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid #1e1e1e'}}>
                {['Service','Client Setup','You Earn','Client MRR','You Earn/mo'].map((h,i)=>(
                  <th key={i} style={{padding:'0 0 10px', textAlign:i===0?'left':'right', fontWeight:700, color:'#555'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AI_COMMISSION_TABLE.map((row, i) => (
                <tr key={i} style={{borderBottom:'1px solid #111'}}>
                  <td style={{padding:'10px 0', fontWeight:700, color:'#fff'}}>{row.service}</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', color:'#888'}}>{row.setup}</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'#22c55e'}}>{row.repSetup}</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', color:'#888'}}>{row.mrr}</td>
                  <td style={{padding:'10px 0', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'#00F0FF'}}>{row.repMrr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:'10px', color:'#333', marginTop:'10px'}}>Bundle discount ($250 off MRR) applies when client buys 3+ AI services. Your 7% is calculated on the discounted total.</p>
      </div>
    </div>
  );
};

export default LadderPanel;
