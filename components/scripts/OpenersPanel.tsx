'use client';

import { Rep, Body, SubH, PLabel, IfBlock } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const OpenersPanel = () => (
  <div>
    <div style={{marginBottom:'6px'}}><span className="tag">02</span></div>
    <h2 style={{fontSize:'26px',fontWeight:900,color:'#fff',margin:'8px 0 4px'}}>The Openers — Entry Matrices</h2>
    <Body>Never freestyle the opening. Assess the prospect's digital footprint before the call and use one of these four calculated entry points. <strong style={{color:'#fff'}}>Always wait for their response when prompted.</strong></Body>
    <div className="divider" style={{margin:'16px 0'}}/>

    <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
        <span className="dot">1</span>
        <div>
          <p style={{margin:0,fontWeight:700,color:'#fff',fontSize:'15px'}}>The "Gap / Improvement" Approach</p>
          <p style={{margin:0,color:'#555',fontSize:'12px'}}>They have a site, but it's weak</p>
        </div>
      </div>
      <Rep>Hi, my name is [Your Name] from Premmisus. How are you doing today? (Wait for response). Great. This is a cold call, but it is a well-researched one. I was taking a look at your website and some of your profiles, and I noticed a gap where you guys might be leaving money on the table. Would you have a moment to see what I've put together for you?</Rep>
    </div>

    <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
        <span className="dot">2</span>
        <div>
          <p style={{margin:0,fontWeight:700,color:'#fff',fontSize:'15px'}}>The Meta / GSA Approach</p>
          <p style={{margin:0,color:'#555',fontSize:'12px'}}>They have a presence, but no ads</p>
        </div>
      </div>
      <Rep>Hi, how are you today? (Wait for response). Good. I'll get straight to the point because I respect your time. My name is [Your Name] from Premmisus. I was taking a look at your website and Instagram, and I noticed you guys aren't running any Meta ads or Google Local Service Ads. May I ask why?</Rep>
      <IfBlock label="If they say: 'We use GSA'">
        <Rep>That's great that you're running GSA. It means you understand the value of lead flow. But you're missing the second half of the equation...</Rep>
      </IfBlock>
      <IfBlock label="If they say: 'Meta doesn't work'">
        <Rep>I hear that all the time, and it's actually not true. Meta ads work exceptionally well — we specialize in them. The issue isn't the platform; it's that the last agency you used probably didn't know how to run them, and more importantly, they didn't offer the CRM and lead nurturing to actually convert those clicks into booked jobs. We do.</Rep>
      </IfBlock>
    </div>

    <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
        <span className="dot">3</span>
        <div>
          <p style={{margin:0,fontWeight:700,color:'#fff',fontSize:'15px'}}>The "0.5 Base" Approach</p>
          <p style={{margin:0,color:'#555',fontSize:'12px'}}>No website, or completely broken site</p>
        </div>
      </div>
      <Rep>Hi, [Name], it's [Your Name] with Premmisus. I'll be brief. I was searching for [Niche/Service] in your area, and you are virtually invisible online right now. Your competitors are eating up all the local search traffic.</Rep>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',margin:'8px 0'}}>
        <div style={{background:'rgba(0,240,255,.04)',border:'1px solid rgba(0,240,255,.1)',borderRadius:'8px',padding:'10px 12px'}}>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#00F0FF',margin:'0 0 4px'}}>Option 1</p>
          <p style={{color:'#ccc',fontSize:'13px',fontStyle:'italic',margin:0}}>"When would you have a moment to discuss how we can get a professional website live for you by next week?"</p>
        </div>
        <div style={{background:'rgba(0,240,255,.04)',border:'1px solid rgba(0,240,255,.1)',borderRadius:'8px',padding:'10px 12px'}}>
          <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#00F0FF',margin:'0 0 4px'}}>Option 2</p>
          <p style={{color:'#ccc',fontSize:'13px',fontStyle:'italic',margin:0}}>"Is there a reason why you guys don't have a website or aren't online?"</p>
        </div>
      </div>
      <IfBlock label="If they say: 'I've got somebody working on it'">
        <Rep>Oh, well I've actually put together a preview for you, if you'd like to check it out.</Rep>
      </IfBlock>
      <IfBlock label="If you haven't built a preview yet">
        <Rep>I can put together a preview for you. It will take me a couple of hours and you can decide if you want me to proceed and finish it. No commitment right now. Just a website, which will increase revenue, proven.</Rep>
      </IfBlock>
    </div>

    <div className="card-glow" style={{padding:'20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
        <span className="dot">4</span>
        <div>
          <p style={{margin:0,fontWeight:700,color:'#fff',fontSize:'15px'}}>The "Pre-Built Preview" Approach</p>
          <p style={{margin:0,color:'#00F0FF',fontSize:'12px',fontWeight:600}}>The Warmest Entry — Use whenever possible</p>
        </div>
      </div>
      <Rep>Hi [Name], it's [Your Name] with Premmisus. I know you're busy, so I'll be quick. I noticed a few critical flaws on your current website, so I actually went ahead and preemptively built a new website preview for you. I just want to send you the link so you can see the difference. Is this a good number to text that over to?</Rep>
    </div>
  </div>
);

export default OpenersPanel;
