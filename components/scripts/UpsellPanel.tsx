'use client';

import { Rep, Body, SecH, SubH, PLabel, IfBlock } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const UpsellPanel = () => (
  <div className="print-area" style={{maxWidth:'820px',margin:'0 auto',padding:'32px 28px'}}>

    <div style={{marginBottom:'8px'}}>
      <span className="tag">UPSELL SCRIPT</span>
    </div>
    <h2 style={{fontSize:'24px',fontWeight:900,margin:'0 0 6px',letterSpacing:'-.02em'}}>0.5 → 1.0 Upsell Script</h2>
    <Body>Used 2-4 weeks after a website (Offer 0.5) is delivered and the client is happy. The site is live, they love it — now show them what's missing.</Body>

    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
      <span className="tag" style={{fontSize:'9px'}}>POST-DELIVERY</span>
      <span className="tag" style={{fontSize:'9px'}}>2-4 WEEKS AFTER LAUNCH</span>
      <span className="tag" style={{fontSize:'9px'}}>PHONE OR GOOGLE MEET</span>
    </div>

    <div className="divider" style={{margin:'20px 0'}} />

    <SecH>Step 1 — The Check-In</SecH>
    <PLabel>Open warm. This is a relationship call, not a sales call — yet.</PLabel>
    <Rep>
      Hey [Name], it's [Your Name] from Premmisus. Just wanted to check in — it's been about [X] weeks since we launched your site. How's everything looking? Getting any feedback from customers?
    </Rep>
    <IfBlock label="If they say: 'It looks great, love it'">
      <Rep>
        That's awesome to hear. I've actually been keeping an eye on the back end — the analytics — and I wanted to share something with you.
      </Rep>
    </IfBlock>

    <div style={{height:'16px'}} />

    <SecH>Step 2 — The Data Hook</SecH>
    <PLabel>Lead with data. Numbers don't lie and they position you as the expert.</PLabel>
    <Rep>
      I've been monitoring your site's performance and I noticed something interesting. You're getting [X] visitors per month, your [specific page] is getting the most traffic, and your Google ranking for "[keyword]" has already moved up [X] spots. Let me share what I'm seeing.
    </Rep>
    <div style={{marginTop:'6px'}}>
      <Body><strong style={{color:'#fff'}}>Prep required:</strong> Pull actual analytics before this call — Vercel Analytics, Google Search Console, or whatever tracking is live. Never fake numbers.</Body>
    </div>

    <div style={{height:'16px'}} />

    <SecH>Step 3 — The Gap Introduction</SecH>
    <PLabel>Show them the money they're leaving on the table.</PLabel>
    <Rep>
      Your website is pulling in about [X] visitors a month, which is solid. But right now, you're only capturing about [Y]% of them — meaning [Z]% are leaving without ever contacting you. If your average job is worth $[amount], that's roughly $[dollar figure] in potential revenue walking away every single month.
    </Rep>
    <div style={{marginTop:'6px'}}>
      <Body><strong style={{color:'#fff'}}>Math example:</strong> 200 visitors, 3% conversion = 6 leads. 97% leaving = 194 visitors lost. At $400/job average and 30% close rate, that's ~23 potential jobs = $9,200/month walking away. Use their real numbers.</Body>
    </div>

    <div style={{height:'16px'}} />

    <SecH>Step 4 — The Bridge to Foundation 1.0</SecH>
    <PLabel>Connect the gap to the solution — naturally, not pushy.</PLabel>
    <Rep>
      This is exactly what our Foundation system solves. We layer Meta ads on top of your site to drive targeted traffic — people in [their city] actively searching for [their service]. Then we add Google Ads for the high-intent searches — people Googling "[service] near me" right now. And the piece most agencies miss — our AI follow-up system contacts every single lead in under 30 seconds. While you're on a job site, we're already qualifying and booking for you.
    </Rep>

    <div style={{height:'16px'}} />

    <SecH>Step 5 — The Price Anchor</SecH>
    <PLabel>Frame the investment against what they'd pay otherwise.</PLabel>
    <Rep>
      For context — hiring a marketing person to do even half of this would cost you $3,000-$5,000 a month. And that's one person doing one thing. Foundation is $1,599 a month and it includes everything — Meta ads, Google Ads, CRM, AI follow-up, SEO optimization, and monthly reporting. You already have the website — this is the engine that drives people to it.
    </Rep>

    <div style={{height:'16px'}} />

    <SecH>Step 6 — The Risk Reversal</SecH>
    <PLabel>Remove every reason to say no.</PLabel>
    <Rep>
      And just like the website — you own everything. Your ads account, your CRM data, your leads. If you ever want to leave, you keep it all. We don't hold anything hostage. That's not how we operate.
    </Rep>

    <div className="divider" style={{margin:'24px 0'}} />

    <SecH>Objection Handles</SecH>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>"I'm happy with just the website"</SubH>
      <Rep>
        I get that — and the website is doing its job. But right now it's like having a storefront on a side street with no signs pointing to it. Foundation puts the signs up — Google, Meta, AI follow-up — so people actually find you. The site converts them, but first they have to get there.
      </Rep>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>"That's too expensive"</SubH>
      <Rep>
        I hear you. Let me ask you this — based on your average job value of $[amount], how many extra jobs would it take to cover the $1,599? [Let them answer.] So we need [X] jobs to break even, and everything after that is pure profit. Our clients typically see 15-30 qualified leads per month. The math works.
      </Rep>
    </div>

    <div className="card" style={{padding:'18px 20px',marginTop:'8px'}}>
      <SubH>"Let me think about it"</SubH>
      <Rep>
        Totally fair. What specifically are you weighing? Is it the investment, the timing, or something else? I'd rather address it now than have you sitting on a question.
      </Rep>
      <IfBlock label="If they genuinely need time">
        <Rep>
          No problem at all. I'll send you a breakdown of everything we just talked about — the numbers, the plan, what's included. Let's reconnect [specific day]. I'll put it in the calendar right now so neither of us forgets.
        </Rep>
      </IfBlock>
    </div>

    <NotesPad storageKey="notes_upsell_05_10" />
  </div>
);

export default UpsellPanel;
