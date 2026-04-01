'use client';

import { Rep, Body, SecH, Li } from '@/components/ui/Typography';
import SMSTemplate from '@/components/shared/SMSTemplate';
import NotesPad from '@/components/ui/NotesPad';

const NoShowPanel = () => (
  <div className="print-area" style={{maxWidth:'820px',margin:'0 auto',padding:'32px 28px'}}>

    <div style={{marginBottom:'8px'}}>
      <span className="tag">NO-SHOW RECOVERY</span>
    </div>
    <h2 style={{fontSize:'24px',fontWeight:900,margin:'0 0 6px',letterSpacing:'-.02em'}}>Post-No-Show Recovery</h2>
    <Body>When a booked prospect doesn't show up to the Google Meet. Stay professional. Never passive-aggressive. Three touches, then move on.</Body>

    <div className="card-glow" style={{padding:'16px 20px',marginTop:'16px',marginBottom:'4px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div className="dot">!</div>
        <p style={{margin:0,fontSize:'14px',color:'#ccc',lineHeight:1.5,fontWeight:600}}>
          The Principle: <span style={{color:'#fff'}}>Don't chase. Replace.</span> <span style={{color:'#888',fontWeight:400}}>But always leave the door open. They no-showed — that's data, not an insult. Fill the slot, keep moving, and let the sequence do its job.</span>
        </p>
      </div>
    </div>

    <div className="divider" style={{margin:'20px 0'}} />

    <SecH>SMS 1 — Immediate (Within 5 Minutes)</SecH>
    <Body>Send within 5 minutes of the no-show. Professional, zero attitude. Give them an easy out and an easy reschedule.</Body>
    <SMSTemplate title="No-Show Recovery — Immediate" timing="Within 5 min">
      Hey [Name], I was just on our Google Meet — looks like something came up. No worries at all, I know how it goes when you're running a business. Want to reschedule for later today or tomorrow? I've still got everything ready for you.
    </SMSTemplate>

    <div style={{height:'16px'}} />

    <SecH>SMS 2 — 24-Hour Follow-Up</SecH>
    <Body>One day later. Brief. Reference what you had prepared — remind them there's value waiting.</Body>
    <SMSTemplate title="No-Show Recovery — 24 Hours" timing="Next day">
      Hey [Name], just circling back on yesterday's call. I've still got your [preview site / notes / proposal] ready to go. Would [specific day] at [specific time] work better for a quick 15-minute walkthrough?
    </SMSTemplate>

    <div style={{height:'16px'}} />

    <SecH>SMS 3 — 72-Hour Final Touch</SecH>
    <Body>Last contact. Clean, warm, no pressure. Leave the door open and move on.</Body>
    <SMSTemplate title="No-Show Recovery — Final" timing="72 hours later">
      Last one from me, [Name]. The [preview / proposal] is still here whenever the timing is right. No pressure at all — hope business is going well. You've got my number if anything changes.
    </SMSTemplate>

    <div className="divider" style={{margin:'24px 0'}} />

    <SecH>No-Show Protocol</SecH>
    <ul style={{padding:0,margin:0}}>
      <Li><strong style={{color:'#fff'}}>Stay on the call for 5 minutes</strong> — they might be running late. Don't leave at the 1-minute mark.</Li>
      <Li><strong style={{color:'#fff'}}>Send SMS 1 while you're still at your desk</strong> — timing matters. Immediate = professional, not desperate.</Li>
      <Li><strong style={{color:'#fff'}}>Log the no-show in the CRM</strong> — update the lead status. This is data for your pipeline.</Li>
      <Li><strong style={{color:'#fff'}}>Book a replacement call immediately</strong> — open that slot up and fill it. Volume solves no-shows.</Li>
      <Li><strong style={{color:'#fff'}}>After SMS 3, stop all outreach</strong> — if they come back, great. If not, they were never your client.</Li>
      <Li><strong style={{color:'#fff'}}>Same-day confirmation texts</strong> — prevent no-shows by confirming the morning of every booked call.</Li>
    </ul>

    <div style={{height:'16px'}} />

    <SecH>Prevention — Same-Day Confirmation</SecH>
    <Body>Send this the morning of every booked discovery call. Cuts no-show rate in half.</Body>
    <SMSTemplate title="Morning-Of Confirmation" timing="Morning of call">
      Hey [Name], just confirming our call today at [time]. Here's the Google Meet link: [link]. Looking forward to showing you what we put together for [Business Name]. See you soon.
    </SMSTemplate>

    <NotesPad storageKey="notes_noshow_recovery" />
  </div>
);

export default NoShowPanel;
