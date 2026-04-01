'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import Icon from '@/components/ui/Icon';
import { Body, SecH, Li } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const AI_SERVICES = [
  {
    id: 'vapi',
    icon: 'phone',
    name: 'AI Voice Receptionist',
    tagline: 'Answers every call. Books every appointment. Never misses a lead.',
    price: '$1,200 - $1,500',
    priceSuffix: '/month',
    highlight: true,
    badge: 'Highest Value',
    badgeBg: '#00F0FF',
    badgeColor: '#000',
    ourCost: '$150-$300/mo',
    margin: '75-80%',
    clientComparison: 'vs $3,000+/mo hiring a receptionist — and she calls in sick',
    repInfo: '7% recurring monthly on active clients',
    repExample: '~$98-$105/mo per client, every month they stay',
    features: [
      'Custom AI voice trained on the client\'s business, services, and FAQs',
      'Answers inbound calls 24/7 — after hours, weekends, holidays',
      'Books appointments directly into their calendar',
      'Qualifies leads before routing to the owner',
      'Sends follow-up SMS automatically after every call',
      'Full call transcripts delivered to owner\'s inbox',
      'Connects directly into GHL CRM pipeline',
    ],
    pitchAngle: 'This is the one that makes owners cry on the demo. Show them the call recording of an AI answering their business name, handling objections, and booking an appointment — while the owner was asleep. That\'s the close.',
    pitchHook: 'The lead you didn\'t answer at 9pm on Friday just booked with your competitor. Our AI makes sure that never happens again.',
    whoToPitch: ['Any service business with inbound call volume', 'Owners stuck on job sites and missing calls', 'Businesses running paid ads — every missed call is a wasted ad dollar', 'Full waitlist owners who want to free up their time'],
    objections: [
      { q: 'My customers want to talk to a real person.', a: 'Our AI sounds indistinguishable from a human. Clients have gone weeks without knowing. We\'ll do a demo right now — you tell me if you can tell the difference.' },
      { q: '$1,500 a month seems like a lot.', a: 'What\'s one new job worth to you? Most trades businesses are $500-$2,000 per job. This pays for itself with two answered calls a month.' },
      { q: 'We already have a receptionist.', a: 'Great — does your receptionist work 24/7, never take a day off, and cost less than a coffee a day per lead? The AI handles overflow, evenings, and weekends.' },
    ],
  },
  {
    id: 'sms',
    icon: 'send',
    name: 'Automated SMS Sequences',
    tagline: 'Every lead gets a response in under 30 seconds. Even at midnight.',
    price: '$500 - $750',
    priceSuffix: '/month',
    highlight: false,
    badge: null,
    badgeBg: null,
    badgeColor: null,
    ourCost: '$10-$50/mo',
    margin: '90%+',
    clientComparison: 'vs manually texting every single lead — or losing them',
    repInfo: '7% recurring monthly on active clients',
    repExample: '~$35-$52/mo per client, every month they stay',
    features: [
      'Instant missed-call text-back — fires within 30 seconds',
      'New lead response sequence — immediate SMS, 24hr follow-up, 72hr revival',
      'Appointment confirmation + reminder sequences',
      'Dead lead re-engagement campaigns',
      'Review request texts post-job completion',
      'All messages personalized with client name, service, and business name',
      'Fully automated — zero manual work from the client',
    ],
    pitchAngle: 'Lead Decay is the silent killer. A lead that doesn\'t get a response in 5 minutes is 80% less likely to convert. The AI fires the first text in under 30 seconds.',
    pitchHook: 'You\'re generating leads — but how many are you actually catching? Most service businesses lose 40-60% to slow follow-up.',
    whoToPitch: ['Any business running paid ads', 'Businesses with a missed-call problem', 'Solo operators who can\'t respond instantly', 'Anyone on a 1.0 or 2.0 marketing plan'],
    objections: [
      { q: 'I already respond to my leads quickly.', a: 'How quickly when you\'re under a sink at 2pm? This system texts them while you\'re working.' },
      { q: '$750 a month for texts?', a: 'One recovered lead covers 6-12 months of this service. We\'re not selling texts — we\'re selling a system that makes sure none of your paid leads go cold.' },
    ],
  },
  {
    id: 'email',
    icon: 'mail',
    name: 'Automated Email Sequences',
    tagline: 'Nurture leads on autopilot. Stay top of mind without lifting a finger.',
    price: '$400 - $500',
    priceSuffix: '/month',
    highlight: false,
    badge: 'Easiest Stack',
    badgeBg: 'rgba(34,197,94,.15)',
    badgeColor: '#22c55e',
    ourCost: '~$5/mo',
    margin: '95%+',
    clientComparison: 'vs hiring a VA to manually follow up — and hoping they do it right',
    repInfo: '7% recurring monthly on active clients',
    repExample: '~$28-$35/mo per client, every month they stay',
    features: [
      'New lead welcome sequence — automated 3-5 email nurture',
      'Quote follow-up sequence — automatic reminders if quote goes cold',
      'Past client re-engagement — seasonal offers, check-ins, referral asks',
      'Post-job review request emails',
      'Monthly newsletter automation (optional)',
      'Branded email templates that match their business',
      'All flows built, tested, and managed by Premmisus',
    ],
    pitchAngle: 'Email is the lowest-cost, highest-margin AI service we offer. It stacks invisibly on top of anything else.',
    pitchHook: 'That quote you sent last month that went quiet? An automated follow-up would have closed it.',
    whoToPitch: ['Any existing client — immediate add-on', 'Businesses that send quotes and lose track', 'Clients who want referrals and repeat business', 'Pairs perfectly with SMS'],
    objections: [
      { q: 'I don\'t have an email list.', a: 'You don\'t need one — every new lead, every quote sent, every job completed becomes a contact. You\'ll build a list automatically.' },
      { q: 'Nobody opens emails from businesses.', a: 'Open rates in trades services run 35-50%. A well-timed email from their plumber gets opened.' },
    ],
  },
  {
    id: 'chatbot',
    icon: 'send',
    name: 'AI Website Chatbot',
    tagline: 'Converts website visitors into booked leads. Around the clock.',
    price: '$500 - $750',
    priceSuffix: '/month',
    highlight: false,
    badge: null,
    badgeBg: null,
    badgeColor: null,
    ourCost: '$15-$30/mo',
    margin: '95%+',
    clientComparison: 'vs losing after-hours visitors who leave with no one to answer',
    repInfo: '7% recurring monthly on active clients',
    repExample: '~$35-$52/mo per client, every month they stay',
    features: [
      'AI chat widget installed on their website',
      'Trained on their services, pricing ranges, service area, and FAQs',
      'Qualifies visitors and books consultations directly',
      'Handles objections and common questions in real time',
      'Collects contact info and pushes leads into CRM pipeline',
      'Handoff to rep/owner for complex questions',
      'Branded to match the client\'s site design',
    ],
    pitchAngle: 'Their website is already getting traffic. This turns that traffic into booked conversations instead of bounces.',
    pitchHook: 'Right now, someone visits your website at 11pm and leaves because nobody answered their question. This stops that.',
    whoToPitch: ['Any client whose website we built', 'Clients running Google or Meta ads', 'Businesses with complex services that need explanation', 'Clients getting traffic but not enough leads'],
    objections: [
      { q: 'Those pop-up chats are annoying.', a: 'This only activates when someone scrolls down or has been on the page for 30+ seconds. It acts like a helpful staff member, not a popup.' },
      { q: 'We don\'t get that much traffic.', a: 'Even 10 visitors a month — if two become booked leads, that\'s a job.' },
    ],
  },
  {
    id: 'crm',
    icon: 'zap',
    name: 'CRM Workflow Automation',
    tagline: 'The invisible operations engine. Your business runs itself.',
    price: '$500 - $750',
    priceSuffix: '/month',
    highlight: false,
    badge: null,
    badgeBg: null,
    badgeColor: null,
    ourCost: '~$20/mo',
    margin: '95%+',
    clientComparison: 'vs paying a VA $1,500/mo to manually move leads and send reminders',
    repInfo: '7% recurring monthly on active clients',
    repExample: '~$35-$52/mo per client, every month they stay',
    features: [
      'Full CRM pipeline setup and management in GoHighLevel',
      'Lead routing — automatic assignment based on niche, source, or territory',
      'Status-triggered automations (lead in = action sequence fires)',
      'Quote sent → follow-up workflow',
      'Job completed → review request + upsell sequence',
      'No-show re-booking automations',
      'Monthly pipeline audit and optimization',
    ],
    pitchAngle: 'This is the connective tissue. Without it, the AI receptionist answers calls but nothing happens next.',
    pitchHook: 'Right now, your business runs on sticky notes and memory. This builds the system that remembers everything.',
    whoToPitch: ['Any client on 2.0 or above', 'Businesses scaling fast and losing track', 'Best paired with Vapi — AI answers, CRM handles everything after'],
    objections: [
      { q: 'We already have a system.', a: 'What system? We\'ll do a fast audit — if your CRM is fully automated, you don\'t need this. But if it requires manual updates, you\'re one bad week from chaos.' },
      { q: 'I don\'t want to change how we operate.', a: 'We work around your operation — we\'re automating the repetitive parts, not replacing how you run your business.' },
    ],
  },
];

function AIServiceCard({ service, index, isDirector }: { service: typeof AI_SERVICES[0]; index: number; isDirector: boolean }) {
  const [open, setOpen] = useState(false);
  const [objOpen, setObjOpen] = useState<number | null>(null);

  const borderColor = service.highlight ? 'rgba(0,240,255,.5)' : '#1e1e1e';
  const glowStyle = service.highlight ? { boxShadow: '0 0 32px rgba(0,240,255,.1), 0 0 0 1px rgba(0,240,255,.15)' } : {};

  return (
    <div style={{ background: '#0d0d0d', border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color .2s, box-shadow .2s', ...glowStyle }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '20px 24px', cursor: 'pointer', position: 'relative', userSelect: 'none' }}>
        {service.badge && (
          <div style={{ position: 'absolute', top: '-1px', right: '20px', background: service.badgeBg || 'transparent', color: service.badgeColor || '#fff', fontSize: '9px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 6px 6px', fontFamily: 'JetBrains Mono, monospace' }}>
            {service.badge}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="dot" style={{ fontSize: '12px' }}>{String(index + 1).padStart(2, '0')}</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>{service.name}</p>
              <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>{service.tagline}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: 900, color: service.highlight ? '#00F0FF' : '#fff', fontSize: '19px', fontFamily: 'JetBrains Mono, monospace' }}>{service.price}</p>
              <p style={{ margin: 0, color: '#555', fontSize: '11px' }}>{service.priceSuffix}</p>
            </div>
            <div style={{ color: '#444', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <Icon name="chevron" size={18} />
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="fadein" style={{ borderTop: '1px solid #1a1a1a', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isDirector ? 'repeat(3,1fr)' : '1fr', gap: '10px', marginBottom: '20px' }}>
            {(isDirector ? [
              { label: 'Our Cost', val: service.ourCost },
              { label: 'Margin', val: service.margin, green: true },
              { label: 'Client Comparison', val: service.clientComparison, amber: true },
            ] : [
              { label: 'Client Comparison', val: service.clientComparison, amber: true },
            ]).map((s, i) => (
              <div key={i} style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ margin: '0 0 3px', fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: (s as any).green ? '#22c55e' : (s as any).amber ? '#F59E0B' : '#fff', lineHeight: 1.3 }}>{s.val}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 10px', fontFamily: 'JetBrains Mono, monospace' }}>What's Included</p>
              {service.features.map((f, j) => (
                <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00F0FF', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>+</span>
                  <p style={{ margin: 0, color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>{f}</p>
                </div>
              ))}
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 8px', fontFamily: 'JetBrains Mono, monospace' }}>Who to Pitch</p>
                <ul style={{ margin: 0, padding: 0 }}>
                  {service.whoToPitch.map((w, j) => <Li key={j}>{w}</Li>)}
                </ul>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 8px', fontFamily: 'JetBrains Mono, monospace' }}>Rep Earnings</p>
              <div style={{ background: 'rgba(0,240,255,.05)', border: '1px solid rgba(0,240,255,.15)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 2px', color: '#e0e0e0', fontSize: '13px', fontWeight: 700 }}>{service.repInfo}</p>
                <p style={{ margin: 0, color: '#888', fontSize: '12px', fontStyle: 'italic' }}>{service.repExample}</p>
              </div>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#555', margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace' }}>Pitch Angle</p>
              <p style={{ margin: '0 0 16px', color: '#aaa', fontSize: '13px', fontStyle: 'italic', lineHeight: '1.55', background: 'rgba(255,255,255,.02)', border: '1px solid #111', borderRadius: '8px', padding: '10px 12px' }}>{service.pitchAngle}</p>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#555', margin: '0 0 6px', fontFamily: 'JetBrains Mono, monospace' }}>Opening Hook</p>
              <div className="rep-block" style={{ marginTop: 0 }}>
                <p className="rep-text">{service.pitchHook}</p>
              </div>
            </div>
          </div>

          {service.objections.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <SecH>Objections & Rebuttals</SecH>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {service.objections.map((obj, j) => (
                  <div key={j} style={{ background: '#080808', border: `1px solid ${objOpen === j ? 'rgba(0,240,255,.2)' : '#1a1a1a'}`, borderRadius: '8px', overflow: 'hidden', transition: 'border-color .2s' }}>
                    <div onClick={() => setObjOpen(objOpen === j ? null : j)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#ff8080', lineHeight: 1.4, fontStyle: 'italic' }}>"{obj.q}"</p>
                      <span style={{ color: '#444', flexShrink: 0, marginTop: '2px', transition: 'transform .2s', display: 'inline-block', transform: objOpen === j ? 'rotate(180deg)' : 'rotate(0deg)' }}><Icon name="chevron" size={14} /></span>
                    </div>
                    {objOpen === j && (
                      <div className="fadein" style={{ padding: '0 16px 14px' }}>
                        <div style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)', borderRadius: '8px', padding: '10px 14px', marginTop: 0 }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#22c55e', display: 'block', marginBottom: '4px', fontFamily: 'JetBrains Mono, monospace' }}>REBUTTAL</span>
                          <p style={{ margin: 0, color: '#ccc', fontSize: '13px', lineHeight: 1.55 }}>{obj.a}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIToolsView(props: any) {
  const { userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, isDirector, shadowMode, actuallyDirector, viewAsRep, onToggleView, shadowRepName, allReps, enterShadow, exitShadow } = props;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', paddingTop: shadowMode ? '40px' : 0 }}>
      <TopBar title="AI Tools" subtitle="AI Services Menu"
        userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
        totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}
        actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView}
        shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow} />
      <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '6px' }}><span className="tag">AI Menu</span></div>
        <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '8px 0 4px', background: 'linear-gradient(135deg, #fff 40%, #00F0FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Offer Stack</h2>
        <Body>5 AI services. Sold separately or stacked on top of any marketing tier. Handoff to director at $2,500+/mo.</Body>
        <div className="divider" style={{ margin: '16px 0' }} />

        <div style={{ background: 'rgba(0,240,255,.04)', border: '1px solid rgba(0,240,255,.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ color: '#00F0FF', flexShrink: 0, marginTop: '2px' }}><Icon name="info" size={18} /></div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>The One Line That Sells Everything</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#aaa', lineHeight: 1.55, fontStyle: 'italic' }}>"Keep your current agency for marketing. Add us for the AI layer they can't do." — This is the entire AI pitch in one sentence.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {AI_SERVICES.map((service, i) => (
            <AIServiceCard key={service.id} service={service} index={i} isDirector={isDirector} />
          ))}
        </div>

        <div style={{ margin: '24px 0 0', background: '#0a0a0a', border: '1px solid rgba(34,197,94,.2)', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="tag" style={{ borderColor: 'rgba(34,197,94,.35)', color: '#22c55e', background: 'rgba(34,197,94,.06)' }}>Bundle Discount</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>$250 off when bundling any 3+ AI services</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.5 }}>Example: Vapi ($1,500) + SMS ($750) + Email ($500) = $2,750 → <strong style={{ color: '#22c55e' }}>$2,500/mo after discount</strong>.{isDirector ? ' Your cost: ~$350/mo. Margin: 86%.' : ' Handoff to director for custom scoping.'}</p>
        </div>

        <NotesPad storageKey="notes_aitools" />
      </main>
    </div>
  );
}
