'use client';

import { Rep, Body, SecH, Li } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const VoicemailPanel = () => (
  <div className="print-area" style={{maxWidth:'820px',margin:'0 auto',padding:'32px 28px'}}>

    <div style={{marginBottom:'8px'}}>
      <span className="tag">VOICEMAIL SCRIPTS</span>
    </div>
    <h2 style={{fontSize:'24px',fontWeight:900,margin:'0 0 6px',letterSpacing:'-.02em'}}>Voicemail Templates</h2>
    <Body>Every voicemail is under 20 seconds. State your name and company in the first 5 seconds. Always end with a reason for them to call back or respond to the text you're about to send.</Body>

    <div className="divider" style={{margin:'20px 0'}} />

    <SecH>VM 1 — First Cold Call (No Preview)</SecH>
    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
      <span className="tag" style={{fontSize:'9px'}}>15-20 SEC</span>
      <span style={{fontSize:'11px',color:'#555',fontWeight:600}}>No preview site built yet</span>
    </div>
    <Rep>
      Hey [Name], it's [Your Name] from Premmisus. I was looking at your online presence and noticed a couple things that are costing you leads — nothing major, but it's money on the table. I'm going to shoot you a quick text with what I found. If it makes sense, I'd love 10 minutes to walk you through it. Talk soon.
    </Rep>
    <div style={{marginTop:'6px'}}>
      <Body><strong style={{color:'#fff'}}>Why it works:</strong> "Costing you leads" creates urgency without being salesy. The text follow-up gives them a low-friction way to engage.</Body>
    </div>

    <div style={{height:'16px'}} />

    <SecH>VM 2 — First Cold Call (With Preview)</SecH>
    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
      <span className="tag" style={{fontSize:'9px'}}>15-20 SEC</span>
      <span style={{fontSize:'11px',color:'#555',fontWeight:600}}>Preview site already built</span>
    </div>
    <Rep>
      Hey [Name], it's [Your Name] from Premmisus. I actually built a custom website preview for [Business Name] — your branding, your services, the whole thing. It's just a preview, completely free, no strings. I'm going to text you the link right now. Take a look and let me know what you think.
    </Rep>
    <div style={{marginTop:'6px'}}>
      <Body><strong style={{color:'#fff'}}>Why it works:</strong> "I built something for you" is impossible to ignore. Nobody else in the market does this. Massive curiosity — they WILL look at the link.</Body>
    </div>

    <div style={{height:'16px'}} />

    <SecH>VM 3 — Follow-Up (After No Answer)</SecH>
    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
      <span className="tag" style={{fontSize:'9px'}}>10-15 SEC</span>
      <span style={{fontSize:'11px',color:'#555',fontWeight:600}}>Second or third attempt</span>
    </div>
    <Rep>
      Hey [Name], it's [Your Name] from Premmisus again. I don't want to be that annoying sales guy, so this'll be my last voicemail. I sent you a text the other day — if anything in there caught your eye, just shoot me a reply. Either way, hope business is going well.
    </Rep>
    <div style={{marginTop:'6px'}}>
      <Body><strong style={{color:'#fff'}}>Why it works:</strong> "Last voicemail" removes pressure. "Hope business is going well" leaves warmth. They often call back because you stopped chasing.</Body>
    </div>

    <div style={{height:'16px'}} />

    <SecH>VM 4 — Callback (They Requested It)</SecH>
    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
      <span className="tag" style={{fontSize:'9px'}}>10-15 SEC</span>
      <span style={{fontSize:'11px',color:'#555',fontWeight:600}}>Returning their call</span>
    </div>
    <Rep>
      Hey [Name], it's [Your Name] from Premmisus — returning your call from earlier. I've got your info pulled up and ready to go. Give me a ring back when you get a chance, or just reply to my text and we'll find a time. Talk soon.
    </Rep>
    <div style={{marginTop:'6px'}}>
      <Body><strong style={{color:'#fff'}}>Why it works:</strong> "I've got your info pulled up" signals you're prepared and professional. Two response paths (call or text) maximizes callback rate.</Body>
    </div>

    <div className="divider" style={{margin:'24px 0'}} />

    <SecH>Voicemail Rules</SecH>
    <ul style={{padding:0,margin:0}}>
      <Li>Name + company in the first 5 seconds — every single time</Li>
      <Li>Never pitch on a voicemail. Tease value, create curiosity, get them to respond</Li>
      <Li>Always follow up with a text immediately after leaving the voicemail</Li>
      <Li>Smile when you talk — they can hear it in your voice</Li>
      <Li>Stand up when you record. Your energy changes</Li>
      <Li>If you've left 2 voicemails with no response, stop calling. The texts and emails do the rest</Li>
    </ul>

    <NotesPad storageKey="notes_voicemail" />
  </div>
);

export default VoicemailPanel;
