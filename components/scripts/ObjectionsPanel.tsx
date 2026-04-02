'use client';

import { useState } from 'react';
import { Rep, Body, SubH, PLabel, IfBlock } from '@/components/ui/Typography';

const OBJECTIONS = [
  { id: 1, phrase: "We're too busy right now / We're fully booked." },
  { id: 2, phrase: "We already have a guy / We have an in-house team." },
  { id: 3, phrase: "We're not ready financially right now / We're not at that level yet." },
  { id: 4, phrase: "Meta/Facebook ads don't work for us / We tried Meta and it was a waste of money." },
  { id: 5, phrase: "I get all my work from referrals / word of mouth." },
  { id: 6, phrase: "I tried marketing / an agency before and got burned." },
  { id: 7, phrase: "How did you get my number?" },
  { id: 8, phrase: "What makes you different from every other agency calling me?" },
  { id: 9, phrase: "How long have you been doing this? / Are you new?" },
  { id: 10, phrase: "I don't believe in AI / I don't trust technology." },
];

const ObjectionsPanel = () => {
  const [query, setQuery] = useState('');
  const q = query.toLowerCase().trim();
  const visible = q ? OBJECTIONS.filter(o => o.phrase.toLowerCase().includes(q)) : OBJECTIONS;
  const visibleIds = new Set(visible.map(o => o.id));

  return (
    <div>
      <div style={{marginBottom:'6px'}}><span className="tag">04</span></div>
      <h2 style={{fontSize:'26px',fontWeight:900,color:'#fff',margin:'8px 0 4px'}}>Objection Handling</h2>
      <Body>Every objection is a question in disguise. Find the real concern — then bridge back to close.</Body>

      <div className="objection-search-wrap" style={{margin:'16px 0'}}>
        <svg className="objection-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="objection-search-field"
          type="text"
          placeholder="Search objections..."
          aria-label="Search objections"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="divider" style={{margin:'0 0 16px'}}/>

      {visible.length === 0 && (
        <div className="objection-no-match">No matching objections for &ldquo;{query}&rdquo;</div>
      )}

      {visibleIds.has(1) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 1</span>
          <SubH>&ldquo;We&rsquo;re too busy right now / We&rsquo;re fully booked.&rdquo;</SubH>
          <Rep>Amazing to hear, what a great problem to have. That is exactly why I&rsquo;m calling. Being busy is great, but let me ask you 1 question — are you booked up with $500 repairs or $5,000 installs? (adjust accordingly based on the business).</Rep>
          <Rep>Our websites are built with smart qualifying forms and an AI system where before a lead ever reaches your cell phone or email, our system asks them exactly what they need and weeds out the cheap price-shoppers. It acts like a digital bouncer, so you only spend your time talking to high-margin, premium clients. Would something like this suit the &lsquo;Good&rsquo; problem you&rsquo;re having or is this completely irrelevant?</Rep>
          <IfBlock label="If yes"><Rep>Should I send over the preview to show you what that looks like?</Rep></IfBlock>
          <IfBlock label="If no"><Rep>Ok well last question… As you can tell, our system is very thorough and powerful, thanks to the use of AI. Would you mind sharing with me any problems that you might have to see if we can solve that for you, potentially?</Rep></IfBlock>
        </div>
      )}

      {visibleIds.has(2) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 2</span>
          <SubH>&ldquo;We already have a guy / We have an in-house team.&rdquo;</SubH>
          <Rep>That&rsquo;s good that you&rsquo;re already taking your marketing seriously. But let me ask you: how long has that specific approach been working for you? (Wait for answer). The reason I reached out is because my team identified a massive blindspot your current guy is missing.</Rep>
          <Rep>Most &lsquo;ad guys&rsquo; or web designers are great at generating traffic, but they completely drop the ball on lead decay. If your current system isn&rsquo;t using an automated CRM to text those leads back in under 30 seconds, you&rsquo;re bleeding high-ticket jobs to competitors who answer faster while you&rsquo;re out on a job site.</Rep>
          <Rep>Are you open to a second set of eyes to see how we plug that hole, or are you 100% satisfied with your current lead quality?</Rep>
        </div>
      )}

      {visibleIds.has(3) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 3</span>
          <SubH>&ldquo;We&rsquo;re not ready financially right now / We&rsquo;re not at that level yet.&rdquo;</SubH>
          <Rep>I completely understand, and to be honest, that&rsquo;s exactly why I&rsquo;m calling. We work with massive, established businesses, but we also work with guys who are just building their foundation. Because you&rsquo;re focused on growing to that next level, bear with me for just 60 seconds.</Rep>
          <PLabel>[The Tech Reality Pivot]</PLabel>
          <Rep>Because of the day and age we live in with AI and new technology, we can build you a revenue-enhancing website and a lead system for a fraction of what it used to cost. It&rsquo;s not because we&rsquo;re &lsquo;cheap&rsquo; — we&rsquo;re just transparent about the fact that we have tools at our disposal that agencies just didn&rsquo;t have 10 years ago.</Rep>
          <PLabel>[The De-Risked Offer]</PLabel>
          <Rep>To prove it, we offer a test run. We will actually build you a custom preview of the website before we charge you a single dime. You can take a step back, look at it, and decide if you even want to go down this route at all, with absolutely zero commitment.</Rep>
          <PLabel>[The Educational Close]</PLabel>
          <Rep>Look, even if you decide not to work with us, you&rsquo;ll at least know exactly what a modern, full-stack setup should look like so you don&rsquo;t get scammed by the next agency that calls you. Right information can&rsquo;t hurt. I think that&rsquo;s worth a minute of your time to look at, no?</Rep>
        </div>
      )}

      {visibleIds.has(4) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 4</span>
          <SubH>&ldquo;Meta/Facebook ads don&rsquo;t work for us / We tried Meta and it was a waste of money.&rdquo;</SubH>
          <Rep>I hear that a lot. But let me ask you: Does Meta actually not work for your industry, or did you just have a bad experience with whoever was running it in the past? (Wait for response).</Rep>
          <PLabel>[The Reality Check]</PLabel>
          <Rep>Look, when you have an agency that specializes specifically in your niche, and you combine that with AI and the new Andromeda updates on the backend, Meta is an absolute power tool. Just because a previous generalist agency, a friend, or an in-house guy tried it and failed, please don&rsquo;t let true specialists get a bad name for that. You wouldn&rsquo;t blame the hammer if the carpenter didn&rsquo;t know how to swing it.</Rep>
          <PLabel>[The Qualifying Pivot]</PLabel>
          <Rep>With that being said, have you ever actually had an agency that specializes in Meta and AI lead-nurturing build out a custom system for you before?</Rep>
          <IfBlock label="If they say No">
            <Rep>Exactly. That&rsquo;s why I want to show you the difference. Let me send you the preview of the infrastructure I already built for you. It takes 60 seconds to look at, and it will show you exactly what a specialized system looks like compared to what you had before. Is this the best number to text it to?</Rep>
          </IfBlock>
        </div>
      )}

      {visibleIds.has(5) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 5</span>
          <SubH>&ldquo;I get all my work from referrals / word of mouth.&rdquo;</SubH>
          <Rep>That&rsquo;s honestly one of the best signs of a great business. If people are referring you, it means your work speaks for itself — and I&rsquo;d never tell you to stop that. But let me ask you something honest: have you ever had a dry month? Maybe January, maybe a random week in the summer where the phone just... stops?</Rep>
          <PLabel>[The Vulnerability Gap]</PLabel>
          <Rep>Referrals are incredible, but they&rsquo;re unpredictable. You can&rsquo;t control when someone decides to mention your name at a barbecue. What we build is the system that fills the gaps between those referral cycles — so you&rsquo;re never sitting around waiting for the phone to ring. It doesn&rsquo;t replace referrals. It runs alongside them.</Rep>
          <PLabel>[The Amplifier Reframe]</PLabel>
          <Rep>And here&rsquo;s something most people don&rsquo;t think about — our AI system actually makes your referral game stronger. When someone does refer a friend to you and that person calls or texts your business, our system responds in under 30 seconds, qualifies them, and gets them booked in. Right now, if a referral calls you while you&rsquo;re on a job site, what happens? They wait. Maybe they call the next guy. With our system, that referral lead never slips through the cracks.</Rep>
          <Rep>Does that change how you&rsquo;re thinking about it, or are you genuinely booked solid 12 months a year with zero slow periods?</Rep>
          <IfBlock label="If they admit to slow periods">
            <Rep>That&rsquo;s exactly the gap we fill. Would it make sense for me to show you what the system looks like? I can text you a quick preview right now.</Rep>
          </IfBlock>
          <IfBlock label="If they insist they're always booked">
            <Rep>That&rsquo;s amazing. Then the conversation shifts from volume to margin — are all of those referral jobs your highest-ticket, most profitable work? Because our system filters for premium clients specifically. Either way, I respect your time. Can I send you a 30-second preview so you have it in your back pocket for when that first slow week hits?</Rep>
          </IfBlock>
        </div>
      )}

      {visibleIds.has(6) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 6</span>
          <SubH>&ldquo;I tried marketing / an agency before and got burned.&rdquo;</SubH>
          <Rep>I appreciate you being straight with me on that. And honestly, I&rsquo;m not surprised — the agency space is full of guys who overpromise and underdeliver. Before I say anything else, do you mind me asking what specifically went wrong? Was it the results, the communication, the cost, or all of it?</Rep>
          <PLabel>[Wait for their answer — this is gold. Listen carefully.]</PLabel>
          <Rep>That makes sense. And look, I&rsquo;m not going to sit here and tell you &ldquo;we&rsquo;re different&rdquo; because every agency says that. So instead, let me just tell you how we&rsquo;re built and you can judge for yourself.</Rep>
          <PLabel>[The Structural Difference]</PLabel>
          <Rep>First — you own everything we build. Your website, your CRM data, your ad accounts. If you fire us tomorrow, you walk away with all of it. Most agencies hold your site hostage because they built it on their platform. We don&rsquo;t do that. Second — we don&rsquo;t charge you a massive retainer upfront to &ldquo;get started.&rdquo; Our website package is $1,500 total. You pay $500 to start the build, and the remaining $1,000 only when it&rsquo;s done and you&rsquo;re satisfied.</Rep>
          <PLabel>[The Accountability Close]</PLabel>
          <Rep>That&rsquo;s exactly why we built this model — to be the opposite of what burned you. We took every complaint business owners have about agencies and engineered it out. Does that structure at least feel different from what you experienced before?</Rep>
          <IfBlock label="If they're warming up">
            <Rep>Let me do this — I&rsquo;ll send you a preview of the exact system we&rsquo;d build for your business. No commitment, no charge. You can look at it on your own time and decide if it&rsquo;s even worth a conversation. Fair enough?</Rep>
          </IfBlock>
          <IfBlock label="If they're still guarded">
            <Rep>I completely respect that. You got burned and you&rsquo;re protecting your business — that&rsquo;s smart. All I&rsquo;d ask is this: take a look at the preview I send you. It costs you nothing and takes 60 seconds. If it looks like the same garbage you&rsquo;ve seen before, delete it and I&rsquo;ll never call again. But if it looks different — and I think it will — then maybe it&rsquo;s worth a 15-minute conversation. Can I text it to this number?</Rep>
          </IfBlock>
        </div>
      )}

      {visibleIds.has(7) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 7</span>
          <SubH>&ldquo;How did you get my number?&rdquo;</SubH>
          <Rep>Great question. Your business is listed publicly on Google — your Google Business Profile has your phone number right on it. I wasn&rsquo;t doing anything shady, I promise.</Rep>
          <PLabel>[The Immediate Pivot]</PLabel>
          <Rep>But here&rsquo;s the thing — I didn&rsquo;t just find your number. I actually spent time researching your online presence before I called. And I noticed a couple of things that I think are costing you jobs right now. That&rsquo;s the only reason I picked up the phone.</Rep>
          <Rep>I&rsquo;ve got about 30 seconds of value for you if you&rsquo;re open to hearing it. If not, I respect that and I&rsquo;ll let you get back to your day. What do you say?</Rep>
          <IfBlock label="If they say go ahead">
            <Rep>Continue into the cold call opener — pitch the specific blindspot you identified.</Rep>
          </IfBlock>
          <IfBlock label="If they say no / seem annoyed">
            <Rep>Totally fair. I&rsquo;ll tell you what — I&rsquo;ll send you a one-line text with what I found. If it&rsquo;s relevant, you&rsquo;ll know. If it&rsquo;s not, just ignore it. Have a good one.</Rep>
          </IfBlock>
        </div>
      )}

      {visibleIds.has(8) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 8</span>
          <SubH>&ldquo;What makes you different from every other agency calling me?&rdquo;</SubH>
          <Rep>That&rsquo;s a fair question, and you probably get a lot of these calls. So I&rsquo;ll give you three things in 20 seconds and you can decide if it&rsquo;s worth another minute of your time.</Rep>
          <PLabel>[The AI Subcontractor]</PLabel>
          <Rep>First — think of us like an AI subcontractor. You understand subcontractors, right? You bring in a specialist when you need a specific job done. We&rsquo;re that, but for your online presence. We plug in AI systems that respond to every lead in under 30 seconds — while you&rsquo;re on a job site swinging a hammer. No lead sits there waiting for you to call back at 9 PM.</Rep>
          <PLabel>[The Ownership Model]</PLabel>
          <Rep>Second — you own everything we build. Your website, your ad accounts, your data. Most agencies hold your site hostage on their platform so you can&rsquo;t leave. We build it, hand you the keys, and you own it forever. If you fire us, you keep everything.</Rep>
          <PLabel>[The Proof Offer]</PLabel>
          <Rep>Third — I can prove it right now. Can I text you a 30-second screen recording that shows you exactly what the system looks like for a business like yours? You watch it, and if it looks like the same recycled pitch every other agency runs, you tell me to lose your number. But if it looks different — and it will — then we talk for 15 minutes.</Rep>
          <IfBlock label="If they agree to the text">
            <Rep>Perfect. I&rsquo;m sending it now. You&rsquo;ll see exactly what I mean. When&rsquo;s a good time for me to follow up — later today or tomorrow morning?</Rep>
          </IfBlock>
        </div>
      )}

      {visibleIds.has(9) && (
        <div className="card" style={{padding:'20px',marginBottom:'12px'}}>
          <span className="tag-red">Objection 9</span>
          <SubH>&ldquo;How long have you been doing this? / Are you new?&rdquo;</SubH>
          <Rep>I appreciate you asking — it tells me you&rsquo;re serious about who you work with. Let me flip that question on you though: what matters more — how long someone&rsquo;s been doing something, or whether they can show you results right now?</Rep>
          <PLabel>[The Tech Advantage]</PLabel>
          <Rep>Here&rsquo;s the reality: we use technology that literally didn&rsquo;t exist 2 years ago. AI lead-nurturing, automated CRM systems, 30-second response bots. The agencies that have been around for 10 years? They&rsquo;re still running the same playbook from 2015 — build a template website, run some Google Ads, and pray. That&rsquo;s not a system. That&rsquo;s a slot machine.</Rep>
          <PLabel>[The Trades Parallel]</PLabel>
          <Rep>Think about it this way — if a new plumber showed up with the best tools on the market and could diagnose your problem in half the time, would you pick him or the guy who&rsquo;s been doing it for 20 years with a wrench from 1985? The tools matter. And right now, we have tools that nobody else in the Canadian market is using for businesses like yours.</Rep>
          <PLabel>[The Confidence Close]</PLabel>
          <Rep>But look, I don&rsquo;t expect you to take my word for it. That&rsquo;s why we build you a custom preview before you pay us a single dollar. You can see the quality of our work with your own eyes and decide. Does that sound fair?</Rep>
        </div>
      )}

      {visibleIds.has(10) && (
        <div className="card" style={{padding:'20px'}}>
          <span className="tag-red">Objection 10</span>
          <SubH>&ldquo;I don&rsquo;t believe in AI / I don&rsquo;t trust technology.&rdquo;</SubH>
          <Rep>I respect that, and honestly, a lot of the business owners we work with felt the same way before they saw it in action. So let me reframe this for you, because I think there&rsquo;s a misconception here.</Rep>
          <PLabel>[The Customer Experience Reframe]</PLabel>
          <Rep>You&rsquo;re not the one using the AI — your customers are. And to them, it doesn&rsquo;t feel like AI at all. It just feels like great customer service. Let me give you a real example.</Rep>
          <PLabel>[The Concrete Scenario]</PLabel>
          <Rep>It&rsquo;s Sunday night, 9 PM. Someone&rsquo;s basement just flooded and they Google &ldquo;plumber near me.&rdquo; They find your business and send a text. Right now, what happens? Nothing. They wait until Monday, and by then they&rsquo;ve already called three other guys. With our system, they get a friendly, professional response in 30 seconds. It asks them what&rsquo;s going on, gets the details, and books them into your calendar. You wake up Monday morning with a new appointment and a qualified lead sitting in your inbox. You didn&rsquo;t lift a finger.</Rep>
          <PLabel>[The Competitive Advantage Position]</PLabel>
          <Rep>This isn&rsquo;t about replacing you with a robot. It&rsquo;s about making sure that when someone is ready to hire right now, you&rsquo;re the one who answers — not your competitor down the street who also doesn&rsquo;t believe in AI but just happens to pick up the phone faster.</Rep>
          <Rep>Would it help if I just showed you what it looks like? I can send you a 30-second demo — you tell me if it feels like &ldquo;scary technology&rdquo; or if it just feels like a really good receptionist.</Rep>
          <IfBlock label="If they agree">
            <Rep>Perfect. I&rsquo;ll text it over right now. Watch the response speed — that&rsquo;s the part that wins jobs. Is this the best number?</Rep>
          </IfBlock>
          <IfBlock label="If they still resist">
            <Rep>Totally fine. But let me ask you this — do you answer every single call and text that comes into your business, 7 days a week? Because if there are hours where nobody&rsquo;s answering, that&rsquo;s not an AI problem — that&rsquo;s a missed revenue problem. And we solve it. Just something to think about.</Rep>
          </IfBlock>
        </div>
      )}
    </div>
  );
};

export default ObjectionsPanel;
