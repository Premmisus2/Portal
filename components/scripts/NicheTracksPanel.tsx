'use client';

import { useState } from 'react';
import { Rep, Body, SubH, PLabel, IfBlock, Li } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const NICHES = [
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'construction', label: 'Construction & Handyman', icon: '🔨' },
  { id: 'landscaping', label: 'Landscaping', icon: '🌿' },
  { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { id: 'pressure', label: 'Pressure Washing', icon: '💦' },
  { id: 'window', label: 'Window Washing', icon: '🪟' },
];

const NicheTracksPanel = () => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div>
      <div style={{marginBottom:'6px'}}><span className="tag">06</span></div>
      <h2 style={{fontSize:'26px',fontWeight:900,color:'var(--text-primary)',margin:'8px 0 4px'}}>Niche Talk Tracks</h2>
      <Body>Industry-specific pain points, openers, and hooks. Know what hurts before you call — then speak their language.</Body>
      <div className="divider" style={{margin:'16px 0'}}/>

      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
        {NICHES.map(niche => (
          <div key={niche.id}>
            <button
              onClick={() => setActive(active === niche.id ? null : niche.id)}
              style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'14px 16px', background: active === niche.id ? 'var(--bg-elev-1)' : 'var(--bg-elev-2)',
                border: active === niche.id ? '1px solid var(--accent-glow-22)' : '1px solid var(--border-soft)',
                borderRadius: active === niche.id ? '10px 10px 0 0' : '10px',
                cursor:'pointer', transition:'all .2s', outline:'none',
              }}
              onMouseEnter={e => { if (active !== niche.id) e.currentTarget.style.borderColor = '#2a2a2a'; }}
              onMouseLeave={e => { if (active !== niche.id) e.currentTarget.style.borderColor = 'var(--border-soft)'; }}
            >
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <span style={{fontSize:'18px'}}>{niche.icon}</span>
                <span style={{fontSize:'14px', fontWeight:700, color: active === niche.id ? 'var(--accent-ink)' : 'var(--text-tertiary)', fontFamily:'Inter,sans-serif', transition:'color .2s'}}>{niche.label}</span>
              </div>
              <span style={{fontSize:'12px', color:'var(--text-faint)', transform: active === niche.id ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform .2s'}}>▸</span>
            </button>

            {active === niche.id && (
              <div style={{padding:'20px', background:'var(--bg-elev-pill)', border:'1px solid var(--accent-glow-22)', borderTop:'none', borderRadius:'0 0 10px 10px'}} className="fadein">
                {renderNicheContent(niche.id)}
              </div>
            )}
          </div>
        ))}
      </div>

      <NotesPad storageKey="notes_niche_tracks" />
    </div>
  );
};

function renderNicheContent(nicheId: string) {
  switch (nicheId) {
    case 'cleaning': return <CleaningTrack />;
    case 'construction': return <ConstructionTrack />;
    case 'landscaping': return <LandscapingTrack />;
    case 'plumbing': return <PlumbingTrack />;
    case 'pressure': return <PressureWashingTrack />;
    case 'window': return <WindowWashingTrack />;
    default: return null;
  }
}

/* ─────────────────────────────────────────────
   CLEANING
   ───────────────────────────────────────────── */
function TierBadge({ tier }: { tier: 'junior' | 'commander' | 'all' }) {
  if (tier === 'all') return null;
  const styles = tier === 'junior'
    ? { bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.3)', color: '#fb923c', label: 'ALL TIERS' }
    : { bg: 'var(--accent-glow-10)', border: 'var(--accent-glow-30)', color: 'var(--accent-ink)', label: 'FIELD COMMANDER+' };
  return (
    <span style={{fontSize:'8px', fontWeight:800, padding:'2px 8px', borderRadius:'4px', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.12em', background:styles.bg, border:`1px solid ${styles.border}`, color:styles.color, marginLeft:'8px', verticalAlign:'middle'}}>{styles.label}</span>
  );
}

function CleaningTrack() {
  return (
    <div>
      <PLabel>[Core Angle — Time Freedom]</PLabel>
      <Body>Cleaning businesses are almost always at capacity. The pitch is NOT &ldquo;get more leads.&rdquo; It&rsquo;s &ldquo;buy back your time.&rdquo; The owner IS the business — they answer calls, manage cleaners, and clean alongside their team. Every hat is on one head. AI takes hats off. That&rsquo;s the sell.</Body>

      <div className="divider" style={{margin:'16px 0'}}/>
      <SubH>Pain Points You&rsquo;ll Hear</SubH>

      {/* ── Pain Point 1 ── */}
      <div className="card" style={{padding:'18px',marginTop:'10px',marginBottom:'12px'}}>
        <PLabel>1. &ldquo;We have a waiting list / We&rsquo;re at capacity&rdquo;</PLabel>
        <Body>Most common response. Three problems stacked: they can&rsquo;t answer the phone (on a job, gloves on), they&rsquo;re the bottleneck (every decision goes through them), and they&rsquo;re scared to grow (hiring = more chaos). All three are solved by the same thing — AI buys back their time.</Body>
        <PLabel>[The Time Trap Question]</PLabel>
        <Rep>I hear you — and that&rsquo;s actually a great position to be in. But let me ask you something real quick: when you&rsquo;re out on a job right now and the phone rings, what happens? Do you stop what you&rsquo;re doing and answer it, or does it go to voicemail?</Rep>
        <PLabel>[Wait for answer — they&rsquo;ll admit to one or the other. Then:]</PLabel>
        <Rep>That&rsquo;s exactly why I called. I&rsquo;m not here to get you more leads — you clearly don&rsquo;t need that. What I&rsquo;m talking about is an AI system that picks up every call you can&rsquo;t get to, qualifies the person, and books them into your calendar — all while you&rsquo;re mid-job. You&rsquo;re not taking on more work. You&rsquo;re just not losing the good work that&rsquo;s already calling you.</Rep>
        <IfBlock label="If they say &ldquo;we're fine with our size&rdquo;">
          <Rep>I respect that. But let me ask it this way — are you choosing to stay this size because you love it, or are you stuck at this size because you can&rsquo;t handle more without burning out? Because those are two very different situations, and only one of them is a problem.</Rep>
        </IfBlock>
        <IfBlock label="If they admit they're overwhelmed">
          <Rep>That&rsquo;s exactly what this solves. You&rsquo;re not adding more work to your plate. You&rsquo;re removing yourself as the single point of failure. The AI handles the intake — the calls, the qualification, the booking — so you can actually focus on running the business instead of being trapped inside it.</Rep>
        </IfBlock>
      </div>

      {/* ── Pain Point 2 ── */}
      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>2. &ldquo;I run the whole thing myself — I answer calls, I clean, I do the books&rdquo;</PLabel>
        <Body>The founder is the receptionist, the manager, the cleaner, and the accountant. They&rsquo;re burned out but see no way out because every alternative means spending money they&rsquo;re not sure they have. The AI receptionist is the first hat that comes off — cheapest employee they&rsquo;ll ever hire, works 24/7, never calls in sick.</Body>
        <PLabel>[Paint the Daily Reality]</PLabel>
        <Rep>Picture this — you&rsquo;re mid-clean, hands in a bucket, and the phone rings. You rip off your gloves, dry your hands, pull out your phone, and by the time you answer... they&rsquo;ve already hung up and Googled the next cleaner. Or maybe you do answer, but now you&rsquo;re standing in a client&rsquo;s kitchen on the phone while the job sits unfinished. Sound familiar?</Rep>
        <PLabel>[The Solve]</PLabel>
        <Rep>Our AI receptionist handles that entire problem. Someone calls your business — it picks up in under 30 seconds. It asks them what they need, figures out if it&rsquo;s worth your time, and books them right into your calendar. You finish the job, check your phone, and there&rsquo;s a new appointment sitting there. No missed calls, no voicemail tag, no scrambling with wet hands. It&rsquo;s like hiring a full-time receptionist for a fraction of the cost — except this one never takes a day off.</Rep>
      </div>

      {/* ── Pain Point 3 ── */}
      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>3. &ldquo;We already have someone handling our marketing / family member built our site&rdquo;</PLabel>
        <Body>Loyalty to whoever built the site. Usually a family member or a small local agency. The website is often poor but functional enough. They don&rsquo;t want to feel like they&rsquo;re betraying that person. Never trash their current setup. AI is a completely different lane — complement, don&rsquo;t replace. But leave the door open.</Body>
        <PLabel>[Validate First]</PLabel>
        <Rep>That&rsquo;s great that you have someone on that — I&rsquo;m not here to step on their toes or replace what they&rsquo;ve built. That&rsquo;s their lane. What I&rsquo;m talking about is a completely different layer.</Rep>
        <PLabel>[The Different Lane Pivot]</PLabel>
        <Rep>Think of it like this: your website and your marketing bring people to your door. What we do is answer the door when you&rsquo;re not there. An AI system that responds to every inquiry in under 30 seconds, qualifies them, and books them in — whether it&rsquo;s a phone call, a text, or a form fill. Your marketing person keeps doing what they&rsquo;re doing. We&rsquo;re plugging into a gap they&rsquo;re not covering. Two completely separate things.</Rep>
        <IfBlock label="If they seem open">
          <Rep>And look — if down the road you&rsquo;re impressed enough with what we do and you want to see what we could do on the marketing side too, that door is always open. But right now, I just want to show you the AI piece. Can I send you a quick preview?</Rep>
        </IfBlock>
      </div>

      {/* ── Pain Point 4 ── */}
      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>4. &ldquo;Meta ads didn&rsquo;t work for us&rdquo;</PLabel>
        <Body>They tried it themselves or had a bad agency. They genuinely believe Meta doesn&rsquo;t work for trades. Don&rsquo;t argue about Meta. Acknowledge their experience and pivot to AI. If they&rsquo;re curious, use the gasoline/fire metaphor to explain why it failed — but only if they ask.</Body>
        <PLabel>[Acknowledge + Pivot]</PLabel>
        <Rep>I hear that a lot, honestly. And you know what, for some cleaning businesses Meta genuinely isn&rsquo;t the right play — especially if you&rsquo;re already at capacity from word of mouth and Google. That&rsquo;s actually not why I&rsquo;m calling. I want to talk about something completely different — the AI side. A system that catches every lead you&rsquo;re currently missing when you&rsquo;re too busy to answer the phone.</Rep>
        <IfBlock label="If they ask why their ads failed">
          <PLabel>[The Gasoline/Fire Metaphor]</PLabel>
          <Rep>So here&rsquo;s the thing about ads — think of them like pouring gasoline on a fire. They&rsquo;re a catalyst. But if there&rsquo;s no fire underneath — no website that converts, no system to respond to those leads in under 30 seconds, no CRM to follow up — then the gasoline just evaporates. The rain comes and washes it out. Whoever was running your ads before probably wasn&rsquo;t a specialist, and they were missing the other pieces that make ads actually work. Website, phone system, CRM, AI — each element compounds on the last. Without the foundation, ads are just burning money.</Rep>
        </IfBlock>
        <IfBlock label="If they shut the ads conversation down">
          <Rep>Totally fair — ads aren&rsquo;t even why I called. Let me ask you this instead: when someone texts your business at 8 PM on a Saturday looking for a cleaning quote, what happens right now?</Rep>
        </IfBlock>
      </div>

      {/* ── Pain Point 5 ── */}
      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>5. &ldquo;We&rsquo;re already running Google Ads and getting clients&rdquo;</PLabel>
        <Body>Good sign — they&rsquo;re spending money and seeing results. They understand paid marketing. Don&rsquo;t compete with their Google Ads. Stack AI on top to make their existing spend work harder. Plant the performance-based seed for future full-stack engagement.</Body>
        <PLabel>[Compliment + Speed-to-Lead]</PLabel>
        <Rep>That&rsquo;s great — it means you already understand the value of being found online. Most cleaning businesses I talk to haven&rsquo;t even gotten to that point. Quick question though: when those Google Ad leads come in, how fast are they getting a response from you?</Rep>
        <PLabel>[Wait for answer — then:]</PLabel>
        <Rep>Here&rsquo;s the data: if a lead doesn&rsquo;t hear back within 5 minutes, the chance of closing that job drops by 80%. They click your ad, they fill out a form, and then what? If you&rsquo;re out cleaning and can&rsquo;t call back for 3 hours, you&rsquo;ve already lost them to the next cleaner who picked up faster. Our AI system responds in 30 seconds. It makes your Google Ads budget work harder — same spend, more booked jobs — without you lifting a finger.</Rep>
        <IfBlock label="If they're interested">
          <PLabel>[Plant the Performance Seed]</PLabel>
          <Rep>And look — we&rsquo;re so confident this will make a noticeable difference to your numbers that we operate on a performance basis. You don&rsquo;t pay if we don&rsquo;t produce. That&rsquo;s how sure we are. Can I show you what the system looks like?</Rep>
        </IfBlock>
      </div>

      {/* ── Pain Point 6 ── */}
      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>6. Hiring / Scaling Hesitation</PLabel>
        <Body>They&rsquo;re interested in growth but the operational complexity scares them. More employees = more headaches, more management, more liability. The real blocker isn&rsquo;t leads — it&rsquo;s whether they&rsquo;re willing to take the leap. Frame AI as the thing that makes scaling less scary — it handles the admin side so they can focus on the work.</Body>
        <PLabel>[Acknowledge the Fear]</PLabel>
        <Rep>I get it — hiring is a headache, especially in cleaning. Finding reliable people, training them, managing schedules. It&rsquo;s a lot. But let me reframe this for you.</Rep>
        <PLabel>[The Reframe]</PLabel>
        <Rep>Right now you&rsquo;re turning away work because you physically can&rsquo;t handle it. What if you could take on 3 more recurring weekly contracts without answering a single extra phone call? Our system qualifies the leads, books them in, and handles the back-and-forth. You just show up and clean — or send your team to clean. The admin part — the phone calls, the texts, the scheduling — that&rsquo;s the part that makes scaling terrifying. And that&rsquo;s exactly the part we automate.</Rep>
        <IfBlock label="If they're warming up to the idea">
          <Rep>You&rsquo;re not taking on more chaos. You&rsquo;re taking on more profit with the same amount of effort. Would it help if I showed you what this looks like for a cleaning business specifically?</Rep>
        </IfBlock>
      </div>

      {/* ── OPENERS ── */}
      <div className="divider" style={{margin:'20px 0'}}/>
      <SubH>Cleaning-Specific Openers</SubH>

      <div className="card" style={{padding:'18px',marginTop:'10px',marginBottom:'12px'}}>
        <PLabel>[Opener 1: The Missed-Call Question]</PLabel>
        <span style={{fontSize:'8px', fontWeight:800, padding:'2px 8px', borderRadius:'4px', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.12em', background:'rgba(249,115,22,.12)', border:'1px solid rgba(249,115,22,.3)', color:'#fb923c', marginLeft:'8px'}}>ALL TIERS</span>
        <Rep>Hey [Name], this is [Rep] from Premmisus. I&rsquo;m not calling to sell you marketing — I know you guys are probably busy enough. I actually wanted to ask you a quick question: when you&rsquo;re out on a job and a potential client calls your business line, what happens right now?</Rep>
        <Body>Makes them admit the problem themselves. Wait for their answer — they&rsquo;ll usually say calls go to voicemail or they scramble to pick up. That&rsquo;s your opening for the AI receptionist pitch. Highest booking rate from real calls.</Body>
      </div>

      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>[Opener 2: The Research Hook]</PLabel>
        <span style={{fontSize:'8px', fontWeight:800, padding:'2px 8px', borderRadius:'4px', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.12em', background:'rgba(249,115,22,.12)', border:'1px solid rgba(249,115,22,.3)', color:'#fb923c', marginLeft:'8px'}}>ALL TIERS</span>
        <Rep>Hey [Name], this is [Rep] from Premmisus. I actually looked into your business before calling, and it looks like you guys are doing well — solid reviews, clearly busy. I&rsquo;m not here to tell you that you need more leads. What I wanted to talk about is whether you have a system catching the leads you&rsquo;re missing while you&rsquo;re out working.</Rep>
        <Body>Shows homework and builds credibility before the pitch. Works well when you&rsquo;ve actually reviewed their Google profile.</Body>
      </div>

      <div className="card" style={{padding:'18px',marginBottom:'12px'}}>
        <PLabel>[Opener 3: The AI Curiosity Hook]</PLabel>
        <span style={{fontSize:'8px', fontWeight:800, padding:'2px 8px', borderRadius:'4px', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.12em', background:'rgba(249,115,22,.12)', border:'1px solid rgba(249,115,22,.3)', color:'#fb923c', marginLeft:'8px'}}>ALL TIERS</span>
        <Rep>Hey [Name], this is [Rep] from Premmisus. I help cleaning businesses like yours use AI to buy back their time — not more leads, more freedom. Do you have 30 seconds?</Rep>
        <Body>Leads with the value prop directly. Filters fast — interested prospects lean in immediately, uninterested ones say so quickly. Good for high-volume calling.</Body>
      </div>

      <div className="card" style={{padding:'18px',marginBottom:'12px',border:'1px solid var(--accent-glow-15)'}}>
        <PLabel>[Opener 4: The Warm Callback]</PLabel>
        <span style={{fontSize:'8px', fontWeight:800, padding:'2px 8px', borderRadius:'4px', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.12em', background:'var(--accent-glow-10)', border:'1px solid var(--accent-glow-30)', color:'var(--accent-ink)', marginLeft:'8px'}}>FIELD COMMANDER+</span>
        <Rep>Hey [Name], this is [Rep] from Premmisus. We actually spoke about a month ago, and you told me to call back. Since then, AI has been moving so fast that I&rsquo;ve had to take this time to research everything that&rsquo;s been going on — and I think there&rsquo;s something here that&rsquo;s worth 60 seconds of your time.</Rep>
        <Body>Advanced play. Requires confidence and the ability to navigate if they don&rsquo;t remember the previous call. Works best when calling back warm leads from a previous pass. NOT for Junior Growth Associates — this takes experience to pull off naturally.</Body>
      </div>

      {/* ── WHAT LANDS ── */}
      <div className="divider" style={{margin:'20px 0'}}/>
      <SubH>What Lands With Cleaners</SubH>

      <div style={{marginTop:'8px'}}>
        <Li>AI receptionist pitch closes — they&rsquo;re owners who answer phones mid-job with wet hands. This solves a real daily pain.</Li>
        <Li>&ldquo;Digital crew member working 24/7&rdquo; — the subcontractor metaphor resonates because they understand hiring help.</Li>
        <Li>Time freedom over lead volume — they&rsquo;re already busy. Don&rsquo;t sell them more work, sell them more breathing room.</Li>
        <Li>Recurring contract angle — the dream for every cleaning business is weekly/bi-weekly contracts, not one-time move-outs.</Li>
        <Li>Don&rsquo;t compete with existing marketing. Stack AI on top. Pivot away from ads if they push back.</Li>
        <Li>Gasoline/fire metaphor for explaining why their previous ads failed — only use if they ask.</Li>
        <Li>Performance-based confidence: &ldquo;You don&rsquo;t pay if we don&rsquo;t produce&rdquo; — plants the full-stack seed without pitching it.</Li>
      </div>

      {/* ── REAL DATA ── */}
      <div className="divider" style={{margin:'20px 0'}}/>
      <SubH>Real Call Data</SubH>
      <div style={{marginTop:'8px'}}>
        <Li>3-4 out of 7 connected calls booked when pivoted to AI tools</Li>
        <Li>Multiple no-shows after booking — always send same-day confirmation SMS</Li>
        <Li>Only 1 hard hangup out of 7 — most are willing to talk, they&rsquo;re just &ldquo;fine&rdquo;</Li>
        <Li>The challenge isn&rsquo;t getting them interested — it&rsquo;s getting them to show up. Nail the confirmation flow.</Li>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONSTRUCTION & HANDYMAN
   ───────────────────────────────────────────── */
function ConstructionTrack() {
  return (
    <div>
      <SubH>Pain Points You&rsquo;ll Hear</SubH>
      <div style={{color:'var(--text-tertiary)',fontSize:'13px',lineHeight:1.7,fontFamily:'Roboto,sans-serif',marginTop:'8px'}}>
        Content coming soon — Elliott is building these with real call data.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LANDSCAPING
   ───────────────────────────────────────────── */
function LandscapingTrack() {
  return (
    <div>
      <SubH>Pain Points You&rsquo;ll Hear</SubH>
      <div style={{color:'var(--text-tertiary)',fontSize:'13px',lineHeight:1.7,fontFamily:'Roboto,sans-serif',marginTop:'8px'}}>
        Content coming soon — Elliott is building these with real call data.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PLUMBING
   ───────────────────────────────────────────── */
function PlumbingTrack() {
  return (
    <div>
      <SubH>Pain Points You&rsquo;ll Hear</SubH>
      <div style={{color:'var(--text-tertiary)',fontSize:'13px',lineHeight:1.7,fontFamily:'Roboto,sans-serif',marginTop:'8px'}}>
        Content coming soon — Elliott is building these with real call data.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRESSURE WASHING
   ───────────────────────────────────────────── */
function PressureWashingTrack() {
  return (
    <div>
      <SubH>Pain Points You&rsquo;ll Hear</SubH>
      <div style={{color:'var(--text-tertiary)',fontSize:'13px',lineHeight:1.7,fontFamily:'Roboto,sans-serif',marginTop:'8px'}}>
        Content coming soon — Elliott is building these with real call data.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WINDOW WASHING
   ───────────────────────────────────────────── */
function WindowWashingTrack() {
  return (
    <div>
      <SubH>Pain Points You&rsquo;ll Hear</SubH>
      <div style={{color:'var(--text-tertiary)',fontSize:'13px',lineHeight:1.7,fontFamily:'Roboto,sans-serif',marginTop:'8px'}}>
        Content coming soon — Elliott is building these with real call data.
      </div>
    </div>
  );
}

export default NicheTracksPanel;
