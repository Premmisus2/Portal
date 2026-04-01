'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Body, Li } from '@/components/ui/Typography';
import NotesPad from '@/components/ui/NotesPad';

const PRICING_TIERS = [
  {
    id: '0.5',
    name: 'Website Package',
    tagline: 'The door opener. Low-risk, high-impact entry point.',
    price: '$1,500',
    priceSuffix: 'CAD',
    highlight: false,
    locked: false,
    infant: true,
    features: [
      '$500 deposit + $1,000 on delivery',
      '5-day turnaround',
      'High-converting website or landing page',
      'Mobile responsive design',
      'Basic SEO setup',
      'Google Business Profile optimization',
      'Optional: $99/mo maintenance add-on',
    ],
    repInfo: 'Rep earns $500 CAD flat per close',
    unlockTier: 'All reps',
    pitch: 'Lead with the asset — not the price. Show the preview, let it sell itself. Included automatically in 1.0+.',
  },
  {
    id: '1.0',
    name: 'Foundation',
    tagline: 'Built for service businesses ready to stop being invisible.',
    price: '$1,599',
    priceSuffix: '/month',
    highlight: true,
    locked: false,
    infant: false,
    features: [
      'Everything in 0.5 (website included)',
      'Online presence setup / upgrade / audit',
      'Foundational Local SEO — GBP optimization, NAP consistency across 20-30 directories, one target city',
      'Google Review Automation — automated SMS/email review requests post-job via CRM, review gating',
      'Social media content (2 platforms, 4 organic posts/month)',
      'Paid ads setup — Google Ads OR Meta Ads (one platform to start)',
      'CRM system setup — pipeline, contact fields, basic workflows',
      'Google Business Profile optimization',
    ],
    repInfo: 'Rep earns 7% recurring (~$112 CAD/mo per active client)',
    unlockTier: 'Field Commander (10+ closes)',
    pitch: 'The full engine. Website + ads + AI follow-up + CRM. This is where real revenue starts for service businesses.',
  },
  {
    id: '2.0',
    name: 'Authority System',
    tagline: 'Your business becomes the obvious choice in your territory.',
    price: '$2,999',
    priceSuffix: '/month',
    highlight: false,
    locked: false,
    infant: false,
    features: [
      'Everything in Foundation PLUS:',
      'Website / funnel optimization',
      'SEO for Local Market Growth — on-page SEO, service pages per keyword, content strategy, expanding to 3-5 nearby cities',
      'Google Reviews & Testimonial Engine — auto-requesting + responding to every review, social proof content',
      'Social media (4 platforms, 8-12 organic posts/month)',
      'Paid ads — Google Ads + Meta Ads + A/B testing (both platforms running)',
      'CRM management + nurturing — automated follow-up sequences, lead scoring, missed call text-back',
      'Bi-weekly strategy call',
    ],
    repInfo: 'Rep earns 7% recurring (~$210 CAD/mo per active client)',
    unlockTier: 'Field Commander (10+ closes)',
    pitch: 'Predictable, scalable lead generation with systems that compound. We run the machine for you.',
  },
  {
    id: '3.0',
    name: 'Market Domination',
    tagline: 'For service businesses ready to own the market, not compete in it.',
    price: '$5,999',
    priceSuffix: '/month',
    highlight: false,
    locked: true,
    infant: false,
    features: [
      'Everything in Authority PLUS:',
      'High-performance conversion funnel system',
      'SEO for Market Domination — aggressive weekly content, location pages, backlink building, 10+ cities',
      'Full review & reputation engine',
      'Unlimited social media content — job site videos, before/afters, testimonials',
      'Paid ads ecosystem — Google Ads + Meta Ads + LSAs + retargeting',
      'Hands-on CRM & lead management',
      'Weekly strategy call',
      'Dedicated growth strategist',
      'Multi-location support (if applicable)',
    ],
    repInfo: 'Director-sold only — custom scoping per client',
    unlockTier: 'Directors Only',
    pitch: 'Scale operations. Capture territory. Systemize growth. Only sold by the director.',
  },
  {
    id: '4.0',
    name: 'Full Stack + AI Automation',
    tagline: 'The full system. Ads, CRM, content, AI — all of it, managed.',
    price: '$8K-$15K',
    priceSuffix: '/month',
    highlight: false,
    locked: true,
    infant: false,
    features: [
      'Everything in Market Domination PLUS:',
      'AI Voice Receptionist (Vapi) — answers inbound calls, books appointments, handles FAQs',
      'AI Chatbot Widget — website chat that qualifies leads 24/7, feeds into CRM pipeline',
      'Automated email/DM outreach campaigns',
      'Full automation stack — custom workflows connecting all systems',
      'Dedicated AI strategist',
    ],
    repInfo: 'Director-sold only — custom scoping per client',
    unlockTier: 'Directors Only',
    pitch: 'The full Premmisus brain plugged directly into their business. Custom-scoped per client.',
  },
];

export default function OfferStackView(props: any) {
  const { userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, shadowMode, actuallyDirector, viewAsRep, onToggleView, shadowRepName, allReps, enterShadow, exitShadow } = props;
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', paddingTop: shadowMode ? '40px' : 0 }}>
      <TopBar title="Offer Stack" subtitle="Section 13 — Pricing Packages"
        userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
        totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}
        actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView}
        shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow} />
      <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '6px' }}><span className="tag">13</span></div>
        <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '8px 0 4px', background: 'linear-gradient(135deg, #fff 40%, #00F0FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Offer Stack — Pricing Packages</h2>
        <Body>The complete Premmisus product ladder. Tap any tier to expand full details.</Body>
        <div className="divider" style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {PRICING_TIERS.map((tier, i) => {
            const isOpen = expanded === i;
            const borderColor = tier.locked ? '#222' : tier.highlight ? 'rgba(0,240,255,.5)' : tier.infant ? 'rgba(0,240,255,.12)' : '#1e1e1e';
            const glowStyle = tier.highlight
              ? { boxShadow: '0 0 32px rgba(0,240,255,.1), 0 0 0 1px rgba(0,240,255,.15)' }
              : tier.infant
              ? { boxShadow: 'inset 0 0 40px rgba(0,240,255,.03), 0 0 20px rgba(0,240,255,.04)' }
              : {};
            return (
              <div key={tier.id}
                onClick={() => setExpanded(isOpen ? null : i)}
                style={{
                  background: tier.locked ? '#080808' : tier.infant ? '#0a0a0a' : '#0d0d0d',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '20px 24px',
                  cursor: 'pointer',
                  transition: 'border-color .2s, box-shadow .2s',
                  opacity: tier.id === '4.0' ? 0.4 : tier.locked ? 0.5 : tier.infant ? 0.85 : 1,
                  position: 'relative',
                  ...glowStyle,
                }}>
                {tier.highlight && (
                  <div style={{ position: 'absolute', top: '-10px', right: '20px', background: '#00F0FF', color: '#000', fontSize: '9px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace' }}>Most Popular</div>
                )}
                {tier.locked && (
                  <div style={{ position: 'absolute', top: '-10px', right: '20px', background: '#333', color: '#888', fontSize: '9px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace' }}>Directors Only</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="dot">{tier.id}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>{tier.name}</p>
                      <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>{tier.tagline}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 900, color: tier.highlight ? '#00F0FF' : '#fff', fontSize: '22px', fontFamily: 'JetBrains Mono, monospace' }}>{tier.price}</p>
                    <p style={{ margin: 0, color: '#555', fontSize: '11px' }}>{tier.priceSuffix}</p>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #1a1a1a', paddingTop: '16px' }} className="fadein">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 10px', fontFamily: 'JetBrains Mono, monospace' }}>Includes</p>
                        {tier.features.map((f, j) => (
                          <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#00F0FF', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>✓</span>
                            <p style={{ margin: 0, color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>{f}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', margin: '0 0 10px', fontFamily: 'JetBrains Mono, monospace' }}>Rep Info</p>
                        <div style={{ background: 'rgba(0,240,255,.05)', border: '1px solid rgba(0,240,255,.15)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                          <p style={{ margin: 0, color: '#e0e0e0', fontSize: '13px', lineHeight: '1.5' }}>{tier.repInfo}</p>
                        </div>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#555', margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace' }}>Unlock Requirement</p>
                        <p style={{ margin: '0 0 12px', color: '#888', fontSize: '13px' }}>{tier.unlockTier}</p>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#555', margin: '0 0 4px', fontFamily: 'JetBrains Mono, monospace' }}>Pitch Angle</p>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '13px', fontStyle: 'italic', lineHeight: '1.5' }}>{tier.pitch}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <NotesPad storageKey="notes_offerstack" />
      </main>
    </div>
  );
}
