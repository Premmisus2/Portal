'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Body, SecH, Li } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';
import CopyBtn from '@/components/ui/CopyBtn';

/* ── AI Service data ── */
const AI_SERVICES = [
  {
    id: 'vapi',
    name: 'AI Voice Receptionist',
    tagline: 'Answers every call. Books every appointment. Never misses a lead.',
    price: '$1,200 | $1,350 | $1,500',
    priceSuffix: '/month',
    setupFee: '$1,000',
    repSetup: '$500 flat upfront',
    repMonthly: '~$84-105/mo',
    highlight: true,
    badge: 'Highest Value',
    badgeBg: '#00F0FF',
    badgeColor: '#000',
    ourCost: '$150-$300/mo',
    margin: '75-80%',
    clientComparison: 'vs $3,000+/mo hiring a receptionist — and she calls in sick',
    features: [
      "Custom AI voice trained on the client's business, services, and FAQs",
      'Answers inbound calls 24/7 — after hours, weekends, holidays',
      'Books appointments directly into their calendar',
      'Qualifies leads before routing to the owner',
      'Sends follow-up SMS automatically after every call',
      "Full call transcripts delivered to owner's inbox",
      'Connects directly into GHL CRM pipeline',
    ],
    pitchAngle: "This is the one that makes owners cry on the demo. Show them the call recording of an AI answering their business name, handling objections, and booking an appointment — while the owner was asleep. That's the close.",
    pitchHook: "The lead you didn't answer at 9pm on Friday just booked with your competitor. Our AI makes sure that never happens again.",
    whoToPitch: ['Any service business with inbound call volume', 'Owners stuck on job sites and missing calls', 'Businesses running paid ads — every missed call is a wasted ad dollar', 'Full waitlist owners who want to free up their time'],
    objections: [
      { q: 'My customers want to talk to a real person.', a: "Our AI sounds indistinguishable from a human. Clients have gone weeks without knowing. We'll do a demo right now — you tell me if you can tell the difference." },
      { q: '$1,500 a month seems like a lot.', a: "What's one new job worth to you? Most trades businesses are $500-$2,000 per job. This pays for itself with two answered calls a month." },
      { q: 'We already have a receptionist.', a: "Great — does your receptionist work 24/7, never take a day off, and cost less than a coffee a day per lead? The AI handles overflow, evenings, and weekends." },
    ],
  },
  {
    id: 'sms',
    name: 'Automated SMS Sequences',
    tagline: 'Every lead gets a response in under 30 seconds. Even at midnight.',
    price: '$500 - $750',
    priceSuffix: '/month',
    setupFee: '$750',
    repSetup: '$375 flat upfront',
    repMonthly: '~$35-52/mo',
    highlight: false,
    badge: null,
    badgeBg: null,
    badgeColor: null,
    ourCost: '$10-$50/mo',
    margin: '90%+',
    clientComparison: 'vs manually texting every single lead — or losing them',
    features: [
      'Instant missed-call text-back — fires within 30 seconds',
      'New lead response sequence — immediate SMS, 24hr follow-up, 72hr revival',
      'Appointment confirmation + reminder sequences',
      'Dead lead re-engagement campaigns',
      'Review request texts post-job completion',
      'All messages personalized with client name, service, and business name',
      'Fully automated — zero manual work from the client',
    ],
    pitchAngle: "Lead Decay is the silent killer. A lead that doesn't get a response in 5 minutes is 80% less likely to convert. The AI fires the first text in under 30 seconds.",
    pitchHook: "You're generating leads — but how many are you actually catching? Most service businesses lose 40-60% to slow follow-up.",
    whoToPitch: ['Any business running paid ads', 'Businesses with a missed-call problem', "Solo operators who can't respond instantly", 'Anyone on a 1.0 or 2.0 marketing plan'],
    objections: [
      { q: 'I already respond to my leads quickly.', a: "How quickly when you're under a sink at 2pm? This system texts them while you're working." },
      { q: '$750 a month for texts?', a: "One recovered lead covers 6-12 months of this service. We're not selling texts — we're selling a system that makes sure none of your paid leads go cold." },
    ],
  },
  {
    id: 'email',
    name: 'Automated Email Sequences',
    tagline: 'Nurture leads on autopilot. Stay top of mind without lifting a finger.',
    price: '$400 - $500',
    priceSuffix: '/month',
    setupFee: '$500',
    repSetup: '$250 flat upfront',
    repMonthly: '~$28-35/mo',
    highlight: false,
    badge: 'Easiest Stack',
    badgeBg: 'rgba(34,197,94,.15)',
    badgeColor: '#22c55e',
    ourCost: '~$5/mo',
    margin: '95%+',
    clientComparison: 'vs hiring a VA to manually follow up — and hoping they do it right',
    features: [
      'New lead welcome sequence — automated 3-5 email nurture',
      'Quote follow-up sequence — automatic reminders if quote goes cold',
      'Past client re-engagement — seasonal offers, check-ins, referral asks',
      'Post-job review request emails',
      'Monthly newsletter automation (optional)',
      "Branded email templates that match their business",
      'All flows built, tested, and managed by Premmisus',
    ],
    pitchAngle: "Email is the lowest-cost, highest-margin AI service we offer. It stacks invisibly on top of anything else.",
    pitchHook: "That quote you sent last month that went quiet? An automated follow-up would have closed it.",
    whoToPitch: ['Any existing client — immediate add-on', 'Businesses that send quotes and lose track', 'Clients who want referrals and repeat business', 'Pairs perfectly with SMS'],
    objections: [
      { q: "I don't have an email list.", a: "You don't need one — every new lead, every quote sent, every job completed becomes a contact. You'll build a list automatically." },
      { q: 'Nobody opens emails from businesses.', a: 'Open rates in trades services run 35-50%. A well-timed email from their plumber gets opened.' },
    ],
  },
  {
    id: 'chatbot',
    name: 'AI Website Chatbot',
    tagline: 'Converts website visitors into booked leads. Around the clock.',
    price: '$500 - $750',
    priceSuffix: '/month',
    setupFee: '$750',
    repSetup: '$375 flat upfront',
    repMonthly: '~$35-52/mo',
    highlight: false,
    badge: null,
    badgeBg: null,
    badgeColor: null,
    ourCost: '$15-$30/mo',
    margin: '95%+',
    clientComparison: 'vs losing after-hours visitors who leave with no one to answer',
    features: [
      'AI chat widget installed on their website',
      'Trained on their services, pricing ranges, service area, and FAQs',
      'Qualifies visitors and books consultations directly',
      'Handles objections and common questions in real time',
      'Collects contact info and pushes leads into CRM pipeline',
      'Handoff to rep/owner for complex questions',
      "Branded to match the client's site design",
    ],
    pitchAngle: "Their website is already getting traffic. This turns that traffic into booked conversations instead of bounces.",
    pitchHook: "Right now, someone visits your website at 11pm and leaves because nobody answered their question. This stops that.",
    whoToPitch: ['Any client whose website we built', 'Clients running Google or Meta ads', 'Businesses with complex services that need explanation', 'Clients getting traffic but not enough leads'],
    objections: [
      { q: 'Those pop-up chats are annoying.', a: "This only activates when someone scrolls down or has been on the page for 30+ seconds. It acts like a helpful staff member, not a popup." },
      { q: "We don't get that much traffic.", a: "Even 10 visitors a month — if two become booked leads, that's a job." },
    ],
  },
  {
    id: 'crm',
    name: 'CRM Workflow Automation',
    tagline: 'The invisible operations engine. Your business runs itself.',
    price: '$500 - $750',
    priceSuffix: '/month',
    setupFee: '$750',
    repSetup: '$375 flat upfront',
    repMonthly: '~$35-52/mo',
    highlight: false,
    badge: null,
    badgeBg: null,
    badgeColor: null,
    ourCost: '~$20/mo',
    margin: '95%+',
    clientComparison: 'vs paying a VA $1,500/mo to manually move leads and send reminders',
    features: [
      'Full CRM pipeline setup and management in GoHighLevel',
      'Lead routing — automatic assignment based on niche, source, or territory',
      'Status-triggered automations (lead in = action sequence fires)',
      'Quote sent → follow-up workflow',
      'Job completed → review request + upsell sequence',
      'No-show re-booking automations',
      'Monthly pipeline audit and optimization',
    ],
    pitchAngle: "This is the connective tissue. Without it, the AI receptionist answers calls but nothing happens next.",
    pitchHook: "Right now, your business runs on sticky notes and memory. This builds the system that remembers everything.",
    whoToPitch: ['Any client on 2.0 or above', 'Businesses scaling fast and losing track', 'Best paired with Vapi — AI answers, CRM handles everything after'],
    objections: [
      { q: 'We already have a system.', a: "What system? We'll do a fast audit — if your CRM is fully automated, you don't need this. But if it requires manual updates, you're one bad week from chaos." },
      { q: "I don't want to change how we operate.", a: "We work around your operation — we're automating the repetitive parts, not replacing how you run your business." },
    ],
  },
];

/* ── Service card ── */
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
              <p style={{ margin: 0, color: '#555', fontSize: '11px' }}>{service.priceSuffix} + {service.setupFee} setup</p>
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
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 8px', fontFamily: 'JetBrains Mono, monospace' }}>Rep Commission</p>
              <div style={{ background: 'rgba(0,240,255,.05)', border: '1px solid rgba(0,240,255,.15)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#888' }}>Setup (upfront)</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{service.repSetup}</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,.06)', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#888' }}>Recurring (7%)</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>{service.repMonthly}</span>
                </div>
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
                        <div style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)', borderRadius: '8px', padding: '10px 14px' }}>
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

/* ── Stack Calculator ── */
const CALC_SERVICES = [
  { id: 'vapi',    name: 'AI Receptionist',  mrr: 1350, setup: 1000 },
  { id: 'sms',     name: 'SMS Sequences',     mrr: 625,  setup: 750  },
  { id: 'email',   name: 'Email Sequences',   mrr: 450,  setup: 500  },
  { id: 'chatbot', name: 'Website Chatbot',   mrr: 625,  setup: 750  },
  { id: 'crm',     name: 'CRM Automation',    mrr: 625,  setup: 750  },
];

const KEY_STACKS = [
  { label: 'Entry AI Stack',     services: 'Vapi + Email',           mrrTotal: 1800, setupTotal: 1500, margin: '88%', note: 'Lowest barrier. High perceived value from the Vapi demo.' },
  { label: 'Lead Machine Stack', services: 'SMS + Email + CRM',      mrrTotal: 1700, setupTotal: 2000, margin: '96%', note: 'No demo needed. Pure automation sell. Easy close.' },
  { label: 'Full Capture Stack', services: 'Vapi + SMS + Chatbot',   mrrTotal: 2600, setupTotal: 2500, margin: '85%', note: 'Every inbound touchpoint covered. Best for ad clients.' },
  { label: 'The Full Menu',      services: 'All 5 services',         mrrTotal: 3675, setupTotal: 3750, margin: '92%', note: 'Director close. Bring in the director for this conversation.' },
];

const VAPI_TIERS = [
  { label: '$1,200', mrr: 1200 },
  { label: '$1,350', mrr: 1350 },
  { label: '$1,500', mrr: 1500 },
];

function AIStackCalculator({ isDirector }: { isDirector: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [vapiTier, setVapiTier] = useState(1350);
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedServices = CALC_SERVICES.filter(s => selected.includes(s.id));
  const mrrSubtotal = selectedServices.reduce((s, svc) => s + (svc.id === 'vapi' ? vapiTier : svc.mrr), 0);
  const setupSubtotal = selectedServices.reduce((s, svc) => s + svc.setup, 0);
  const discount = selected.length >= 3 ? 250 : 0;
  const mrrTotal = mrrSubtotal - discount;
  const repSetup = Math.round(setupSubtotal * 0.5);
  const repMonthly = Math.round(mrrTotal * 0.07);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        {CALC_SERVICES.map(svc => {
          const on = selected.includes(svc.id);
          const displayMrr = svc.id === 'vapi' ? vapiTier : svc.mrr;
          return (
            <div key={svc.id}>
              <div onClick={() => toggle(svc.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: on && svc.id === 'vapi' ? '8px 8px 0 0' : '8px', border: `1px solid ${on ? 'rgba(0,240,255,.25)' : '#111'}`, borderBottom: on && svc.id === 'vapi' ? 'none' : undefined, background: on ? 'rgba(0,240,255,.04)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${on ? '#00F0FF' : '#333'}`, background: on ? '#00F0FF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 13 4 10" /></svg>}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: on ? '#fff' : '#666', fontFamily: 'Inter, sans-serif' }}>{svc.name}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: on ? '#00F0FF' : '#444', fontFamily: 'JetBrains Mono, monospace' }}>${displayMrr.toLocaleString()}/mo</span>
                  <span style={{ fontSize: '10px', color: '#444', marginLeft: '6px' }}>+ ${svc.setup.toLocaleString()} setup</span>
                </div>
              </div>
              {on && svc.id === 'vapi' && (
                <div style={{ padding: '8px 14px', background: 'rgba(0,240,255,.03)', border: '1px solid rgba(0,240,255,.25)', borderTop: '1px solid rgba(0,240,255,.1)', borderRadius: '0 0 8px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace', marginRight: '4px' }}>TIER</span>
                  {VAPI_TIERS.map(t => (
                    <button key={t.mrr} onClick={e => { e.stopPropagation(); setVapiTier(t.mrr); }}
                      style={{ padding: '4px 12px', borderRadius: '5px', border: `1px solid ${vapiTier === t.mrr ? '#00F0FF' : '#222'}`, background: vapiTier === t.mrr ? 'rgba(0,240,255,.15)' : 'transparent', color: vapiTier === t.mrr ? '#00F0FF' : '#555', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', transition: 'all .15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="fadein" style={{ background: '#0a0a0a', border: '1px solid rgba(0,240,255,.2)', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Setup fees ({selected.length} service{selected.length > 1 ? 's' : ''})</span>
              <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#888' }}>${setupSubtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>MRR subtotal</span>
              <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#888' }}>${mrrSubtotal.toLocaleString()}/mo</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>Bundle discount (3+ services)</span>
                <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#22c55e' }}>-${discount}</span>
              </div>
            )}
            <div style={{ height: '1px', background: '#1a1a1a', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Client Pays</span>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>${mrrTotal.toLocaleString()}/mo</span>
            </div>
            <div style={{ height: '1px', background: '#1a1a1a', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(34,197,94,.05)', borderRadius: '6px', border: '1px solid rgba(34,197,94,.15)' }}>
              <span style={{ fontSize: '11px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>You Earn — Upfront</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>${repSetup.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,240,255,.05)', borderRadius: '6px', border: '1px solid rgba(0,240,255,.1)' }}>
              <span style={{ fontSize: '11px', color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>You Earn — Monthly (7%)</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>${repMonthly.toLocaleString()}/mo</span>
            </div>
            {selected.length < 3 && (
              <p style={{ fontSize: '11px', color: '#555', margin: '4px 0 0', fontStyle: 'italic' }}>Add {3 - selected.length} more service{3 - selected.length > 1 ? 's' : ''} to unlock the $250 bundle discount.</p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#333', fontSize: '13px', fontStyle: 'italic' }}>
          Select services above to calculate the stack total.
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <SecH>Key Stack Scenarios</SecH>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {KEY_STACKS.map((s, i) => (
            <div key={i} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>{s.label}</span>
                  {isDirector && <span className="tag" style={{ fontSize: '9px', padding: '1px 7px' }}>{s.margin} margin</span>}
                </div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#666' }}>{s.services}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#555', fontStyle: 'italic' }}>{s.note}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 900, color: '#00F0FF', fontSize: '15px', fontFamily: 'JetBrains Mono, monospace' }}>${s.mrrTotal.toLocaleString()}/mo</p>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#444' }}>+ ${s.setupTotal.toLocaleString()} setup</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Pitch Strategy ── */
const stackingScript = "You're already on our Foundation system and it's working. Here's something a lot of our clients do — they add the AI receptionist layer on top. You stay on the same marketing plan, but now you're also answering every call automatically, even when you're on a job site. It's a separate menu — no changes to what you're already getting. Want me to show you what that looks like?";

const coldScript = "Hi, I'm calling from Premmisus. I'll be straight with you — I'm not here to pitch you a new marketing agency. I actually want to ask you one question: when a potential customer calls your business after hours, what happens? (Wait for answer) ... That's exactly why I'm calling. We have an AI system that answers every call, answers their questions, and books the appointment — while you're on a job site or asleep. We work alongside whatever agency you already have. Is that worth 5 minutes?";

function AIPitchStrategyPanel() {
  return (
    <div>
      <SecH>The Two-Menu Model</SecH>
      <Body>Marketing and AI are sold from two separate menus. Assess which door to enter on every call. Most go through the marketing door. But some — especially already-busy owners — only need the AI menu. Master both.</Body>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>Marketing Door</p>
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#fff' }}>Offer Stack 1.0 – 3.0</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#666', lineHeight: 1.5 }}>For businesses that need leads. Weak online presence. Under 100 Google reviews. Wants to grow.</p>
        </div>
        <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,240,255,.2)', borderRadius: '10px', padding: '16px', boxShadow: '0 0 20px rgba(0,240,255,.04)' }}>
          <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>AI Door</p>
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#fff' }}>AI Services Menu</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#666', lineHeight: 1.5 }}>For businesses that are already busy. Wants to free up time. Has a current agency. Missing inbound calls.</p>
        </div>
      </div>

      <SecH>The Stacking Play</SecH>
      <Body>When a client is on 2.0 ($2,999/mo) and needs more without committing to 3.0 — the AI menu fills the gap. They go from $2,999 to $4,499+ without the full 3.0 commitment. Plant the AI seed, they grow into it.</Body>
      <div style={{ marginTop: '12px', marginBottom: '24px' }}>
        <div className="rep-block">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div className="rep-label" style={{ marginBottom: 0 }}>REP — Existing Client Upsell</div>
            <CopyBtn text={stackingScript} />
          </div>
          <p className="rep-text">{stackingScript}</p>
        </div>
      </div>

      <SecH>The Cold Pitch — AI Only</SecH>
      <Body>Key line: "Keep your current agency for marketing. Add us for the AI layer they can't do." Use this when they already have marketing handled.</Body>
      <div style={{ marginTop: '12px', marginBottom: '24px' }}>
        <div className="rep-block">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div className="rep-label" style={{ marginBottom: 0 }}>REP — Cold Open (AI Only)</div>
            <CopyBtn text={coldScript} />
          </div>
          <p className="rep-text">{coldScript}</p>
        </div>
      </div>

      <SecH>Rules of the AI Close</SecH>
      <ul style={{ margin: '8px 0 0', padding: 0 }}>
        <Li><strong style={{ color: '#fff' }}>Rule 1:</strong> Always demo before you price. A 90-second voice demo of the AI receptionist closes faster than any pricing conversation.</Li>
        <Li><strong style={{ color: '#fff' }}>Rule 2:</strong> Lead with the outcome, not the technology. "You'll never miss a lead after hours" lands better than explaining the tech stack.</Li>
        <Li><strong style={{ color: '#fff' }}>Rule 3:</strong> Vapi first, stack second. If they buy the AI receptionist, follow up in 30 days about SMS sequences. Never dump the whole menu at once.</Li>
        <Li><strong style={{ color: '#fff' }}>Rule 4:</strong> Handoff to the director for any stack above $2,500/mo or any client that needs a custom demo built.</Li>
      </ul>

      <div style={{ marginTop: '28px' }}>
        <SecH>The Top-Down Principle</SecH>
        <Body>Customers anchor to the first number they hear. Open at the standard tier — not the floor. Stepping down feels like a win for them. Reps who open low never climb out of it. The floor exists to save a deal, not to start one.</Body>
        <ul style={{ margin: '12px 0 0', padding: 0 }}>
          <Li>
            <strong style={{ color: '#fff' }}>AI Receptionist:</strong> Open at{' '}
            <strong style={{ color: '#00F0FF' }}>$1,350</strong> (standard build).
            If they want more, upsell to <strong style={{ color: '#00F0FF' }}>$1,500</strong> (premium — more advanced build).
            If they push back on price, step to <strong style={{ color: '#888' }}>$1,200</strong> to save the deal.
          </Li>
          <Li>
            <strong style={{ color: '#fff' }}>Marketing:</strong> Open at{' '}
            <strong style={{ color: '#00F0FF' }}>2.0 ($2,999/mo)</strong>.
            Step down to <strong style={{ color: '#888' }}>1.0 ($1,599/mo)</strong> if needed.
            The Website Package ($1,500 one-time) is the catch — never the opener.
          </Li>
          <Li>
            <strong style={{ color: '#fff' }}>AI Bundles:</strong> Lead with the full stack. Let them tell you what to remove — not what to add. Never pitch individual services as the starting point.
          </Li>
          <Li>
            <strong style={{ color: '#fff' }}>The rule:</strong> Never open at the floor. Present the standard. Let them negotiate down. You will close more at a higher number than you will close more deals at a lower number.
          </Li>
        </ul>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function AIServicesContent({ isDirector }: { isDirector: boolean }) {
  const [subTab, setSubTab] = useState<'services' | 'calculator' | 'strategy'>('services');

  return (
    <div>
      <div style={{ marginBottom: '6px' }}><span className="tag">AI Menu</span></div>
      <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '8px 0 4px', background: 'linear-gradient(135deg, #fff 40%, #00F0FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Offer Stack</h2>
      <Body>5 AI services. Sold separately or stacked. Setup fee + 7% monthly recurring. Handoff to director at $2,500+/mo.</Body>
      <div className="divider" style={{ margin: '16px 0' }} />

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className={`call-tab${subTab === 'services' ? ' active' : ''}`} onClick={() => setSubTab('services')}>AI Services</button>
        <button className={`call-tab${subTab === 'calculator' ? ' active' : ''}`} style={{ fontSize: '11px', padding: '6px 14px' }} onClick={() => setSubTab('calculator')}>Stack Calculator</button>
        <button className={`call-tab${subTab === 'strategy' ? ' active' : ''}`} style={{ fontSize: '11px', padding: '6px 14px' }} onClick={() => setSubTab('strategy')}>Pitch Strategy</button>
      </div>

      {/* AI Services tab */}
      {subTab === 'services' && (
        <div className="fadein">
          <div style={{ background: 'rgba(0,240,255,.04)', border: '1px solid rgba(0,240,255,.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ color: '#00F0FF', flexShrink: 0, marginTop: '2px' }}><Icon name="info" size={18} /></div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>The One Line That Sells Everything</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#aaa', lineHeight: 1.55, fontStyle: 'italic' }}>"Keep your current agency for marketing. Add us for the AI layer they can't do."</p>
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>$250 off MRR when bundling any 3+ AI services</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.5 }}>Example: Vapi ($1,350) + SMS ($625) + Email ($450) = $2,425 → <strong style={{ color: '#22c55e' }}>$2,175/mo after discount</strong>.{isDirector ? ' Setup fees are separate and paid in full.' : ' Handoff to director for custom scoping at $2,500+/mo.'}</p>
          </div>
          <NotesPad storageKey="notes_aitools" />
        </div>
      )}

      {/* Stack Calculator tab */}
      {subTab === 'calculator' && (
        <div className="fadein">
          <div style={{ marginBottom: '6px' }}><span className="tag">Calculator</span></div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '8px 0 4px', background: 'linear-gradient(135deg, #fff 40%, #00F0FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stack Builder</h2>
          <Body>Select AI services to build a client package. Shows client total, your upfront commission, and monthly recurring.</Body>
          <div style={{ padding: '20px', marginTop: '20px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '12px' }}>
            <AIStackCalculator isDirector={isDirector} />
          </div>
        </div>
      )}

      {/* Pitch Strategy tab */}
      {subTab === 'strategy' && (
        <div className="fadein">
          <div style={{ marginBottom: '6px' }}><span className="tag">Strategy</span></div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '8px 0 4px', background: 'linear-gradient(135deg, #fff 40%, #00F0FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pitch Strategy</h2>
          <Body>How to position, open, and close AI services. From cold call to stacked client.</Body>
          <div className="divider" style={{ margin: '16px 0' }} />
          <AIPitchStrategyPanel />
        </div>
      )}
    </div>
  );
}
