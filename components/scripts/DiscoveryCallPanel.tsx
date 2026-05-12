'use client';

import { Rep, Body, SecH, SubH, PLabel, IfBlock, Li } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const DiscoveryCallPanel = () => (
  <div className="print-area" style={{maxWidth:'820px',margin:'0 auto',padding:'32px 28px'}}>

    <div style={{marginBottom:'8px'}}>
      <span className="tag">DISCOVERY CALL</span>
    </div>
    <h2 style={{fontSize:'24px',fontWeight:900,margin:'0 0 6px',letterSpacing:'-.02em'}}>Discovery Call Framework</h2>
    <Body>This is the agenda for a booked Google Meet with a prospect who already agreed to talk. Total runtime: ~15 minutes. Control the frame — you lead, they follow.</Body>

    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
      <span className="tag" style={{fontSize:'9px'}}>~15 MIN TOTAL</span>
      <span className="tag" style={{fontSize:'9px'}}>GOOGLE MEET</span>
      <span className="tag" style={{fontSize:'9px'}}>SCREEN SHARE READY</span>
    </div>

    <div className="divider" style={{margin:'20px 0'}} />

    <SecH>Phase 1 — The Warm-Up (2 min)</SecH>
    <PLabel>Goal</PLabel>
    <Body>Build rapport. Confirm what they know. Set the agenda so you control the frame.</Body>

    <Rep>
      Hey [Name], appreciate you jumping on — I know you're busy running [Business Name], so I'll keep this tight. Before I show you anything, I want to understand your business first. That way I'm not wasting your time showing you stuff that doesn't apply. Sound good?
    </Rep>

    <IfBlock label="If they start asking about pricing immediately">
      <Rep>
        Great question — I'll get to pricing, I promise. But I want to make sure I'm recommending the right thing first. Some of our clients only need one piece, others need the full system. Let me ask a couple quick questions so I don't oversell you.
      </Rep>
    </IfBlock>

    <div style={{height:'16px'}} />

    <SecH>Phase 2 — Discovery Questions (5 min)</SecH>
    <PLabel>Goal</PLabel>
    <Body>Uncover their pain, current situation, and what success looks like. Let them talk — your job is to listen and take notes.</Body>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>Question 1 — Current Lead Gen</SubH>
      <Rep>How are you currently getting new customers? Word of mouth, ads, Google — what's working for you right now?</Rep>
      <div style={{marginTop:'4px'}}>
        <Body><strong style={{color:'var(--text-primary)'}}>Listen for:</strong> "Just word of mouth" = massive opportunity. "We tried ads" = dig into what went wrong.</Body>
      </div>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>Question 2 — Job Value</SubH>
      <Rep>What's your average job worth? Like a typical residential job — what does that look like revenue-wise?</Rep>
      <div style={{marginTop:'4px'}}>
        <Body><strong style={{color:'var(--text-primary)'}}>Why:</strong> You need this number to calculate ROI later. "If each job is $500 and we bring you 20 leads a month..."</Body>
      </div>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>Question 3 — Lead Volume</SubH>
      <Rep>How many leads are you getting per month right now? Roughly — doesn't have to be exact.</Rep>
      <div style={{marginTop:'4px'}}>
        <Body><strong style={{color:'var(--text-primary)'}}>Listen for:</strong> Low numbers = they need Foundation 1.0. High numbers but poor conversion = they need Authority 2.0.</Body>
      </div>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>Question 4 — The Missed Call Problem</SubH>
      <Rep>What happens when a lead comes in while you're on a job site? Like somebody fills out a form or calls — who handles that?</Rep>
      <div style={{marginTop:'4px'}}>
        <Body><strong style={{color:'var(--text-primary)'}}>This is the Vapi opener.</strong> If they say "I try to call back later" or "my wife handles it" — they're losing leads. Seed the AI receptionist here.</Body>
      </div>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>Question 5 — Past Agency Experience</SubH>
      <Rep>Have you worked with a marketing agency before? What happened?</Rep>
      <div style={{marginTop:'4px'}}>
        <Body><strong style={{color:'var(--text-primary)'}}>Listen for:</strong> "They locked me into a contract" = hit the ownership hook hard. "It didn't work" = ask what specifically didn't work. "Never" = clean slate, easier close.</Body>
      </div>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>Question 6 — The Value Question</SubH>
      <Rep>If I could guarantee you X qualified leads per month — people actively looking for [their service] in [their city] — what would that be worth to your business?</Rep>
      <div style={{marginTop:'4px'}}>
        <Body><strong style={{color:'var(--text-primary)'}}>This anchors them to a dollar value before you show pricing.</strong> If they say "that'd be huge" — you've already won. Tie back to this answer in Phase 4.</Body>
      </div>
    </div>

    <div style={{height:'16px'}} />

    <SecH>Phase 3 — The Demo (3 min)</SecH>
    <PLabel>Goal</PLabel>
    <Body>Show, don't tell. Screen share the preview site. Walk them through the lead capture flow. Make it real.</Body>

    <Rep>
      Alright, let me share my screen — I want to show you something. So this is a preview I put together for [Business Name]. This is what your customers would see when they find you online.
    </Rep>
    <PLabel>Walk Through</PLabel>
    <ul style={{padding:0,margin:0}}>
      <Li>Show the homepage — point out their branding, services, reviews section</Li>
      <Li>Click through to the contact form — "This is where leads come in"</Li>
      <Li>Explain the AI response: "The second someone fills this out, they get a text back in under 30 seconds. While you're on a job site, we're already qualifying that lead for you."</Li>
      <Li>Show the CRM view if applicable: "Every lead lands here. You can see who called, who booked, who needs follow-up — all in one place."</Li>
    </ul>

    <IfBlock label="If they say: 'This looks amazing'">
      <Rep>
        And this is just the preview — we haven't even turned on the ads yet. Imagine this with 200-300 targeted visitors hitting it every month.
      </Rep>
    </IfBlock>

    <IfBlock label="If they want changes to the preview">
      <Rep>
        Absolutely — this is a starting point. Once we go live, we'll dial it in exactly how you want it. The design, the copy, everything — it's yours.
      </Rep>
    </IfBlock>

    <div style={{height:'16px'}} />

    <SecH>Phase 4 — The Recommendation (2 min)</SecH>
    <PLabel>Goal</PLabel>
    <Body>Based on their answers from Phase 2, recommend the right tier. Don't present all tiers — present THE tier that fits them.</Body>

    <Rep>
      Based on everything you've told me, here's what I'd recommend for [Business Name]...
    </Rep>

    <div className="card-glow" style={{padding:'18px 20px',marginTop:'12px'}}>
      <SubH>Decision Tree</SubH>
      <ul style={{padding:0,margin:0}}>
        <Li><strong style={{color:'var(--text-primary)'}}>No website at all</strong> → Website Package (Offer 0.5) — $1,500 CAD ($500 down, $1,000 on delivery). "Let's get you online first. You can't run ads to something that doesn't exist."</Li>
        <Li><strong style={{color:'var(--text-primary)'}}>Has website, no leads</strong> → Foundation 1.0 — $1,599/mo. "You've got the foundation, but nobody's finding you. We fix that with ads, SEO, and our AI follow-up system."</Li>
        <Li><strong style={{color:'var(--text-primary)'}}>Has some marketing, poor quality</strong> → Authority System 2.0 — $2,999/mo. "You're spending money but not seeing results. We rebuild the pipeline — ads, CRM, nurturing, the works."</Li>
        <Li><strong style={{color:'var(--text-primary)'}}>Wants everything / ready to dominate</strong> → Market Domination 3.0 — $5,999/mo. "This is a full marketing department for a fraction of the cost. Social media, content, reputation management — we run it all."</Li>
      </ul>
    </div>

    <PLabel>Price Anchor</PLabel>
    <Rep>
      For context — hiring even a part-time marketing person would run you $3,000-$5,000 a month, and that's one person doing one thing. This is a full system — ads, AI, CRM, SEO, everything — for [recommended price].
    </Rep>

    <div style={{height:'16px'}} />

    <SecH>Phase 5 — The Close (3 min)</SecH>
    <PLabel>Goal</PLabel>
    <Body>Get a yes or get a clear next step. No "let me think about it" without a follow-up locked in.</Body>

    <Rep>
      So here's what the next step looks like — I'll send over the agreement, we get your ad accounts set up this week, and the first campaigns go live within 5-7 business days. You'll start seeing leads before the month is out. Does that work for you?
    </Rep>

    <IfBlock label="If they say: 'Let me think about it'">
      <Rep>
        Totally understand — it's a big decision. What specifically do you want to think about? Is it the price, the timing, or something else? I'd rather address it now so you're not sitting on a question all week.
      </Rep>
    </IfBlock>

    <IfBlock label="If they say: 'I need to talk to my partner'">
      <Rep>
        Makes sense. Want to bring them on a quick 10-minute call? I can walk them through the same thing — that way you're not playing telephone. I'm free [two specific times].
      </Rep>
    </IfBlock>

    <IfBlock label="If they say yes">
      <Rep>
        Amazing. I'll send the agreement over right now. Once that's signed, I'll get your onboarding started today. You'll hear from me within 24 hours with your setup checklist.
      </Rep>
    </IfBlock>

    <div className="divider" style={{margin:'24px 0'}} />

    <SecH>Red Flag Indicators</SecH>
    <Body>Signs the prospect isn't qualified. Don't force a close — protect your time.</Body>

    <div className="mistake-block" style={{marginBottom:'6px'}}>
      <span className="mistake-label">RED FLAG</span>
      <p className="mistake-text">"Can you do it for free first and I'll pay you later?" — They don't value what you do. Walk away.</p>
    </div>
    <div className="mistake-block" style={{marginBottom:'6px'}}>
      <span className="mistake-label">RED FLAG</span>
      <p className="mistake-text">"My nephew does my website" — They're not ready to invest in professional marketing. Offer 0.5 max.</p>
    </div>
    <div className="mistake-block" style={{marginBottom:'6px'}}>
      <span className="mistake-label">RED FLAG</span>
      <p className="mistake-text">"I don't really need more customers right now" — If they're not trying to grow, there's no sale. Unless they have a missed-call problem (Vapi play).</p>
    </div>
    <div className="mistake-block" style={{marginBottom:'6px'}}>
      <span className="mistake-label">RED FLAG</span>
      <p className="mistake-text">They reschedule 3+ times or show up 15+ minutes late — Low respect for your time signals low respect for the partnership.</p>
    </div>

    <div className="divider" style={{margin:'24px 0'}} />

    <SecH>Transition Phrases Between Phases</SecH>
    <ul style={{padding:0,margin:0}}>
      <Li><strong style={{color:'var(--text-primary)'}}>Warm-Up → Discovery:</strong> "Alright, let me ask you a few quick questions so I can figure out what actually makes sense for you."</Li>
      <Li><strong style={{color:'var(--text-primary)'}}>Discovery → Demo:</strong> "Okay, I've got a solid picture. Let me show you what we've already started building."</Li>
      <Li><strong style={{color:'var(--text-primary)'}}>Demo → Recommendation:</strong> "So based on what you told me and what you just saw — here's what I'd recommend."</Li>
      <Li><strong style={{color:'var(--text-primary)'}}>Recommendation → Close:</strong> "The ROI math is pretty clear. Want to get this started?"</Li>
    </ul>

    <NotesPad storageKey="notes_discovery_call" />
  </div>
);

export default DiscoveryCallPanel;
