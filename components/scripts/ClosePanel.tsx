'use client';

import { Rep, Body, SecH, SubH, PLabel } from '@/components/ui/Typography';

const ClosePanel = () => (
  <div>
    <div style={{marginBottom:'6px'}}><span className="tag">06</span></div>
    <h2 style={{fontSize:'26px',fontWeight:900,color:'var(--text-primary)',margin:'8px 0 4px'}}>The Pivot & Financial Close</h2>
    <Body>This is where deals are made or lost. Every line here is deliberate. <strong style={{color:'var(--text-primary)'}}>Do not improvise.</strong></Body>
    <div className="divider" style={{margin:'16px 0'}}/>

    <SecH>The Pivot — Bridging to Full-Stack & the Meet</SecH>
    <Body>When the prospect realizes a basic website isn't enough, or complains about bad leads, pivot them to the CRM/Lead Nurture system and secure the Google Meet.</Body>

    <div className="card" style={{padding:'20px',marginTop:'12px',marginBottom:'12px'}}>
      <SubH>The Lead Quality Pivot</SubH>
      <Rep>You mentioned you were getting poor quality leads in the past. That's usually because most agencies just run ads and walk away. Premmisus is a full-stack agency. We specialize in Meta ads, but more importantly, we implement our own automated CRM directly into your business. It acts almost like an AI subcontractor — we nurture the leads, we do the follow-ups, and we bring a warmed-up client right to your door for you to close.</Rep>
      <PLabel>[The Socratic Confirmation]</PLabel>
      <Rep>How does that sound? Would a system like that sound like it would close the gap tremendously on missed revenue via missed leads? (Wait for them to say "Yeah" or agree).</Rep>
      <PLabel>[The Smooth Meet Close]</PLabel>
      <Rep>How about this? Let's hop into a quick 10-minute call on Google Meet tomorrow so that we can show you exactly how this works on the backend to give you even more confidence. How about 10 AM or 2 PM?</Rep>
    </div>

    <div className="card" style={{padding:'20px',marginBottom:'20px'}}>
      <SubH>The Backlog Pivot</SubH>
      <Rep>Most business owners today are frustrated because ads get customers through the door, but the owner is too busy on a job site to answer the phone, resulting in a backlog of missed revenue. What we do is we follow up with those leads instantly via text and AI right up until they book.</Rep>
      <PLabel>[The Socratic Confirmation]</PLabel>
      <Rep>How does that sound? Would that sound like you would close the gap tremendously on missed revenue via missed leads? (Wait for them to say "Yeah" or agree).</Rep>
      <PLabel>[The Smooth Meet Close]</PLabel>
      <Rep>How about this? Let's hop into a quick 10-minute call on Google Meet tomorrow so that we can show you exactly how this works on the backend to give you even more confidence. How about 10 AM or 2 PM?</Rep>
    </div>

    <SecH>The Financial Close — The $500/$500 Split</SecH>
    <Body>Once the prospect agrees to the website or preview, confidently establish the payment structure. <strong style={{color:'var(--text-primary)'}}>Do not stutter when talking about money.</strong></Body>

    <div className="card-glow" style={{padding:'20px',marginTop:'12px',marginBottom:'12px'}}>
      <SubH>The De-Risked Pitch</SubH>
      <Rep>So here is exactly how we move forward. The total investment for the complete website is $1,500. It is completely de-risked for you. You only pay $500 upfront today so my team can start building the custom preview for you. You don't pay the remaining $1,000 until the website is fully built out, you've reviewed it, and you are 100% happy with it. Once you give us the green light on that preview, we finalize and complete the website for you on a strict 5-day turnaround.</Rep>
    </div>
    <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
      <SubH>The Ladder Upsell (Seeding the Future)</SubH>
      <Rep>From there, you can decide if you'd like to opt into our maintenance plan, but more importantly, you'll get an initial sample of our quality of service and what it's like to work with us. Then you can absolutely take a look at the other no-brainer offers we have to actually generate revenue because in this day and age with AI the earlier one begins implementing these systems, the better. How does all that sound?</Rep>
    </div>
    <div className="card" style={{padding:'20px'}}>
      <SubH>The Maintenance / Invoice Close</SubH>
      <Rep>Once we launch, you own the asset completely. If you want us to handle the ongoing website maintenance — fixing bugs, making any edits you want, and general upkeep — it's just a flat $99 a month. If not, we hand you the keys and we can even give you a quick rundown on how to edit it yourself.</Rep>
      <Rep>I'll send over that invoice to lock that first $500 in so that we can get started on the preview today. What is the best email for that? Or actually, what's the best cell number to text that to? I understand everybody just uses their phone these days.</Rep>
    </div>
  </div>
);

export default ClosePanel;
