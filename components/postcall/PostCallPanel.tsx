'use client';

import { Rep, Body, SecH } from '@/components/ui/Typography';
import SMSTemplate from '@/components/shared/SMSTemplate';
import BookingKit from '@/components/postcall/BookingKit';

const PostCallPanel = () => (
  <div>
    <div style={{marginBottom:'6px'}}><span className="tag">07</span></div>
    <h2 style={{fontSize:'26px',fontWeight:900,color:'var(--text-primary)',margin:'8px 0 4px'}}>Post-Call Protocols</h2>
    <Body>Execution after the call is what separates closers from order-takers.</Body>
    <div className="divider" style={{margin:'16px 0'}}/>

    <BookingKit />
    <div className="divider" style={{margin:'16px 0'}}/>

    <SecH>The "Anti-Email" SMS Templates</SecH>
    <Body>If the prospect is on a job site or driving, <strong style={{color:'var(--text-primary)'}}>do not let them say "Just send me an email."</strong> Pivot to SMS with a 30-second screen record.</Body>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'12px',marginTop:'14px',marginBottom:'24px'}}>
      <SMSTemplate title='The "Link Drop"' timing="Send immediately after hanging up">Hey [Name], it's [Your Name] from Premmisus. Here is that custom site preview I mentioned on the phone. Take a look at the [Specific Feature, e.g., 'mobile lead capture'] — that's what's going to stop your leads from bouncing to competitors. Let me know when you have 2 minutes to review: [INSERT LINK]</SMSTemplate>
      <SMSTemplate title='The "Nudge"' timing="Sent 4 hours later if no reply">Just making sure you got that link. I'm reviewing this build with my Director, Elliott, in an hour and wanted to see if you had any notes before we finalize the local SEO structure on our end.</SMSTemplate>
    </div>

    <SecH>The Handoff & 5-Day Protocol</SecH>
    <Body>Once you get the verbal "Yes," execute these three steps <strong style={{color:'var(--text-primary)'}}>flawlessly.</strong></Body>
    <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'14px'}}>
      <div className="card-glow" style={{padding:'20px'}}>
        <div style={{display:'flex',gap:'14px',alignItems:'flex-start'}}>
          <span className="dot" style={{flexShrink:0}}>1</span>
          <div style={{flex:1}}>
            <p style={{margin:'0 0 10px',fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>The Google Meet Lock-In</p>
            <Rep>Perfect. The next step is a quick 10-minute onboarding call with one of our system experts. He is going to show you the actual backend of how this AI responds to your leads so you can see the engine working. Does tomorrow morning or afternoon work better for you?</Rep>
          </div>
        </div>
      </div>
      <div className="card-glow" style={{padding:'20px'}}>
        <div style={{display:'flex',gap:'14px',alignItems:'flex-start'}}>
          <span className="dot" style={{flexShrink:0}}>2</span>
          <div style={{flex:1}}>
            <p style={{margin:'0 0 10px',fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Asset Collection — The 5-Day Clock</p>
            <Rep>To ensure we hit our 5-day turnaround promise, I need two things from you right now. Can you text or email me your highest-resolution logo and 3 to 4 high-quality photos of your recent work? As soon as I have those, the 5-day clock starts.</Rep>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:'20px'}}>
        <div style={{display:'flex',gap:'14px',alignItems:'flex-start'}}>
          <span className="dot" style={{flexShrink:0}}>3</span>
          <div style={{flex:1}}>
            <p style={{margin:'0 0 10px',fontWeight:700,color:'var(--text-primary)',fontSize:'15px'}}>Internal Comm — The Ping</p>
            <p style={{color:'var(--text-tertiary)',fontSize:'13px',margin:'0 0 10px'}}>Ping Elliott in the internal chat with the following format:</p>
            <div style={{background:'var(--accent-glow-04)',border:'1px solid var(--accent-glow-15)',borderRadius:'8px',padding:'14px 16px',fontFamily:'monospace'}}>
              <p style={{color:'var(--accent-ink)',fontSize:'13px',margin:'0 0 6px',fontWeight:600}}>// Internal Ping Template</p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0'}}>Lead Name / Company: <span style={{color:'var(--text-muted)'}}>___________</span></p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0'}}>Niche: <span style={{color:'var(--text-muted)'}}>___________</span></p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0'}}>Pain Point Uncovered: <span style={{color:'var(--text-muted)'}}>e.g., "Hates current Meta Ads, leads are low quality"</span></p>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0'}}>Next Step: <span style={{color:'var(--text-muted)'}}>e.g., "Meet booked for 2 PM Tuesday / Invoice ready to send"</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PostCallPanel;
