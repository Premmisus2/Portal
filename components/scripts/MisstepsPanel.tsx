'use client';

import { Rep, Body, PLabel, IfBlock } from '@/components/ui/Typography';

const MisstepsPanel = () => (
  <div>
    <div style={{marginBottom:'6px'}}><span className="tag">05</span></div>
    <h2 style={{fontSize:'26px',fontWeight:900,color:'#fff',margin:'8px 0 4px'}}>Misstep Corrections</h2>
    <Body>When the call goes off-track, use these recovery lines to re-establish control and momentum.</Body>
    <div className="divider" style={{margin:'16px 0'}}/>

    <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ff4444',boxShadow:'0 0 8px rgba(255,68,68,.5)',flexShrink:0}}/>
        <span className="tag-red">Correction 1 — Never Freeze on Money</span>
      </div>
      <div className="mistake-block"><span className="mistake-label">The Mistake</span>
        <p className="mistake-text">Saying "Okay, understood, bye" when they say they have no budget.</p></div>
      <p style={{color:'#555',fontSize:'11px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',margin:'10px 0 4px'}}>The Protocol — Use This Exact Flow:</p>
      <Rep>I totally get it. Cash flow is king. That's precisely why we don't operate on massive retainers without showing you exactly what we can do first.</Rep>
      <PLabel>[The Value Contrast]</PLabel>
      <Rep>A traditional agency will charge you $3,000 to $50,000 for a website. We build you a fully custom, SEO-optimized, revenue-generating website for $1,500. That is an extreme discount for a premium asset.</Rep>
      <PLabel>[The De-Risked Split]</PLabel>
      <Rep>We split that up so there is no massive upfront risk: you only pay $500 down to get the build started, and you pay the remaining $1,000 only once it's 100% completed and you are satisfied.</Rep>
      <PLabel>[The Ladder Upsell]</PLabel>
      <Rep>After you've experienced our service and see the quality of our work, you can decide if you want to entertain or even just learn more about the offers up our ladder that actually generate the leads. And for those, you don't really pay us our cut until we generate you more revenue.</Rep>
      <PLabel>[The Tie-Down]</PLabel>
      <Rep>Does that change the conversation?</Rep>
    </div>

    <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ff4444',boxShadow:'0 0 8px rgba(255,68,68,.5)',flexShrink:0}}/>
        <span className="tag-red">Correction 2 — Never Sound Desperate</span>
      </div>
      <div className="mistake-block"><span className="mistake-label">The Mistake</span>
        <p className="mistake-text">Saying "Wait, but you haven't heard my offer!" when they try to hang up.</p></div>
      <p style={{color:'#555',fontSize:'11px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',margin:'10px 0 4px'}}>The Protocol — Use This Exact Flow:</p>
      <PLabel>[The Playful Challenge]</PLabel>
      <Rep>Oh, wow. So you're telling me you guys are completely booked to maximum capacity for the entire year already?</Rep>
      <IfBlock label="If they say 'Yep' to blow you off">
        <PLabel>[The Margin Pivot]</PLabel>
        <Rep>That is a great problem to have. But let me ask you this: are you booked out with your highest-margin, premium jobs, or has your team exhausted their capacity on lower-ticket jobs just to stay busy?</Rep>
      </IfBlock>
      <IfBlock label="If they say 'No…'">
        <Rep>Let me ask you this then: how are your bookings split between high-margin, premium jobs, and low-quality quantity jobs?</Rep>
        <Body>Wait for a response then continue the pitch.</Body>
      </IfBlock>
      <PLabel>[The Discovery Question]</PLabel>
      <Rep>Let me ask you, what do you guys normally charge on average for your ideal, premium job? (Wait for them to answer with their number).</Rep>
      <PLabel>[The Optimization Reframe]</PLabel>
      <Rep>Perfect. Because what we build isn't about getting you more work when you're already full. It's about implementing AI to filter out the tire-kickers so you can cherry-pick those [Insert their number] jobs. You work the exact same amount of hours, but your profit margins double because you stop wasting time on lower-quality stuff.</Rep>
      <PLabel>[The Final Hook]</PLabel>
      <Rep>If you are already at maximum capacity, now is the exact time you need to optimize, not plateau. Are you guys currently using AI to filter out those lower-quality leads, or are you still answering every single call manually?</Rep>
    </div>

    <div className="card" style={{padding:'20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ff4444',boxShadow:'0 0 8px rgba(255,68,68,.5)',flexShrink:0}}/>
        <span className="tag-red">Correction 3 — Never Pitch-Dump</span>
      </div>
      <div className="mistake-block"><span className="mistake-label">The Mistake</span>
        <p className="mistake-text">Rambling for 60 seconds straight without letting the prospect speak, which instantly triggers their "salesman defense."</p></div>
      <p style={{color:'#555',fontSize:'11px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',margin:'10px 0 4px'}}>The Protocol — Use This Exact Flow:</p>
      <PLabel>[The Sophisticated Interrupt]</PLabel>
      <Rep>Hi [Name], I know I'm an uninvited guest right now, but I'm looking at your current online setup. Being a specialist in social media marketing and AI, I actually noticed a couple of things that I believe could help you significantly increase your profit. These are actually the exact same systems we've implemented for a couple of other businesses in your niche as well. Do you have exactly 30 seconds for me to explain, or should I just hang up on myself?</Rep>
      <p style={{color:'#555',fontSize:'12px',fontStyle:'italic',margin:'6px 0 10px',paddingLeft:'4px'}}>Wait for their response. Let the silence and the contrast do the heavy lifting.</p>
      <IfBlock label="Scenario A: They chuckle or say 'Okay, you have 30 seconds'">
        <Rep>I appreciate it. I have your website open right now. It looks clean, but right now it's acting more like a digital brochure than a lead engine. If a premium client landed there at 2:00 PM today while you're busy on a job site... is there a system to instantly capture and text them back? Do you guys have that? (Wait for their response).</Rep>
        <PLabel>[The Industry Reality]</PLabel>
        <Rep>In most service-based industries, you often find the first company to respond wins the job, am I right? I mean, maybe barring certain premium clients who are looking for the top dog. Which is even better because if you want to become a top dog in your industry, you know this better than anyone, as the business owner, you have to be able to focus on the growth and improvement of your business for an extended period of time.</Rep>
        <PLabel>[The Partnership Bridge]</PLabel>
        <Rep>That's why a good marketing agency alongside somebody like you — a professional operator — can team up to ensure growth.</Rep>
        <PLabel>[The Pain Point Question]</PLabel>
        <Rep>Do you think you're missing out on high-margin jobs sometimes because a competitor might answer faster or you might miss a response? (Wait for them to agree or say, "Yeah, that happens sometimes.")</Rep>
        <PLabel>[The "Pre-Built" Pivot]</PLabel>
        <Rep>That's exactly why I called. I actually preemptively built a preview of an AI-backed infrastructure for you that automatically responds to those leads in under 30 seconds. I'm not asking for a commitment today. Can I just text you a quick screen record so you can see the difference for yourself?</Rep>
      </IfBlock>
    </div>
  </div>
);

export default MisstepsPanel;
