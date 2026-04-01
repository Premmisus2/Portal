'use client';

import { Rep, Body, SecH, SubH } from '@/components/ui/Typography';

const HooksPanel = () => (
  <div>
    <div style={{marginBottom:'6px'}}><span className="tag">03</span></div>
    <h2 style={{fontSize:'26px',fontWeight:900,color:'#fff',margin:'8px 0 4px'}}>Verbatim Hooks</h2>
    <Body>Use these exact psychological triggers to de-risk the offer and build trust.</Body>
    <div className="divider" style={{margin:'16px 0'}}/>

    <SecH>Category 1 — Who We Are (The Full-Stack Premmisus Edge)</SecH>
    <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The Full-Stack Differentiator</SubH>
        <Rep>Most guys calling you are just web designers or ad guys. Premmisus is a full-stack agency. We engineer the site, we run the Meta ads, and we handle the CRM backend so you aren't piecing together five different systems.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The Asset Ownership Hook</SubH>
        <Rep>A lot of agencies will try to 'own' your website or hold your domain hostage. With us, you own this asset 100%. We build it, we hand over the keys, and we are just here to maintain and scale it with you if you decide to go with the 'ultra simple' website management.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The "AI Subcontractor" Pivot</SubH>
        <Rep>We aren't here to just 'generate' leads and walk away. We act like an AI subcontractor that works inside your business to nurture those leads right up to the point where they are ready to buy.</Rep></div>
    </div>

    <SecH>Category 2 — How We Help Their Business (Lead Nurturing & Speed)</SecH>
    <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The 30-Second Rule</SubH>
        <Rep>If you don't answer a lead in 5 minutes, your chance of closing them drops by 80%. Our infrastructure responds to your customers in under 30 seconds via AI, so you never lose another job to a competitor while you're busy working.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>Solving the Backlog</SubH>
        <Rep>Most business owners are frustrated because ads get customers through the door, but the owner is too busy on a job site to answer the phone. Our system follows up with those leads instantly via text so your pipeline never stalls.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The SEO / Intent Hook</SubH>
        <Rep>We don't just design a pretty site; we engineer it for local search intent. We make sure you are the very first name they see when someone in your area needs your service.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The Owner's Freedom</SubH>
        <Rep>We handle the CRM and the automations completely. We bring the warmed-up client directly to your door, so you can just focus on the actual business of fulfilling the jobs.</Rep></div>
    </div>

    <SecH>Category 3 — The "Value Up Front" & Performance Guarantee</SecH>
    <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The Discounted Entry / No-Brainer</SubH>
        <Rep>We believe in providing as much value as possible upfront. We are going to build you a high-converting website at a tremendous discount with absolutely zero long-term commitment. It's completely de-risked for you.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The $500/$500 Split</SubH>
        <Rep>We have a 100% satisfaction guarantee. You only pay a small setup fee to kick off the build, but you do not pay the rest until the site is live, finished, and you love it. That is how we operate.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The "Ladder" Upsell Seed</SubH>
        <Rep>There are no hostage situations and no crazy retainers. We prove our worth with this first step. Once you're fully satisfied and seeing the value, you can choose to climb our ladder into the full lead-generation system, but only when you're ready.</Rep></div>
      <div className="card" style={{padding:'18px 20px'}}><SubH>The Performance Ad Guarantee</SubH>
        <Rep>When you are ready to run ads, we operate strictly on a performance basis. You fund the ad spend, of course, but you will not pay us our management cut until we actually bring paying clients through your door.</Rep></div>
    </div>

    <div className="card-glow" style={{padding:'16px 20px'}}>
      <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'#00F0FF',margin:'0 0 8px'}}>Add to the End of Most Hooks Above</p>
      <Rep>How does that sound? When would you be available to hop on a 10- or 15-minute call so that we can show you how we do so?</Rep>
    </div>
  </div>
);

export default HooksPanel;
