'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Rep, Body, SecH, Li } from '@/components/ui/Typography';

const FOUNDATION_TABS = [
  {id:'mission',  label:'Mission'},
  {id:'revenue',  label:'Revenue Blueprint'},
  {id:'career',   label:'Career Ladder'},
  {id:'anti',     label:'Anti-Agency Rules'},
  {id:'icp',      label:'ICP'},
  {id:'daily',    label:'Daily Routine'},
  {id:'precall',  label:'Pre-Call Checklist'},
  {id:'deliver',  label:'How We Deliver'},
  {id:'compete',  label:'Competitive Advantages'},
];

const FoundationPanel = () => {
  const [activeTab, setActiveTab] = useState('mission');
  return (
    <div>
      <div style={{marginBottom:'6px'}}><span className="tag">01</span></div>
      <h2 style={{fontSize:'26px',fontWeight:900,color:'var(--text-primary)',margin:'8px 0 4px'}}>Foundation & Blueprint</h2>
      <Body>The immovable core — who we are, who we serve, and how we win.</Body>

      {/* ── Tab Bar ── */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'6px',margin:'16px 0',padding:'4px 0',borderBottom:'1px solid var(--border-soft)'}}>
        {FOUNDATION_TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:'7px 14px',borderRadius:'6px 6px 0 0',cursor:'pointer',
            background:activeTab===t.id?'var(--accent-glow-08)':'transparent',
            border:activeTab===t.id?'1px solid var(--accent-glow-30)':'1px solid transparent',
            borderBottom:activeTab===t.id?'2px solid var(--accent-ink)':'2px solid transparent',
            color:activeTab===t.id?'var(--accent-ink)':'var(--text-muted)',
            fontSize:'11px',fontWeight:700,letterSpacing:'.06em',fontFamily:"'JetBrains Mono',monospace",
            transition:'all .15s',outline:'none'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════ TAB: MISSION ════════ */}
      {activeTab==='mission' && (
        <div>
          <SecH>1. The Mission: We Engineer Predictable Pipelines</SecH>
          <div className="card" style={{padding:'18px 20px',marginBottom:'12px'}}>
            <ul style={{padding:0,margin:0}}>
              <Li><strong style={{color:'var(--text-primary)'}}>Targeting:</strong> Canadian trades businesses — cleaning, landscaping, plumbing, construction, pressure washing, window washing, and more.</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>The Hook (The 0.5 Offer):</strong> A $1,500 CAD Custom Website — $500 deposit, $1,000 on delivery. Engineered to convert immediately.</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>The Edge:</strong> We don't just "get leads." We solve <strong style={{color:'var(--accent-ink)'}}>Lead Decay</strong>. We provide the AI Nurture Loop that responds to customers in <strong style={{color:'var(--accent-ink)'}}>under 30 seconds</strong>.</Li>
            </ul>
          </div>
        </div>
      )}

      {/* ════════ TAB: REVENUE BLUEPRINT ════════ */}
      {activeTab==='revenue' && (
        <div>
          <SecH>2. The Revenue Blueprint (CAD)</SecH>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'12px',marginBottom:'12px'}}>
            <div className="card-glow" style={{padding:'18px 20px'}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--accent-ink)',margin:'0 0 8px'}}>Commission</p>
              <p style={{fontSize:'22px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>$500 CAD</p>
              <p style={{color:'var(--text-muted)',fontSize:'13px',margin:0}}>Flat per 0.5 Close — Paid 100% upfront</p>
            </div>
            <div className="card-glow" style={{padding:'18px 20px'}}>
              <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--accent-ink)',margin:'0 0 8px'}}>The Math</p>
              <p style={{fontSize:'22px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>$10,000/mo</p>
              <p style={{color:'var(--text-muted)',fontSize:'13px',margin:0}}>5 Closes per week</p>
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB: CAREER LADDER ════════ */}
      {activeTab==='career' && (
        <div>
          <SecH>Career Ladder</SecH>
          <div className="card" style={{padding:'18px 20px',marginBottom:'12px'}}>
            <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--accent-ink)',margin:'0 0 12px'}}>Career Ladder</p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[
                {role:'Junior Growth Associate', desc:'Initial outreach & qualifying.'},
                {role:'Field Commander', desc:'Authorized for 1.0 Upsells + 7% Recurring Commission.'},
                {role:'Manager Growth Lead', desc:'Override commission on managed reps. Full stack access.'},
                {role:'Executive', desc:'50+ closes. Elite tier. Full system authority.'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'12px',padding:'10px 12px',background:'rgba(255,255,255,.02)',border:'1px solid var(--border-soft)',borderRadius:'8px'}}>
                  <span className="dot">{i+1}</span>
                  <div>
                    <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'14px'}}>{r.role}</p>
                    <p style={{margin:0,color:'var(--text-tertiary)',fontSize:'13px'}}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB: ANTI-AGENCY RULES ════════ */}
      {activeTab==='anti' && (
        <div>
          <SecH>3. The "Anti-Agency" Protocol</SecH>
          <div className="card" style={{padding:'18px 20px'}}>
            <ul style={{padding:0,margin:0}}>
              <Li><strong style={{color:'var(--red)'}}>Rule #1:</strong> Never lead with "I want to sell you marketing." Lead with the Asset.</Li>
              <Li><strong style={{color:'var(--red)'}}>Rule #2:</strong> Lead with text/DM and a 30-second screen record of the preview. Cold email is secondary — use the outreach sequences in Sections 10-12.</Li>
              <Li><strong style={{color:'var(--red)'}}>Rule #3:</strong> The System Expert Handoff. Your job is to lock the $500 split and book the Google Meet with our System Managers for the backend reveal.</Li>
            </ul>
          </div>
        </div>
      )}

      {/* ════════ TAB: ICP FRAMEWORK ════════ */}
      {activeTab==='icp' && (
        <div>
          <SecH>Ideal Customer Profile</SecH>
          <Body>Exactly who to target, how to prioritize, and what disqualifies a lead.</Body>

          <div className="card-glow" style={{padding:'20px 22px',marginBottom:'16px'}}>
            <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--accent-ink)',margin:'0 0 10px'}}>Who We Target</p>
            <p style={{color:'var(--text-secondary)',fontSize:'14px',lineHeight:1.6,margin:0}}>Canadian service-based businesses (public). <strong style={{color:'var(--text-primary)'}}>All businesses</strong> (behind closed doors).</p>
          </div>

          <SecH>Priority Tiers (by Google Reviews)</SecH>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'10px',marginBottom:'16px'}}>
            <div className="card" style={{padding:'16px 18px',borderLeft:'3px solid var(--red-strong)'}}>
              <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--red-strong)',margin:'0 0 6px',fontFamily:"'JetBrains Mono',monospace"}}>HOT (0-19)</p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',lineHeight:1.5,margin:0}}>Minimal online presence. NEED us most. <strong style={{color:'var(--text-primary)'}}>Call first.</strong></p>
            </div>
            <div className="card" style={{padding:'16px 18px',borderLeft:'3px solid #ff9933'}}>
              <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#ff9933',margin:'0 0 6px',fontFamily:"'JetBrains Mono',monospace"}}>HIGH (20-59)</p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',lineHeight:1.5,margin:0}}>Established but not dominant. Strong pitch opportunity.</p>
            </div>
            <div className="card" style={{padding:'16px 18px',borderLeft:'3px solid #ffcc00'}}>
              <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#ffcc00',margin:'0 0 6px',fontFamily:"'JetBrains Mono',monospace"}}>MEDIUM (60-100)</p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',lineHeight:1.5,margin:0}}>More established, harder sell, bigger deals.</p>
            </div>
            <div className="card" style={{padding:'16px 18px',borderLeft:'3px solid var(--text-muted)',opacity:0.6}}>
              <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--text-muted)',margin:'0 0 6px',fontFamily:"'JetBrains Mono',monospace"}}>DISQUALIFIED (100+)</p>
              <p style={{color:'var(--text-tertiary)',fontSize:'13px',lineHeight:1.5,margin:0}}>Skip. Too big, already have systems.</p>
            </div>
          </div>

          <SecH>Qualifying Checklist</SecH>
          <div className="card" style={{padding:'18px 20px',marginBottom:'16px'}}>
            <ul style={{padding:0,margin:0}}>
              <Li><strong style={{color:'var(--green)'}}>&#10003;</strong> Under 100 Google reviews</Li>
              <Li><strong style={{color:'var(--green)'}}>&#10003;</strong> Service-based business (trades, cleaning, landscaping, plumbing, etc.)</Li>
              <Li><strong style={{color:'var(--green)'}}>&#10003;</strong> Has a phone number</Li>
              <Li><strong style={{color:'var(--green)'}}>&#10003;</strong> Canadian location</Li>
              <Li><strong style={{color:'var(--red)'}}>&#10007;</strong> NOT a large general contractor or commercial operation</Li>
              <Li><strong style={{color:'var(--red)'}}>&#10007;</strong> NOT an Airbnb listing, car wash, duct cleaning, or laundromat</Li>
            </ul>
          </div>

          <SecH>Pain Signals (What to Listen For)</SecH>
          <div className="card" style={{padding:'18px 20px',marginBottom:'16px'}}>
            <ul style={{padding:0,margin:0}}>
              <Li>Weak or no website</Li>
              <Li>Low online presence</Li>
              <Li>No lead generation system</Li>
              <Li>Getting work from word of mouth only</Li>
              <Li>Missing calls while on job sites</Li>
              <Li>No follow-up system for quotes</Li>
            </ul>
          </div>

          <SecH>Construction Niche Filter</SecH>
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--green)',margin:'0 0 8px',fontFamily:"'JetBrains Mono',monospace"}}>Target</p>
                <ul style={{padding:0,margin:0}}>
                  <Li>Handyman</Li>
                  <Li>Carpentry</Li>
                  <Li>Small home reno</Li>
                </ul>
              </div>
              <div>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--red)',margin:'0 0 8px',fontFamily:"'JetBrains Mono',monospace"}}>Skip</p>
                <ul style={{padding:0,margin:0}}>
                  <Li>Large GCs</Li>
                  <Li>Large commercial operations</Li>
                </ul>
              </div>
            </div>
            <div style={{marginTop:'12px',padding:'10px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'8px'}}>
              <p style={{color:'var(--text-tertiary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>Signal:</strong> 100 or fewer reviews + no signs of large commercial work.</p>
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB: DAILY ROUTINE ════════ */}
      {activeTab==='daily' && (
        <div>
          <SecH>Your Day — Structured for Results</SecH>
          <Body>Follow this schedule every day. Consistency beats talent when talent is inconsistent.</Body>

          <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
            {[
              {time:'8:00 AM',label:'PREP',dur:'15 min',color:'var(--accent-ink)',items:['Open portal, check callbacks due','Review yesterday\'s notes on warm leads','Set daily target: 50 calls minimum']},
              {time:'8:15 AM',label:'CALL BLOCK 1',dur:'2 hours',color:'var(--green)',items:['Dial through your "To Call" list in order','Log every call immediately','Use the approved opener for each lead type']},
              {time:'10:15 AM',label:'BREAK',dur:'15 min',color:'var(--text-muted)',items:[]},
              {time:'10:30 AM',label:'CALL BLOCK 2',dur:'1.5 hours',color:'var(--green)',items:['Continue calling','Follow up on any callbacks from Block 1']},
              {time:'12:00 PM',label:'LUNCH',dur:'30 min',color:'var(--text-muted)',items:[]},
              {time:'12:30 PM',label:'OUTREACH BLOCK',dur:'1 hour',color:'#a78bfa',items:['Send 10 Instagram/LinkedIn DMs using Written Outreach scripts','Send 5 cold emails using the 3-Touch sequence','Follow up on any DM replies']},
              {time:'1:30 PM',label:'CALL BLOCK 3',dur:'1.5 hours',color:'var(--green)',items:['Afternoon calling — different time zone prospects','Callbacks scheduled for afternoon']},
              {time:'3:00 PM',label:'ADMIN + DEBRIEF',dur:'30 min',color:'#ff9933',items:['Review today\'s stats in My Stats tab','Listen to 1-2 call recordings in Playback tab','Write notes on what worked / what to improve','Update any lead notes','Submit handoffs for booked calls']},
              {time:'3:30 PM',label:'DONE',dur:'',color:'var(--accent-ink)',items:['Or keep going if you\'re on fire']},
            ].map((block,i)=>(
              <div key={i} className="card" style={{padding:'14px 18px',borderLeft:`3px solid ${block.color}`}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:block.items.length?'8px':'0'}}>
                  <span style={{fontSize:'13px',fontWeight:800,color:'var(--text-primary)',fontFamily:"'JetBrains Mono',monospace",minWidth:'80px'}}>{block.time}</span>
                  <span style={{fontSize:'11px',fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',color:block.color,fontFamily:"'JetBrains Mono',monospace"}}>{block.label}</span>
                  {block.dur && <span style={{fontSize:'10px',color:'var(--text-muted)',background:'var(--bg-sidebar-line)',padding:'2px 8px',borderRadius:'4px',fontWeight:600}}>{block.dur}</span>}
                </div>
                {block.items.length > 0 && (
                  <ul style={{padding:0,margin:0}}>
                    {block.items.map((item,j)=><Li key={j}>{item}</Li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <SecH>Daily Benchmarks</SecH>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',gap:'10px',marginBottom:'16px'}}>
            <div className="card-glow" style={{padding:'16px 18px',textAlign:'center'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>50+</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--accent-ink)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Dials</p>
            </div>
            <div className="card-glow" style={{padding:'16px 18px',textAlign:'center'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>8-10</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--accent-ink)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Connects</p>
            </div>
            <div className="card-glow" style={{padding:'16px 18px',textAlign:'center'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>1-2</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--accent-ink)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Callbacks / Bookings</p>
            </div>
            <div className="card-glow" style={{padding:'16px 18px',textAlign:'center'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>100%</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--accent-ink)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Calls Logged</p>
            </div>
          </div>

          <SecH>Weekly Benchmarks</SecH>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',gap:'10px'}}>
            <div className="card" style={{padding:'16px 18px',textAlign:'center',borderLeft:'3px solid var(--green)'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>250+</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Dials</p>
            </div>
            <div className="card" style={{padding:'16px 18px',textAlign:'center',borderLeft:'3px solid var(--green)'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>5+</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Bookings</p>
            </div>
            <div className="card" style={{padding:'16px 18px',textAlign:'center',borderLeft:'3px solid var(--green)'}}>
              <p style={{fontSize:'28px',fontWeight:900,color:'var(--text-primary)',margin:'0 0 4px'}}>1+</p>
              <p style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',margin:0,fontFamily:"'JetBrains Mono',monospace"}}>Close</p>
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB: PRE-CALL CHECKLIST ════════ */}
      {activeTab==='precall' && (
        <div>
          <SecH>Before You Dial — 60-Second Research</SecH>
          <Body>Never cold-call blind. Run through these 5 checks in under a minute before every dial.</Body>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
              <span className="dot">1</span>
              <div>
                <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Google Reviews</p>
                <p style={{margin:0,color:'var(--text-muted)',fontSize:'12px'}}>How many? What rating? Read the latest 2-3.</p>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              <div style={{padding:'8px 14px',background:'rgba(255,68,68,.06)',border:'1px solid rgba(255,68,68,.2)',borderRadius:'6px'}}>
                <p style={{color:'var(--red)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong>Under 20 = HOT.</strong> Lead with <em>"I noticed you don't have much online presence"</em></p>
              </div>
              <div style={{padding:'8px 14px',background:'rgba(255,153,51,.06)',border:'1px solid rgba(255,153,51,.2)',borderRadius:'6px'}}>
                <p style={{color:'#ff9933',fontSize:'13px',margin:0,lineHeight:1.5}}><strong>20-59 = HIGH.</strong> Lead with <em>"I see you're building momentum"</em></p>
              </div>
              <div style={{padding:'8px 14px',background:'rgba(255,204,0,.06)',border:'1px solid rgba(255,204,0,.2)',borderRadius:'6px'}}>
                <p style={{color:'#ffcc00',fontSize:'13px',margin:0,lineHeight:1.5}}><strong>60-100 = MEDIUM.</strong> Lead with <em>"You're established but there's room to grow"</em></p>
              </div>
            </div>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
              <span className="dot">2</span>
              <div>
                <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Website</p>
                <p style={{margin:0,color:'var(--text-muted)',fontSize:'12px'}}>Do they have one? How does it look?</p>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              <div style={{padding:'8px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'6px'}}>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>No website</strong> = 0.5 offer (our $1,500 CAD website)</p>
              </div>
              <div style={{padding:'8px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'6px'}}>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>Bad website</strong> = <em>"I actually went ahead and built a preview for you"</em></p>
              </div>
              <div style={{padding:'8px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'6px'}}>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>Good website</strong> = Focus on lead gen, not the site itself</p>
              </div>
            </div>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
              <span className="dot">3</span>
              <div>
                <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Google Maps Listing</p>
                <p style={{margin:0,color:'var(--text-muted)',fontSize:'12px'}}>Is it claimed? Photos? Business hours?</p>
              </div>
            </div>
            <div style={{padding:'8px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'6px'}}>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>Unclaimed or sparse</strong> = Easy sell. They're leaving money on the table.</p>
            </div>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
              <span className="dot">4</span>
              <div>
                <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Social Media</p>
                <p style={{margin:0,color:'var(--text-muted)',fontSize:'12px'}}>Instagram? Facebook? How active?</p>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              <div style={{padding:'8px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'6px'}}>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>No socials</strong> = <em>"You're invisible to anyone under 40"</em></p>
              </div>
              <div style={{padding:'8px 14px',background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'6px'}}>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}><strong style={{color:'var(--accent-ink)'}}>Some activity</strong> = <em>"You're doing the work, but nobody's seeing it"</em></p>
              </div>
            </div>
          </div>

          <div className="card-glow" style={{padding:'20px 22px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
              <span className="dot">5</span>
              <div>
                <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Pick Your Opener</p>
                <p style={{margin:0,color:'var(--accent-ink)',fontSize:'12px',fontWeight:600}}>Match the opener to what you found</p>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 14px',background:'rgba(255,255,255,.02)',border:'1px solid var(--border-soft)',borderRadius:'8px'}}>
                <span style={{color:'var(--red)',fontWeight:800,fontSize:'12px',flexShrink:0,marginTop:'2px',fontFamily:"'JetBrains Mono',monospace"}}>NO SITE</span>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}>Opener 3 (0.5 Base) or Opener 4 (Pre-Built Preview)</p>
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 14px',background:'rgba(255,255,255,.02)',border:'1px solid var(--border-soft)',borderRadius:'8px'}}>
                <span style={{color:'#ff9933',fontWeight:800,fontSize:'12px',flexShrink:0,marginTop:'2px',fontFamily:"'JetBrains Mono',monospace"}}>BAD SITE</span>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}>Opener 1 (Gap/Improvement)</p>
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 14px',background:'rgba(255,255,255,.02)',border:'1px solid var(--border-soft)',borderRadius:'8px'}}>
                <span style={{color:'var(--green)',fontWeight:800,fontSize:'12px',flexShrink:0,marginTop:'2px',fontFamily:"'JetBrains Mono',monospace"}}>HAS ADS</span>
                <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0,lineHeight:1.5}}>Opener 2 (Meta/GSA)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB: HOW WE DELIVER ════════ */}
      {activeTab==='deliver' && (
        <div>
          <SecH>The Premmisus Engine — What You're Selling</SecH>
          <Body>When a rep says "we handle everything," this is what's behind the curtain.</Body>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
              <span className="tag">0.5</span>
              <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Website — $1,500 CAD</p>
            </div>
            <ul style={{padding:0,margin:0}}>
              <Li>Custom-coded in React (same technology as Netflix, Airbnb)</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>NOT</strong> a WordPress template — hand-built, unique to each client</Li>
              <Li>Mobile responsive, fast loading, SEO optimized</Li>
              <Li>Hosted on Vercel — 99.99% uptime, blazing fast</Li>
              <Li><strong style={{color:'var(--accent-ink)'}}>Client owns it forever.</strong> No hostage model.</Li>
              <Li>Delivered in 5 days.</Li>
            </ul>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
              <span className="tag">1.0-3.0</span>
              <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Lead Generation</p>
            </div>
            <ul style={{padding:0,margin:0}}>
              <Li><strong style={{color:'var(--text-primary)'}}>Google Ads</strong> — search campaigns targeting people actively looking</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>Meta Ads</strong> — Facebook + Instagram targeting local homeowners</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>SEO</strong> — Google Business Profile optimization, local search ranking</Li>
              <Li>All tracked in our CRM — every lead, every click, every conversion</Li>
            </ul>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
              <span className="tag">AI</span>
              <p style={{margin:0,fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>AI Layer</p>
            </div>
            <ul style={{padding:0,margin:0}}>
              <Li><strong style={{color:'var(--text-primary)'}}>AI Voice Receptionist (Vapi)</strong> — answers calls 24/7, books appointments</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>Automated SMS</strong> — texts leads back in under 30 seconds</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>AI Website Chatbot</strong> — converts visitors after hours</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>CRM Automation</strong> — pipeline runs itself, follow-ups fire automatically</Li>
              <Li><strong style={{color:'var(--text-primary)'}}>Automated Email Sequences</strong> — nurture leads on autopilot</Li>
            </ul>
          </div>

          <div className="card-glow" style={{padding:'20px 22px',marginBottom:'16px'}}>
            <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--accent-ink)',margin:'0 0 10px',fontFamily:"'JetBrains Mono',monospace"}}>The Speed Advantage</p>
            <p style={{color:'var(--text-secondary)',fontSize:'15px',lineHeight:1.7,margin:0,fontStyle:'italic'}}>"When a lead comes in, our AI responds in <strong style={{color:'var(--accent-ink)'}}>under 30 seconds</strong>. Your competitor takes <strong style={{color:'var(--red)'}}>42 hours on average</strong>. By the time they check their voicemail, the job is already booked."</p>
          </div>

          <SecH>What Makes Us Different</SecH>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {[
              {num:'1', text:'You own everything we build (competitors hold your site hostage)'},
              {num:'2', text:'AI that works while you sleep (no other Canadian agency offers this)'},
              {num:'3', text:'$1,500 for a custom website (competitors charge $3K-$50K)'},
              {num:'4', text:'Full-stack: website + ads + AI + CRM = one team, one bill'},
            ].map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'12px',padding:'12px 14px',background:'rgba(255,255,255,.02)',border:'1px solid var(--border-soft)',borderRadius:'8px'}}>
                <span className="dot">{d.num}</span>
                <p style={{margin:0,color:'var(--text-secondary)',fontSize:'14px',lineHeight:1.5}}>{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TAB: COMPETITIVE ADVANTAGES ════════ */}
      {activeTab==='compete' && (
        <div>
          <SecH>Competitive Advantages — Quick Reference</SecH>
          <Body>Know the landscape. When a prospect names a competitor, you have the answer.</Body>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px',borderLeft:'3px solid var(--red)'}}>
            <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--red)',margin:'0 0 12px',fontFamily:"'JetBrains Mono',monospace"}}>VS Scorpion / Hook Agency / Service Scalers</p>
            <ul style={{padding:0,margin:0}}>
              <Li>They charge <strong style={{color:'var(--red)'}}>$3,500-$7,000/mo</strong>. We start at <strong style={{color:'var(--green)'}}>$1,599</strong>.</Li>
              <Li>They lock you in — leave and lose your website. <strong style={{color:'var(--green)'}}>We build it, you own it.</strong></Li>
              <Li>They use templates. <strong style={{color:'var(--green)'}}>We custom-code in React.</strong></Li>
              <Li>They don't have AI. <strong style={{color:'var(--green)'}}>We have voice AI, chatbots, and automation.</strong></Li>
            </ul>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'12px',borderLeft:'3px solid #ff9933'}}>
            <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#ff9933',margin:'0 0 12px',fontFamily:"'JetBrains Mono',monospace"}}>VS DIY (Wix / Squarespace)</p>
            <ul style={{padding:0,margin:0}}>
              <Li>Template sites rank terribly on Google</Li>
              <Li>No lead capture, no follow-up system, no analytics</Li>
              <Li>Looks the same as every other trades site</Li>
              <Li><strong style={{color:'var(--green)'}}>Our site generates leads. Theirs is a digital business card.</strong></Li>
            </ul>
          </div>

          <div className="card" style={{padding:'20px 22px',marginBottom:'16px',borderLeft:'3px solid #ffcc00'}}>
            <p style={{fontSize:'10px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase',color:'#ffcc00',margin:'0 0 12px',fontFamily:"'JetBrains Mono',monospace"}}>VS Freelancers (Fiverr / Upwork)</p>
            <ul style={{padding:0,margin:0}}>
              <Li>They build and disappear. <strong style={{color:'var(--green)'}}>We manage ongoing.</strong></Li>
              <Li>No strategy, no ads, no AI, no CRM.</Li>
              <Li><strong style={{color:'var(--green)'}}>You get a website. We give you a system.</strong></Li>
            </ul>
          </div>

          <div className="card-glow" style={{padding:'20px 22px'}}>
            <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--accent-ink)',margin:'0 0 10px',fontFamily:"'JetBrains Mono',monospace"}}>The Line That Wins</p>
            <p style={{color:'var(--text-secondary)',fontSize:'16px',lineHeight:1.7,margin:0,fontStyle:'italic',fontWeight:600}}>"Keep your current agency for marketing. Add us for the AI layer they can't do."</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoundationPanel;
