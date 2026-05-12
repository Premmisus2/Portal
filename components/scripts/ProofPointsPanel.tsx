'use client';

import { Rep, Body, SecH, SubH, PLabel, Li } from '@/components/ui/Typography';

const ProofPointsPanel = () => (
  <div>
    {/* ── SOCIAL PROOF ── */}
    <div className="card-glow" style={{ padding: '24px 22px', marginTop: '14px' }}>
      <div style={{ marginBottom: '6px' }}><span className="tag">SOCIAL PROOF</span></div>
      <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>Quick-Reference — Proof Points</h2>
      <Body>Pull these mid-call when the prospect needs confidence. Adapt naturally — never read verbatim.</Body>

      <SecH>Trydentt Case Study (Live Client)</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The Cleaning Company Story</SubH>
        <Rep>We built a full-stack system for a cleaning company right here in Canada — custom-coded website, Meta ads driving leads, AI-powered follow-up that contacts every lead within 30 seconds. They went from barely any online presence to a fully automated lead machine.</Rep>
        <PLabel>[Adapt with live metrics as they come in]</PLabel>
        <div className="mistake-block" style={{ marginTop: '8px' }}>
          <span className="mistake-label">UPDATE REQUIRED</span>
          <p className="mistake-text">Replace the above with real Trydentt metrics as they come in: leads per month, cost per lead, average response time, Google review growth (started at 10 reviews, 5.0 stars). Track monthly and update this card.</p>
        </div>
      </div>

      <SecH>Tech Stack Proof Points</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The React Advantage</SubH>
        <Rep>We custom-code every website in React — the same technology used by Netflix, Airbnb, and Instagram. Your competitors are sitting on WordPress templates from 2018. That matters because Google ranks faster, cleaner sites higher. Period.</Rep>
      </div>

      <div className="card" style={{ padding: '18px 20px', marginTop: '8px' }}>
        <SubH>The Speed-to-Lead Advantage</SubH>
        <Rep>Our AI follows up with every single lead in under 30 seconds. Text, email, the works — automatically. The industry average? 42 hours. That is not a typo. Most businesses take almost two full days to respond to a lead. By then, that customer has already called your competitor.</Rep>
      </div>

      <div className="card" style={{ padding: '18px 20px', marginTop: '8px' }}>
        <SubH>The Enterprise Tools Advantage</SubH>
        <Rep>We use the same ad optimization tools and automation platforms that agencies charging ten thousand a month use. The difference is we are not charging you ten thousand a month — we just built the systems smarter.</Rep>
      </div>

      <SecH>Ownership Proof Point</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>You Own Everything</SubH>
        <Rep>Here is what a lot of business owners do not realize until it is too late — most agencies own your website. When you stop paying them, you lose everything. Your site, your content, your SEO rankings — gone. You are starting from scratch. With us, you own every line of code, every image, every domain. Full stop. You walk away tomorrow, you keep everything we built.</Rep>
      </div>

      <SecH>Speed Proof Point</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>5-Day Delivery</SubH>
        <Rep>We deliver your website in five business days. Most agencies take six to twelve weeks. That is not because we cut corners — it is because we built systems that let us move fast without sacrificing quality. You could have leads coming in by next week.</Rep>
      </div>
    </div>

    {/* ── AI SUBCONTRACTOR THREADING ── */}
    <div className="card-glow" style={{ padding: '24px 22px', marginTop: '14px' }}>
      <div style={{ marginBottom: '6px' }}><span className="tag">AI SUBCONTRACTOR</span></div>
      <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>AI Subcontractor Threading — 5 Script Inserts</h2>
      <Body>The "AI subcontractor" metaphor is Premmisus's single strongest positioning concept. These inserts weave it throughout the entire call flow.</Body>

      <SecH>Insert 1 — Opener 3 (0.5 Base / No-Website Businesses)</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <PLabel>[After identifying they have no website]</PLabel>
        <Rep>So right now, every potential customer searching for your service in your area — they cannot find you. You are invisible. What we do is we become your AI subcontractor for everything online. We build you a site that actually generates calls, and then we plug in systems that follow up with every lead automatically — so you never miss a job while you are on-site. Think of it like hiring a digital crew member who works 24/7 and never calls in sick.</Rep>
      </div>

      <SecH>Insert 2 — Hooks Category 1 (Full-Stack Differentiator Upgrade)</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The AI Subcontractor Hook (Replaces generic "Full-Stack" language)</SubH>
        <Rep>Most agencies will build you a website and run some ads — and that is where it ends. You are still the one answering calls, following up on quotes, chasing reviews. We operate differently. Premmisus plugs into your business like an AI subcontractor. We handle lead generation, automated follow-up, appointment booking, review requests — the entire pipeline from ad click to booked job. You just show up and do the work you are good at.</Rep>
      </div>

      <SecH>Insert 3 — Objection Handling: "I Am Too Busy Right Now"</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <PLabel>[When prospect says they are too busy to deal with marketing]</PLabel>
        <Rep>That is exactly why this works. Think of us as a digital subcontractor handling your entire lead pipeline while you are on the job site. You do not have to learn anything, manage anything, or check anything. Our AI picks up leads, qualifies them, books the appointment, and sends you a text with the details. You are busy doing the work — we are busy filling your calendar. That is the whole point.</Rep>
      </div>

      <SecH>Insert 4 — The Close ($500/$500 Split)</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <PLabel>[During the $500 now / $500 on delivery close]</PLabel>
        <Rep>So here is how it works — five hundred to get your AI subcontractor started. We build your custom site, plug in the automation, set up your lead capture. When it is live and you have seen everything, the second five hundred. And from that point, you have a system working for you around the clock. No contracts, no lock-ins. You own everything. Most of our clients make that thousand back on their first two or three jobs from the leads the system generates.</Rep>
      </div>

      <SecH>Insert 5 — Post-Call SMS Follow-Up</SecH>
      <div className="sms-block" style={{ marginTop: '8px' }}>
        <PLabel>[Send within 5 minutes of call ending]</PLabel>
        <div className="sms-bubble">Hey [NAME], great chatting just now. Here is the recap — we build you a custom website and plug in an AI subcontractor system that handles your leads, follow-ups, and bookings automatically. $500 to start, $500 on delivery, you own everything. Ready to get your AI crew member working? Here is the link to lock in your spot: [LINK]</div>
        <div style={{ marginTop: '8px' }}>
          <Rep>Adapt the SMS to match the conversation. If they mentioned a specific pain point — weave it in. The "AI subcontractor" and "AI crew member" language should feel like a callback to the call, not a generic template.</Rep>
        </div>
      </div>
    </div>

    {/* ── COMPETITOR AMMUNITION ── */}
    <div className="card-glow" style={{ padding: '24px 22px', marginTop: '14px' }}>
      <div style={{ marginBottom: '6px' }}><span className="tag-red">COMPETITOR AMMO</span></div>
      <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>Competitor Ammunition — Verbal Scripts</h2>
      <Body>Never trash-talk competitors by name. Position Premmisus by highlighting what we do differently — let the prospect connect the dots.</Body>

      <SecH>When They Mention a Lock-In Agency</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The Ownership Trap Script</SubH>
        <PLabel>[If they mention an agency that owns their site or has long contracts]</PLabel>
        <Rep>Can I ask you something — do you actually own your website right now? Like, if you stopped paying them tomorrow, would you keep your site? Because a lot of agencies use what I call the hostage model. They build on their own platform, and the second you leave, everything disappears. Your site, your SEO rankings, your content — all gone. You are basically renting your own business presence. We do the opposite. We build on open technology, deploy it under your domain, and hand you the keys. You own it forever. If you fired us tomorrow — which you will not, but if you did — you keep every single thing we built. That is how it should work.</Rep>
      </div>

      <SecH>When They Mention a Cheap Freelancer or Fiverr</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>Custom Code vs. Template Script</SubH>
        <PLabel>[If they say "I can get someone on Fiverr to do it for $300"]</PLabel>
        <Rep>You absolutely can. And here is what you will get — a WordPress template that looks like every other contractor site on the internet. Same stock photos, same layout, same slow load times. Google sees that and says "this is not unique, this is not authoritative" — and buries you on page three. What we build is custom-coded in React. That is the same technology Netflix and Airbnb run on. It loads in under two seconds, it is built specifically for your business, and it is engineered to convert visitors into calls. A Fiverr site is a digital brochure. What we build is a lead engine. There is a massive difference between having a website and having a website that makes you money.</Rep>
      </div>

      <SecH>When They Mention DIY — Wix, Squarespace, GoDaddy</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The "Looks Fine, Generates Zero" Script</SubH>
        <PLabel>[If they say "I built my own site on Wix" or "I have a Squarespace site"]</PLabel>
        <Rep>How many leads is it generating for you right now? Be honest — how many calls per week come directly from that site? Because here is the thing — those platforms are great for making something that looks decent. But looking decent and generating leads are two completely different things. Google's latest algorithm updates specifically penalize template-built sites because they are slow, they are bloated with unnecessary code, and they all look the same. A custom-built site loads faster, ranks higher, and has conversion tracking built into every element. We know exactly which button, which page, which ad drove each call. That is the difference between a hobby website and a business asset.</Rep>
      </div>

      <SecH>When They Say "I Can Get a Website for $200"</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The Brochure vs. Lead Engine Script</SubH>
        <PLabel>[If they push back hard on the $1,500 price]</PLabel>
        <Rep>You are right — you can get a website for two hundred dollars. You can also get a truck for two thousand dollars. The question is, can you run a business on it? A two-hundred-dollar website is a brochure. It sits there. Nobody finds it, nobody calls from it, and six months from now you are wondering why your phone is not ringing. What we build for fifteen hundred dollars is not a website — it is a lead generation system. Custom-coded, search-engine optimized, with AI follow-up built in. You own it forever, no monthly website fees, no lock-ins. Most agencies charge twelve to fifty thousand for what we deliver at fifteen hundred. We are not the cheapest option — we are the best value option by a long shot.</Rep>
      </div>

      <SecH>When They Compare to a Local Agency</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>The AI Differentiation Script</SubH>
        <PLabel>[If they say "I am talking to another agency" or "XYZ agency quoted me"]</PLabel>
        <Rep>That is smart — you should be comparing. Here is what I would ask them: do they include AI automation? Because most agencies in Canada right now will build you a website, run some ads, and send you a report once a month. That is the standard playbook. What they cannot do is what we do — AI-powered lead follow-up in under 30 seconds, automated appointment booking, CRM nurturing sequences, an AI receptionist that answers calls when you are on a job. We are not just a marketing agency. We are a marketing and AI automation agency. That AI layer is what separates businesses that get leads from businesses that actually close them. Ask the other agency if they can do that. I will wait.</Rep>
      </div>
    </div>

    {/* ── CREDIBILITY BUILDERS ── */}
    <div className="card-glow" style={{ padding: '24px 22px', marginTop: '14px' }}>
      <div style={{ marginBottom: '6px' }}><span className="tag">CREDIBILITY</span></div>
      <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 4px' }}>Credibility Builders — Natural Mid-Call Drops</h2>
      <Body>Weave these in casually when rapport is building. They should feel like insights, not sales pitches. One per call maximum — do not stack them.</Body>

      <SecH>The Tech Credibility Drop</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>When to use: Early in the call, when discussing what makes Premmisus different</SubH>
        <Rep>We custom-code every site in React — same framework Instagram uses. Your competitors are on drag-and-drop templates that load slow and all look the same. Ours load in under two seconds and are built specifically to convert visitors into phone calls for your business. That is not a small difference when Google is deciding who shows up first.</Rep>
      </div>

      <SecH>The Knowledge Drop</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>When to use: When the prospect questions whether their current site is "good enough"</SubH>
        <Rep>Did you know that Google's latest algorithm updates specifically reward sites that load fast and are built with clean code? Template sites — WordPress, Wix, Squarespace — they are packed with bloated code that slows everything down. That is why you will see a competitor with a Wix site drop in rankings even though their content has not changed. Google got smarter. The bar went up. Most businesses do not even realize it happened.</Rep>
      </div>

      <SecH>The Systems Drop</SecH>
      <div className="card" style={{ padding: '18px 20px' }}>
        <SubH>When to use: Mid-call, when the prospect is engaged and asking "what else do you do?"</SubH>
        <Rep>We are not just building you a website. We are plugging you into a system. CRM that tracks every lead, AI follow-up that contacts them in seconds, automated booking so they can schedule without calling you, review requests that go out after every job. The whole engine. Most businesses are running five different tools that do not talk to each other. We replace all of that with one system that runs itself.</Rep>
      </div>
    </div>
  </div>
);

export default ProofPointsPanel;
