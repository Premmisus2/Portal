'use client';

import { useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   PROSPECT-FACING OFFER PAGE
   Public, unauthenticated. Linked to prospective reps so they can review the
   full offer stack + commission structure BEFORE being granted portal access.
   Built from the locked pricing in lib/constants.ts (2026-05-11 audit).
   EN/DE toggle wired — DE uses EUR pricing from DACH_PRICING.
   ──────────────────────────────────────────────────────────────────────── */

const ACCENT = '#00F0FF';

type Lang = 'en' | 'de';

type Tier = {
  id: string;
  name: string;
  tagline: string;
  priceOutbound: string;
  priceInbound?: string;
  priceSuffix: string;
  features: string[];
  repInfo: string;
  pitch: string;
  highlight?: boolean;
};

type AIService = {
  id: string;
  name: string;
  tagline: string;
  setup: string;
  monthly: string;
  features: string[];
  repInfo: string;
};

type Rung = {
  rank: number;
  role: string;
  unlock: string;
  earns: string[];
  authority: string;
};

type OnboardingStep = { t: string; d: string };

type LangContent = {
  // UI
  kickerHero: string;
  heroTitle: string;
  heroBody: string;
  pitchKicker: string;
  pitchQuote: string;
  pitchBody: string;
  // Section 01
  marketingKicker: string;
  marketingTitle: string;
  marketingIntro: string;
  whyTwoPricesKicker: string;
  outboundLabel: string;
  outboundBody: string;
  inboundLabel: string;
  inboundBody: string;
  // Section 02
  aiKicker: string;
  aiTitle: string;
  aiIntro: string;
  // Section 03
  commissionKicker: string;
  commissionTitle: string;
  statSetupLabel: string;
  statSetupValue: string;
  statSetupSub: string;
  statRecurringLabel: string;
  statRecurringValue: string;
  statRecurringSub: string;
  statOverrideLabel: string;
  statOverrideValue: string;
  statOverrideSub: string;
  clawbackKicker: string;
  clawbackIntro: string;
  clawbackSetupBullet: string;
  clawbackRecurringBullet: string;
  clawbackException: string;
  // Section 04
  ladderKicker: string;
  ladderTitle: string;
  ladderIntro: string;
  earningsAtTier: string;
  whatYouEarn: string;
  // Section 05
  onboardingKicker: string;
  onboardingTitle: string;
  // Common
  priceMonthly: string;
  inboundPrefix: string;
  youEarnPrefix: string;
  setupLabel: string;
  monthlyLabel: string;
  navWelcome: string;
  navMarketing: string;
  navAI: string;
  navCommission: string;
  navLadder: string;
  navNext: string;
  downloadPDF: string;
  downloading: string;
  forProspectiveReps: string;
  offerBadge: string;
  // Data
  MARKETING_TIERS: Tier[];
  AI_SERVICES: AIService[];
  CAREER_LADDER: Rung[];
  ONBOARDING: OnboardingStep[];
};

const EN: LangContent = {
  kickerHero: 'For prospective sales partners',
  heroTitle: "What you'll be selling.",
  heroBody: 'Premmisus is a marketing and AI automation agency for service-based businesses. We build websites, run their ads, manage their CRMs, and deploy AI voice + chat systems that answer every call and follow up with every lead, 24/7. Two clean menus — Marketing services and AI services — sold individually or stacked.',
  pitchKicker: 'The pitch in one sentence',
  pitchQuote: '"You got the clients, we got the product."',
  pitchBody: 'You bring the conversations, Premmisus builds and runs everything the client signs up for.',

  marketingKicker: '01 — Marketing services',
  marketingTitle: 'The core stack',
  marketingIntro: 'Five tiers, ordered by depth. Reps start authorized to sell the first three; Market Domination and Full Stack are director-sold. Foundation uses a two-price model — outbound (cold) and inbound (warm) — explained below.',
  whyTwoPricesKicker: 'Why Foundation has two prices',
  outboundLabel: 'Outbound',
  outboundBody: '(cold call, cold DM, cold email): you went to them. Higher friction, less leverage — you trade margin for a faster close. Quote the outbound number.',
  inboundLabel: 'Inbound',
  inboundBody: '(referral, website form, paid ad, social DM): they came to you. Pre-qualified, higher intent. Quote the inbound number. No negotiation, no shame — just two real prices for two real lead sources.',

  aiKicker: '02 — AI services',
  aiTitle: 'Sold separately or stacked',
  aiIntro: 'Each AI service stands on its own. Stack three or more, the client gets a bundle discount. The AI Receptionist has three tiers — Lite is your foot-in-the-door close, Standard is the workhorse, Premium is for big operators.',

  commissionKicker: '03 — Commission',
  commissionTitle: 'How you get paid',
  statSetupLabel: 'Setup commission',
  statSetupValue: '50%',
  statSetupSub: 'of every setup fee, paid on director approval',
  statRecurringLabel: 'Recurring (MRR)',
  statRecurringValue: '7%',
  statRecurringSub: 'every month the client stays, for the lifetime of the customer',
  statOverrideLabel: 'Manager override',
  statOverrideValue: '3%',
  statOverrideSub: 'on team-member sales (Manager Growth Lead and above)',
  clawbackKicker: 'Commission Protection — 90-Day Cliff',
  clawbackIntro: 'When you close a client, your commission has two parts:',
  clawbackSetupBullet: 'Setup commission — yours forever. We don\'t claw it back. Ever.',
  clawbackRecurringBullet: 'Recurring (7%) — at risk for the first 90 days only. If a client cancels inside that window, the recurring you earned in those months comes back. After day 90 it\'s locked in for the lifetime of the customer.',
  clawbackException: 'Exception: If a client cancels because Premmisus didn\'t deliver what was sold — wrong product, missed launch, broken systems — that\'s our problem, not yours. No clawback. Director judgement on which is which, with reps getting the benefit of the doubt.',

  ladderKicker: '04 — Career ladder',
  ladderTitle: 'How you climb',
  ladderIntro: 'Every rep starts as a Junior Growth Associate. Each rung unlocks more of the offer stack and more commission. Lifetime closes is the only gate — no quotas, no timers. You move up when you\'ve put in the closes.',
  earningsAtTier: 'Earnings at this tier',
  whatYouEarn: 'What you earn',

  onboardingKicker: '05 — Onboarding',
  onboardingTitle: 'What happens next',

  priceMonthly: '/month',
  inboundPrefix: 'Inbound:',
  youEarnPrefix: 'You earn:',
  setupLabel: 'Setup',
  monthlyLabel: 'Monthly',
  navWelcome: 'Welcome',
  navMarketing: 'Marketing',
  navAI: 'AI Services',
  navCommission: 'Commission',
  navLadder: 'Career Ladder',
  navNext: 'Next Steps',
  downloadPDF: 'Download PDF',
  downloading: 'Generating…',
  forProspectiveReps: 'For prospective sales partners',
  offerBadge: 'Offer',

  MARKETING_TIERS: [
    {
      id: '0.5',
      name: 'Website Package',
      tagline: 'The door opener. Low-risk, high-impact entry.',
      priceOutbound: '$1,500',
      priceSuffix: 'CAD one-time',
      features: [
        '$500 deposit + $1,000 on delivery',
        '5-day turnaround',
        'Custom-built, conversion-focused design',
        'Fast, mobile-first, hosted on world-class infrastructure',
        'Basic SEO setup + GBP optimization',
        'Client owns it forever (no agency lock-in)',
        'Optional: $99/mo maintenance add-on',
      ],
      repInfo: 'Rep earns $500 CAD flat per close.',
      pitch: 'Lead with the asset, not the price. Show the preview — let it sell itself.',
    },
    {
      id: '1.0',
      name: 'Foundation',
      tagline: 'Built for service businesses ready to stop being invisible.',
      priceOutbound: '$1,599',
      priceInbound: '$1,799',
      priceSuffix: '/month',
      highlight: true,
      features: [
        'Everything in Website Package',
        'Online presence setup / upgrade / audit',
        'Foundational Local SEO + GBP optimization',
        'Google Review Automation (SMS / email post-job)',
        'Social media: 2 platforms, 4 organic posts/month',
        'Paid ads setup — Google OR Meta (one platform)',
        'CRM system setup — pipeline, contacts, basic workflows',
      ],
      repInfo: 'Rep earns 7% recurring (~$112/mo outbound, ~$126/mo inbound) per active client.',
      pitch: 'Website + ads + AI follow-up + CRM. The full engine — where real revenue starts.',
    },
    {
      id: '2.0',
      name: 'Authority System',
      tagline: 'Your business becomes the obvious choice in your territory.',
      priceOutbound: '$2,999',
      priceSuffix: '/month',
      features: [
        'Everything in Foundation PLUS:',
        'Website / funnel optimization',
        'SEO for Local Market Growth (3-5 nearby cities)',
        'Google Reviews & Testimonial Engine',
        'Social media: 4 platforms, 8-12 organic posts/month',
        'Paid ads: Google + Meta with A/B testing',
        'CRM management + nurturing — missed-call text-back',
        'Bi-weekly strategy call',
      ],
      repInfo: 'Rep earns 7% recurring (~$210/mo per active client).',
      pitch: 'Predictable, scalable lead generation with systems that compound.',
    },
    {
      id: '3.0',
      name: 'Market Domination',
      tagline: 'For service businesses ready to own the market, not compete in it.',
      priceOutbound: '$5,999',
      priceSuffix: '/month',
      features: [
        'Everything in Authority PLUS:',
        'High-performance conversion funnel system',
        'Aggressive SEO — weekly content, location pages, 10+ cities',
        'Full review & reputation engine',
        'Unlimited social media content — job-site video, before/after',
        'Paid ads ecosystem — Google + Meta + LSAs + retargeting',
        'Hands-on CRM & lead management',
        'Weekly strategy call + dedicated growth strategist',
      ],
      repInfo: 'Rep earns 7% recurring (~$420/mo per active client).',
      pitch: 'Scale operations. Capture territory. A full marketing department for a fraction of the cost.',
    },
    {
      id: '4.0',
      name: 'Full Stack + AI',
      tagline: 'The full system. Ads, CRM, content, AI — all of it, managed.',
      priceOutbound: '$8,000–$15,000',
      priceSuffix: '/month',
      features: [
        'Everything in Market Domination PLUS:',
        'AI Voice Receptionist — inbound calls, booking, FAQs',
        'AI Chatbot Widget — qualifies leads 24/7',
        'Automated email + DM outreach campaigns',
        'Full automation stack — custom workflows across systems',
        'Dedicated AI strategist',
      ],
      repInfo: 'Director-sold only — custom scoping per client.',
      pitch: 'The complete operating system for a service business that wants to dominate.',
    },
  ],

  AI_SERVICES: [
    {
      id: 'ai_vapi_lite',
      name: 'AI Receptionist — Lite',
      tagline: 'Solo trades + low call volume. Your foot-in-the-door AI product.',
      setup: '$499',
      monthly: '$499/mo',
      features: [
        'Up to ~150 calls/month',
        'Basic call flow + simple booking',
        'After-hours coverage',
        'Voicemail-to-text + CRM logging',
      ],
      repInfo: '50% setup ($250) + 7% recurring (~$35/mo).',
    },
    {
      id: 'ai_vapi',
      name: 'AI Receptionist — Standard',
      tagline: 'For SMBs with real call volume + custom scripts.',
      setup: '$999',
      monthly: '$999/mo',
      features: [
        'Up to ~500 calls/month',
        'Custom scripts + knowledge base',
        'CRM integration + appointment booking',
        '24/7 multi-line coverage',
      ],
      repInfo: '50% setup ($500) + 7% recurring (~$70/mo).',
    },
    {
      id: 'ai_vapi_premium',
      name: 'AI Receptionist — Premium',
      tagline: 'Multi-location, multi-language, deep integrations.',
      setup: '$1,499',
      monthly: '$1,499/mo',
      features: [
        'Unlimited call volume',
        'Multi-language + multi-line routing',
        'Deep CRM + calendar + ServiceTitan integrations',
        'Dedicated optimization + monthly tuning',
      ],
      repInfo: '50% setup ($750) + 7% recurring (~$105/mo).',
    },
    {
      id: 'ai_sms',
      name: 'AI SMS Sequences',
      tagline: 'Automated nurture + follow-up across the lead lifecycle.',
      setup: '$750',
      monthly: '$500–$750/mo',
      features: [
        'Lead-intake automation',
        'Appointment confirmations + reminders',
        'Post-job review requests',
        'Win-back + reactivation campaigns',
      ],
      repInfo: '50% setup ($375) + 7% recurring (~$35–$52/mo).',
    },
    {
      id: 'ai_email',
      name: 'AI Email Sequences',
      tagline: 'Behavior-triggered email automation managed end-to-end.',
      setup: '$500',
      monthly: '$500–$750/mo',
      features: [
        'Welcome + nurture sequences',
        'Newsletter automation',
        'Lead scoring + tagging',
        'Re-engagement campaigns',
      ],
      repInfo: '50% setup ($250) + 7% recurring (~$35–$52/mo).',
    },
    {
      id: 'ai_chat',
      name: 'AI Website Chatbot',
      tagline: 'Qualifies leads 24/7, books on the spot, hands clean data to the CRM.',
      setup: '$750',
      monthly: '$500–$750/mo',
      features: [
        'Custom-trained on the client\'s business',
        'Real-time appointment booking',
        'CRM hand-off with full conversation log',
        'Lead-qualification routing',
      ],
      repInfo: '50% setup ($375) + 7% recurring (~$35–$52/mo).',
    },
    {
      id: 'ai_crm',
      name: 'CRM Workflow Automation',
      tagline: 'The plumbing that makes every other system actually work.',
      setup: '$750',
      monthly: '$600–$900/mo',
      features: [
        'Pipeline + stage automation',
        'Missed-call text-back',
        'Lead-source attribution + reporting',
        'Cross-system workflows (calendar, ads, invoicing)',
      ],
      repInfo: '50% setup ($375) + 7% recurring (~$42–$63/mo).',
    },
  ],

  CAREER_LADDER: [
    {
      rank: 1,
      role: 'Junior Growth Associate',
      unlock: 'All new reps start here',
      earns: [
        '$500 CAD flat on every Website Package close',
        '50% setup commission on AI services',
      ],
      authority: 'Authorized to sell: Website Package + AI services (under $2,500/mo).',
    },
    {
      rank: 2,
      role: 'Field Commander',
      unlock: 'Unlocks at 10 lifetime closes',
      earns: [
        '$500 flat on Website closes',
        '7% recurring on Foundation 1.0 (~$112/mo outbound, ~$126/mo inbound per client)',
        '7% recurring on Authority 2.0 (~$210/mo per client)',
        '50% setup + 7% recurring on AI services',
      ],
      authority: 'Authorized to sell the full Marketing stack 1.0 + 2.0 and any AI service combination.',
    },
    {
      rank: 3,
      role: 'Manager Growth Lead',
      unlock: 'Unlocks at 25 lifetime closes',
      earns: [
        'Everything in Field Commander',
        'PLUS 3% override on every close your managed reps make',
        '7% recurring on Market Domination 3.0 (~$420/mo per client)',
      ],
      authority: 'Authorized to lead a team of reps + sell up to Market Domination tier.',
    },
    {
      rank: 4,
      role: 'Executive',
      unlock: 'Unlocks at 50 lifetime closes',
      earns: [
        'Everything in Manager Growth Lead',
        'Eligible for equity discussion + long-term partnership terms',
        'Co-sell on Full Stack + AI (4.0) deals with the director',
      ],
      authority: 'Full system authority. Elite tier.',
    },
  ],

  ONBOARDING: [
    { t: 'Review this document', d: 'Read through. Bring questions to the next call. We can adjust niches, scripts, and approach for your market.' },
    { t: 'Confirm the deal', d: 'We finalize commission, your target niches, the lead-source split, and any team-override terms if you bring others in.' },
    { t: 'Portal access + materials', d: 'Once you\'re onboarded we grant you full Sales Portal access — scripts, leads, call tracking, ladder progression, AI sales coach.' },
    { t: 'Start calling', d: 'You sell. We fulfill. Setup commission lands on every approved close.' },
  ],
};

const DE: LangContent = {
  kickerHero: 'Für angehende Vertriebspartner',
  heroTitle: 'Was du verkaufen wirst.',
  heroBody: 'Premmisus ist eine Marketing- und KI-Automatisierungs-Agentur für Dienstleistungsunternehmen. Wir bauen Websites, schalten Werbung, betreiben CRMs und setzen KI-Sprach- und Chat-Systeme ein, die jeden Anruf beantworten und jeden Lead 24/7 nachfassen. Zwei klare Menüs — Marketing-Leistungen und KI-Leistungen — einzeln oder gebündelt verkauft.',
  pitchKicker: 'Der Pitch in einem Satz',
  pitchQuote: '„Du hast die Kunden, wir haben das Produkt."',
  pitchBody: 'Du führst die Gespräche, Premmisus baut und betreibt alles, was der Kunde bucht.',

  marketingKicker: '01 — Marketing-Leistungen',
  marketingTitle: 'Das Kernangebot',
  marketingIntro: 'Fünf Stufen, geordnet nach Tiefe. Vertriebspartner verkaufen anfangs die ersten drei; Market Domination und Full Stack laufen direkt über den Director. Foundation hat ein Zwei-Preise-Modell — Outbound (kalt) und Inbound (warm) — unten erklärt.',
  whyTwoPricesKicker: 'Warum Foundation zwei Preise hat',
  outboundLabel: 'Outbound',
  outboundBody: '(Kaltakquise per Anruf, DM, E-Mail): du gehst auf sie zu. Mehr Reibung, weniger Hebel — du tauschst Marge gegen einen schnelleren Abschluss. Du nennst den Outbound-Preis.',
  inboundLabel: 'Inbound',
  inboundBody: '(Empfehlung, Website-Formular, bezahlte Anzeige, Social-Media-DM): sie kommen zu dir. Vorqualifiziert, höhere Kaufabsicht. Du nennst den Inbound-Preis. Kein Verhandeln, kein schlechtes Gewissen — einfach zwei echte Preise für zwei echte Lead-Quellen.',

  aiKicker: '02 — KI-Leistungen',
  aiTitle: 'Einzeln oder als Bundle',
  aiIntro: 'Jede KI-Leistung steht für sich. Wenn der Kunde drei oder mehr bündelt, bekommt er einen Bundle-Rabatt. Der KI-Telefonassistent hat drei Stufen — Lite ist dein Einstiegsangebot, Standard ist das Arbeitstier, Premium für die großen Player.',

  commissionKicker: '03 — Provision',
  commissionTitle: 'So wirst du bezahlt',
  statSetupLabel: 'Einrichtungs-Provision',
  statSetupValue: '50%',
  statSetupSub: 'jeder Einrichtungsgebühr, gezahlt nach Director-Freigabe',
  statRecurringLabel: 'Wiederkehrend (MRR)',
  statRecurringValue: '7%',
  statRecurringSub: 'jeden Monat, in dem der Kunde bleibt — lebenslang für die gesamte Kundenlaufzeit',
  statOverrideLabel: 'Manager-Override',
  statOverrideValue: '3%',
  statOverrideSub: 'auf Abschlüsse deiner Team-Mitglieder (ab Manager Growth Lead)',
  clawbackKicker: 'Provisionsschutz — 90-Tage-Frist',
  clawbackIntro: 'Wenn du einen Kunden abschließt, besteht deine Provision aus zwei Teilen:',
  clawbackSetupBullet: 'Einrichtungs-Provision — gehört dir für immer. Wir fordern sie nie zurück. Niemals.',
  clawbackRecurringBullet: 'Wiederkehrend (7%) — die ersten 90 Tage in Frage gestellt. Kündigt ein Kunde in diesem Fenster, wird die wiederkehrende Provision aus diesen Monaten zurückgebucht. Ab Tag 91 ist sie lebenslang gesichert.',
  clawbackException: 'Ausnahme: Wenn ein Kunde kündigt, weil Premmisus nicht geliefert hat, was verkauft wurde — falsches Produkt, verpasste Termine, defekte Systeme — ist das unser Problem, nicht deins. Keine Rückforderung. Der Director entscheidet im Zweifelsfall, und Vertriebspartner bekommen die Vermutung zu ihren Gunsten.',

  ladderKicker: '04 — Karriere-Stufen',
  ladderTitle: 'Wie du aufsteigst',
  ladderIntro: 'Jeder Vertriebspartner startet als Junior Growth Associate. Jede Stufe schaltet mehr vom Angebot und mehr Provision frei. Die einzige Hürde ist die Anzahl deiner lebenslangen Abschlüsse — keine Quoten, keine Zeitdruck. Du steigst auf, wenn du die Abschlüsse geliefert hast.',
  earningsAtTier: 'Verdienst auf dieser Stufe',
  whatYouEarn: 'Was du verdienst',

  onboardingKicker: '05 — Onboarding',
  onboardingTitle: 'Wie es weitergeht',

  priceMonthly: '/Monat',
  inboundPrefix: 'Inbound:',
  youEarnPrefix: 'Du verdienst:',
  setupLabel: 'Einrichtung',
  monthlyLabel: 'Monatlich',
  navWelcome: 'Willkommen',
  navMarketing: 'Marketing',
  navAI: 'KI-Leistungen',
  navCommission: 'Provision',
  navLadder: 'Karriere',
  navNext: 'Nächste Schritte',
  downloadPDF: 'PDF herunterladen',
  downloading: 'Wird erstellt…',
  forProspectiveReps: 'Für angehende Vertriebspartner',
  offerBadge: 'Angebot',

  MARKETING_TIERS: [
    {
      id: '0.5',
      name: 'Website-Paket',
      tagline: 'Der Türöffner. Geringes Risiko, große Wirkung.',
      priceOutbound: '€1.500',
      priceSuffix: 'EUR einmalig',
      features: [
        '€500 Anzahlung + €1.000 bei Auslieferung',
        'Lieferzeit: 5 Tage',
        'Maßgeschneidert, auf Konversion ausgelegt',
        'Schnell, mobile-first, auf Weltklasse-Infrastruktur gehostet',
        'Basis-SEO + Google-Business-Profile-Optimierung',
        'Der Kunde besitzt sie für immer (kein Agentur-Lock-in)',
        'Optional: €99/Monat Wartung',
      ],
      repInfo: 'Vertriebspartner verdient €500 EUR pauschal pro Abschluss.',
      pitch: 'Führe mit dem Asset, nicht mit dem Preis. Zeig die Vorschau — sie verkauft sich von selbst.',
    },
    {
      id: '1.0',
      name: 'Foundation',
      tagline: 'Für Dienstleister, die endlich sichtbar werden wollen.',
      priceOutbound: '€999',
      priceInbound: '€1.199',
      priceSuffix: '/Monat',
      highlight: true,
      features: [
        'Alles aus dem Website-Paket',
        'Online-Präsenz: Setup / Upgrade / Audit',
        'Lokales Basis-SEO + GBP-Optimierung',
        'Google-Bewertungs-Automatisierung (SMS / E-Mail nach Auftrag)',
        'Social Media: 2 Plattformen, 4 organische Beiträge/Monat',
        'Anzeigen-Setup — Google ODER Meta (eine Plattform)',
        'CRM-Setup — Pipeline, Kontakte, Basis-Workflows',
      ],
      repInfo: 'Vertriebspartner verdient 7% wiederkehrend (~€70/Mo Outbound, ~€84/Mo Inbound) pro aktivem Kunden.',
      pitch: 'Website + Anzeigen + KI-Nachfass + CRM. Der volle Motor — hier fängt echter Umsatz an.',
    },
    {
      id: '2.0',
      name: 'Authority System',
      tagline: 'Das Unternehmen wird zur offensichtlichen Wahl im Gebiet.',
      priceOutbound: '€1.799',
      priceSuffix: '/Monat',
      features: [
        'Alles aus Foundation PLUS:',
        'Website- / Funnel-Optimierung',
        'SEO für lokales Wachstum (3-5 Nachbarstädte)',
        'Bewertungs- und Empfehlungs-Engine',
        'Social Media: 4 Plattformen, 8-12 organische Beiträge/Monat',
        'Anzeigen: Google + Meta mit A/B-Tests',
        'CRM-Betreuung + Nurturing — automatische SMS bei verpassten Anrufen',
        'Strategie-Call alle zwei Wochen',
      ],
      repInfo: 'Vertriebspartner verdient 7% wiederkehrend (~€126/Mo pro aktivem Kunden).',
      pitch: 'Planbare, skalierbare Lead-Generierung mit Systemen, die sich verstärken.',
    },
    {
      id: '3.0',
      name: 'Market Domination',
      tagline: 'Für Dienstleister, die den Markt besitzen wollen — nicht nur mitspielen.',
      priceOutbound: '€3.499',
      priceSuffix: '/Monat',
      features: [
        'Alles aus Authority PLUS:',
        'Hochperformantes Conversion-Funnel-System',
        'Aggressives SEO — wöchentlicher Content, Stadt-Seiten, 10+ Städte',
        'Komplette Bewertungs- und Reputations-Engine',
        'Unbegrenzter Social-Media-Content — Baustellen-Video, Vorher/Nachher',
        'Anzeigen-Ökosystem — Google + Meta + LSAs + Retargeting',
        'Aktives CRM- und Lead-Management',
        'Wöchentlicher Strategie-Call + persönlicher Growth-Stratege',
      ],
      repInfo: 'Vertriebspartner verdient 7% wiederkehrend (~€245/Mo pro aktivem Kunden).',
      pitch: 'Skalieren. Gebiet erobern. Eine komplette Marketing-Abteilung zum Bruchteil der Kosten.',
    },
    {
      id: '4.0',
      name: 'Full Stack + KI',
      tagline: 'Das volle System. Anzeigen, CRM, Content, KI — alles aus einer Hand.',
      priceOutbound: '€4.999–€8.999',
      priceSuffix: '/Monat',
      features: [
        'Alles aus Market Domination PLUS:',
        'KI-Telefonassistent — eingehende Anrufe, Terminbuchung, FAQs',
        'KI-Chatbot — qualifiziert Leads 24/7',
        'Automatisierte E-Mail- + DM-Kampagnen',
        'Voller Automatisierungs-Stack — maßgeschneiderte Workflows',
        'Persönlicher KI-Stratege',
      ],
      repInfo: 'Nur über den Director — individuelles Angebot pro Kunde.',
      pitch: 'Das komplette Betriebssystem für ein Dienstleistungs-Unternehmen, das den Markt dominieren will.',
    },
  ],

  AI_SERVICES: [
    {
      id: 'ai_vapi_lite',
      name: 'KI-Telefonassistent — Lite',
      tagline: 'Einzelunternehmer + geringes Anrufvolumen. Dein Einstiegsangebot.',
      setup: '€499',
      monthly: '€299/Mo',
      features: [
        'Bis zu ~150 Anrufe/Monat',
        'Einfacher Anruf-Flow + simple Terminbuchung',
        'Erreichbarkeit nach Geschäftszeiten',
        'Voicemail-zu-Text + CRM-Protokoll',
      ],
      repInfo: '50% Setup (€250) + 7% wiederkehrend (~€21/Mo).',
    },
    {
      id: 'ai_vapi',
      name: 'KI-Telefonassistent — Standard',
      tagline: 'Für KMUs mit echtem Anrufvolumen + maßgeschneidertem Skript.',
      setup: '€799',
      monthly: '€499/Mo',
      features: [
        'Bis zu ~500 Anrufe/Monat',
        'Eigenes Skript + Wissensdatenbank',
        'CRM-Integration + Terminbuchung',
        '24/7 Mehrleitungs-Betrieb',
      ],
      repInfo: '50% Setup (€400) + 7% wiederkehrend (~€35/Mo).',
    },
    {
      id: 'ai_vapi_premium',
      name: 'KI-Telefonassistent — Premium',
      tagline: 'Mehrere Standorte, mehrsprachig, tiefe Integrationen.',
      setup: '€1.500',
      monthly: '€899/Mo',
      features: [
        'Unbegrenztes Anrufvolumen',
        'Mehrsprachig + Mehrleitungs-Routing',
        'Tiefe CRM-, Kalender- und Branchen-Integrationen',
        'Persönliche Optimierung + monatliches Tuning',
      ],
      repInfo: '50% Setup (€750) + 7% wiederkehrend (~€63/Mo).',
    },
    {
      id: 'ai_sms',
      name: 'KI-SMS-Sequenzen',
      tagline: 'Automatisches Nurturing + Nachfass über den ganzen Lead-Lifecycle.',
      setup: '€499',
      monthly: '€299–€499/Mo',
      features: [
        'Automatische Lead-Aufnahme',
        'Terminbestätigungen + Erinnerungen',
        'Bewertungs-Anfragen nach Auftragsabschluss',
        'Win-Back- + Reaktivierungs-Kampagnen',
      ],
      repInfo: '50% Setup + 7% wiederkehrend.',
    },
    {
      id: 'ai_email',
      name: 'KI-E-Mail-Sequenzen',
      tagline: 'Verhaltens-getriggerte E-Mail-Automation, von Anfang bis Ende betreut.',
      setup: '€499',
      monthly: '€299–€499/Mo',
      features: [
        'Willkommens- + Nurture-Sequenzen',
        'Newsletter-Automation',
        'Lead-Scoring + Tagging',
        'Reaktivierungs-Kampagnen',
      ],
      repInfo: '50% Setup + 7% wiederkehrend.',
    },
    {
      id: 'ai_chat',
      name: 'KI-Website-Chatbot',
      tagline: 'Qualifiziert Leads 24/7, bucht direkt Termine, gibt saubere Daten ans CRM.',
      setup: '€499',
      monthly: '€299–€499/Mo',
      features: [
        'Auf das Geschäft des Kunden trainiert',
        'Echtzeit-Terminbuchung',
        'CRM-Übergabe mit vollständigem Gesprächsverlauf',
        'Lead-Qualifizierungs-Routing',
      ],
      repInfo: '50% Setup + 7% wiederkehrend.',
    },
    {
      id: 'ai_crm',
      name: 'CRM-Workflow-Automation',
      tagline: 'Die Klempnerei, die alle anderen Systeme zum Laufen bringt.',
      setup: '€499',
      monthly: '€399–€599/Mo',
      features: [
        'Pipeline- + Stage-Automation',
        'Automatische SMS bei verpassten Anrufen',
        'Lead-Quellen-Tracking + Reporting',
        'System-übergreifende Workflows (Kalender, Anzeigen, Rechnungen)',
      ],
      repInfo: '50% Setup + 7% wiederkehrend.',
    },
  ],

  CAREER_LADDER: [
    {
      rank: 1,
      role: 'Junior Growth Associate',
      unlock: 'Hier starten alle neuen Vertriebspartner',
      earns: [
        '€500 EUR pauschal pro Website-Paket-Abschluss',
        '50% Einrichtungs-Provision auf KI-Leistungen',
      ],
      authority: 'Verkaufsberechtigt: Website-Paket + KI-Leistungen (unter €2.500/Mo).',
    },
    {
      rank: 2,
      role: 'Field Commander',
      unlock: 'Freigeschaltet ab 10 lebenslangen Abschlüssen',
      earns: [
        '€500 pauschal auf Website-Abschlüsse',
        '7% wiederkehrend auf Foundation 1.0 (~€70/Mo Outbound, ~€84/Mo Inbound pro Kunde)',
        '7% wiederkehrend auf Authority 2.0 (~€126/Mo pro Kunde)',
        '50% Setup + 7% wiederkehrend auf KI-Leistungen',
      ],
      authority: 'Verkaufsberechtigt: kompletter Marketing-Stack 1.0 + 2.0 und jede KI-Kombination.',
    },
    {
      rank: 3,
      role: 'Manager Growth Lead',
      unlock: 'Freigeschaltet ab 25 lebenslangen Abschlüssen',
      earns: [
        'Alles vom Field Commander',
        'PLUS 3% Override auf jeden Abschluss deiner Team-Mitglieder',
        '7% wiederkehrend auf Market Domination 3.0 (~€245/Mo pro Kunde)',
      ],
      authority: 'Berechtigt, ein Team zu führen + bis zur Stufe Market Domination zu verkaufen.',
    },
    {
      rank: 4,
      role: 'Executive',
      unlock: 'Freigeschaltet ab 50 lebenslangen Abschlüssen',
      earns: [
        'Alles vom Manager Growth Lead',
        'Berechtigt für Equity-Gespräche + langfristige Partnerschafts-Konditionen',
        'Co-Sell bei Full-Stack-+-KI-Deals (4.0) zusammen mit dem Director',
      ],
      authority: 'Volle System-Autorität. Elite-Stufe.',
    },
  ],

  ONBOARDING: [
    { t: 'Dieses Dokument durchgehen', d: 'Durchlesen. Fragen zum nächsten Call mitbringen. Wir können Nischen, Skripte und Vorgehen für deinen Markt anpassen.' },
    { t: 'Deal bestätigen', d: 'Wir finalisieren Provision, Ziel-Nischen, den Lead-Quellen-Split und etwaige Team-Override-Konditionen, falls du andere ins Boot holst.' },
    { t: 'Portal-Zugang + Materialien', d: 'Sobald du onboarded bist, bekommst du vollen Sales-Portal-Zugang — Skripte, Leads, Call-Tracking, Stufenfortschritt, KI-Sales-Coach.' },
    { t: 'Loslegen', d: 'Du verkaufst. Wir liefern. Die Einrichtungs-Provision landet bei jedem freigegebenen Abschluss bei dir.' },
  ],
};

const CONTENT: Record<Lang, LangContent> = { en: EN, de: DE };

export default function OfferPage() {
  const [downloading, setDownloading] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const t = CONTENT[lang];

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 60);
  };

  const navSections = [
    { id: 'intro', label: t.navWelcome },
    { id: 'marketing', label: t.navMarketing },
    { id: 'ai', label: t.navAI },
    { id: 'commission', label: t.navCommission },
    { id: 'ladder', label: t.navLadder },
    { id: 'next', label: t.navNext },
  ];

  return (
    <div id="offer-root" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: "'Inter','Roboto',system-ui,sans-serif" }}>
      <style>{`
        html { scroll-padding-top: 72px; }
        .offer-nav-links { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 720px) {
          .offer-nav-links { display: none !important; }
          .offer-nav-row { gap: 10px !important; }
        }
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          html, body { background: var(--text-primary) !important; color: #111 !important; }
          #offer-root { background: var(--text-primary) !important; color: #111 !important; }
          .print-area, .print-area > section, .print-area > section > div,
          .print-area main, .print-area > div { background: transparent !important; }
          .print-area p, .print-area li, .print-area span, .print-area strong, .print-area em { color: #222 !important; }
          .print-area h1, .print-area h2, .print-area h3, .print-area [role=heading] { color: var(--bg-app) !important; }
          .print-area article, .print-area .card, .print-area .card-glow {
            background: var(--text-primary) !important;
            border: 1px solid #d0d0d0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-area .card-glow { border: 1.5px solid #00838f !important; }
          .print-area p[style*="color: rgb(0, 240, 255)"],
          .print-area p[style*="color:#00F0FF"],
          .print-area [style*="color: rgb(0, 240, 255)"],
          .print-area [style*="color:#00F0FF"] { color: #006d75 !important; }
          .print-area article > div[style*="rgba(0,240,255"] {
            background: var(--text-primary) !important;
            border-color: #006d75 !important;
            color: #006d75 !important;
          }
          nav { position: static !important; display: none !important; }
          section { margin-bottom: 24px !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <nav className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-nav)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--bg-sidebar-line)',
      }}>
        <div className="offer-nav-row" style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <PremmisusWordmark height={18} />
          <div className="offer-nav-links">
            {navSections.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ color: 'var(--text-tertiary)', fontSize: 13, textDecoration: 'none' }}
                 onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-ink)')}
                 onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>{s.label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LangToggle lang={lang} setLang={setLang} />
            <button onClick={handleDownload} disabled={downloading} className="btn-pdf">
              {downloading ? t.downloading : t.downloadPDF}
            </button>
          </div>
        </div>
      </nav>

      <main className="print-area" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* HERO */}
        <section id="intro" style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 12px' }}>
            {t.forProspectiveReps}
          </p>
          <div role="heading" aria-level={1} style={{ fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 14px', lineHeight: 1.1 }}>
            {t.heroTitle}
          </div>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 760, margin: '0 0 28px' }}>
            {t.heroBody}
          </p>
          <div className="card-glow" style={{ padding: '20px 24px', maxWidth: 760 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px', fontFamily: "'JetBrains Mono',monospace" }}>
              {t.pitchKicker}
            </p>
            <p style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
              <em style={{ color: 'var(--text-primary)' }}>{t.pitchQuote}</em> {t.pitchBody}
            </p>
          </div>
        </section>

        {/* MARKETING */}
        <section id="marketing" style={{ marginBottom: 56 }}>
          <SectionHeading kicker={t.marketingKicker} title={t.marketingTitle} />
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 }}>
            {t.marketingIntro}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {t.MARKETING_TIERS.map(tier => (
              <article key={tier.id} className={tier.highlight ? 'card-glow' : 'card'} style={{
                padding: '24px 26px', position: 'relative',
                ...(tier.highlight ? { borderColor: ACCENT } : {}),
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: ACCENT, letterSpacing: '.2em' }}>{tier.id}</span>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{tier.name}</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>{tier.tagline}</p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>{tier.priceOutbound}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{tier.priceSuffix}</span>
                </div>
                {tier.priceInbound && (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12, margin: '0 0 4px' }}>
                    <span style={{ color: ACCENT, fontFamily: "'JetBrains Mono',monospace" }}>{t.inboundPrefix}</span>{' '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{tier.priceInbound}</span>{tier.priceSuffix}
                  </p>
                )}

                <ul style={{ padding: 0, margin: '18px 0', listStyle: 'none' }}>
                  {tier.features.map((f, i) => (
                    <li key={i} style={{ position: 'relative', paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
                      <span style={{ position: 'absolute', left: 0, color: ACCENT }}>›</span>{f}
                    </li>
                  ))}
                </ul>

                <div style={{ borderTop: '1px solid var(--accent-glow-04)', paddingTop: 14, marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 6px', fontFamily: "'JetBrains Mono',monospace" }}>
                    {t.whatYouEarn}
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5, margin: '0 0 10px' }}>{tier.repInfo}</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic', margin: 0 }}>{tier.pitch}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="card" style={{ padding: '20px 24px', marginTop: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px', fontFamily: "'JetBrains Mono',monospace" }}>
              {t.whyTwoPricesKicker}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{t.outboundLabel}</strong> {t.outboundBody}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{t.inboundLabel}</strong> {t.inboundBody}
            </p>
          </div>
        </section>

        {/* AI SERVICES */}
        <section id="ai" style={{ marginBottom: 56 }}>
          <SectionHeading kicker={t.aiKicker} title={t.aiTitle} />
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 }}>
            {t.aiIntro}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {t.AI_SERVICES.map(svc => (
              <article key={svc.id} className="card" style={{ padding: '20px 22px' }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>{svc.name}</h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.5, margin: '0 0 14px', minHeight: 36 }}>{svc.tagline}</p>

                <div style={{ display: 'flex', gap: 18, marginBottom: 14, padding: '10px 0', borderTop: '1px solid var(--accent-glow-04)', borderBottom: '1px solid var(--accent-glow-04)' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace", margin: '0 0 2px' }}>{t.setupLabel}</p>
                    <p style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{svc.setup}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace", margin: '0 0 2px' }}>{t.monthlyLabel}</p>
                    <p style={{ fontSize: 16, color: ACCENT, fontWeight: 700, margin: 0 }}>{svc.monthly}</p>
                  </div>
                </div>

                <ul style={{ padding: 0, margin: '0 0 14px', listStyle: 'none' }}>
                  {svc.features.map((f, i) => (
                    <li key={i} style={{ position: 'relative', paddingLeft: 14, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.7 }}>
                      <span style={{ position: 'absolute', left: 0, color: ACCENT }}>›</span>{f}
                    </li>
                  ))}
                </ul>

                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid var(--accent-glow-04)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{t.youEarnPrefix}</strong> {svc.repInfo}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* COMMISSION */}
        <section id="commission" style={{ marginBottom: 56 }}>
          <SectionHeading kicker={t.commissionKicker} title={t.commissionTitle} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            <CommissionStat label={t.statSetupLabel} value={t.statSetupValue} sub={t.statSetupSub} />
            <CommissionStat label={t.statRecurringLabel} value={t.statRecurringValue} sub={t.statRecurringSub} />
            <CommissionStat label={t.statOverrideLabel} value={t.statOverrideValue} sub={t.statOverrideSub} />
          </div>

          <div className="card-glow" style={{ padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px', fontFamily: "'JetBrains Mono',monospace" }}>
              {t.clawbackKicker}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
              {t.clawbackIntro}
            </p>
            <ul style={{ padding: 0, margin: '0 0 14px', listStyle: 'none' }}>
              <li style={{ position: 'relative', paddingLeft: 16, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                <span style={{ position: 'absolute', left: 0, color: '#4ade80' }}>✓</span>
                {t.clawbackSetupBullet}
              </li>
              <li style={{ position: 'relative', paddingLeft: 16, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                <span style={{ position: 'absolute', left: 0, color: '#fbbf24' }}>○</span>
                {t.clawbackRecurringBullet}
              </li>
            </ul>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {t.clawbackException}
            </p>
          </div>
        </section>

        {/* CAREER LADDER */}
        <section id="ladder" style={{ marginBottom: 56 }}>
          <SectionHeading kicker={t.ladderKicker} title={t.ladderTitle} />
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28, maxWidth: 760 }}>
            {t.ladderIntro}
          </p>

          <div style={{ display: 'grid', gap: 14 }}>
            {t.CAREER_LADDER.map((rung, i) => (
              <article key={rung.rank} className={i === t.CAREER_LADDER.length - 1 ? 'card-glow' : 'card'} style={{
                padding: '22px 26px',
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                gap: 22,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'var(--accent-glow-08)',
                  border: `1.5px solid ${ACCENT}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22,
                  color: ACCENT,
                }}>
                  {rung.rank}
                </div>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{rung.role}</h3>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
                      {rung.unlock}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{rung.authority}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 8px', fontFamily: "'JetBrains Mono',monospace" }}>
                    {t.earningsAtTier}
                  </p>
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                    {rung.earns.map((e, k) => (
                      <li key={k} style={{ position: 'relative', paddingLeft: 16, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
                        <span style={{ position: 'absolute', left: 0, color: ACCENT }}>›</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* NEXT STEPS */}
        <section id="next" style={{ marginBottom: 24 }}>
          <SectionHeading kicker={t.onboardingKicker} title={t.onboardingTitle} />
          <ol style={{ padding: 0, margin: 0, listStyle: 'none', counterReset: 'step' }}>
            {t.ONBOARDING.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--accent-glow-04)' }}>
                <span style={{ flex: '0 0 36px', height: 36, borderRadius: '50%', background: 'var(--accent-glow-10)', border: `1px solid ${ACCENT}`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{i + 1}</span>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{s.t}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--accent-glow-04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>premmisus.ca</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>v1 · 2026-05-11</p>
        </footer>
      </main>
    </div>
  );
}

/* Official Premmisus wordmark — "PREMM" + 3 stacked chevrons + "SUS".
   Mirrors the public-site logo at premmisus.ca/components/Logo.tsx so the
   portal and the website read as one brand. The chevrons replace the "I"
   in PREMMISUS. */
function PremmisusWordmark({ height = 20 }: { height?: number }) {
  const fontSize = height;
  const svgSize = Math.round(height * 1.1);
  // Text + middle chevron inherit `currentColor` from the wrapper, which is
  // set via inline style on the div. The outer color resolves through the
  // theme — in light mode the wordmark goes dark; in dark mode it stays
  // bright. Top/bottom chevrons keep their cyan brand color in both themes.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none', flexShrink: 0, color: 'var(--text-primary)' }} aria-label="Premmisus">
      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize, letterSpacing: '0.18em', lineHeight: 1 }}>PREMM</span>
      <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 2px' }}>
        <g strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2.5} fill="none">
          <path d="M5 8 L12 3 L19 8" stroke="#00F0FF" />
          <path d="M5 14 L12 9 L19 14" stroke="currentColor" />
          <path d="M5 20 L12 15 L19 20" stroke="#00F0FF" />
        </g>
      </svg>
      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize, letterSpacing: '0.18em', lineHeight: 1 }}>SUS</span>
    </div>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const btn = (active: boolean): React.CSSProperties => ({
    padding: '5px 9px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono',monospace",
    letterSpacing: '.1em',
    background: active ? 'var(--accent-glow-12)' : 'transparent',
    color: active ? ACCENT : 'var(--text-muted)',
    border: `1px solid ${active ? ACCENT : 'var(--border)'}`,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all .15s',
  });
  return (
    <div className="no-print" style={{ display: 'flex', gap: 4 }}>
      <button onClick={() => setLang('en')} style={btn(lang === 'en')} aria-label="English">EN</button>
      <button onClick={() => setLang('de')} style={btn(lang === 'de')} aria-label="Deutsch">DE</button>
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: ACCENT, letterSpacing: '.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>{kicker}</p>
      <div role="heading" aria-level={2} style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.15 }}>{title}</div>
    </div>
  );
}

function CommissionStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '.18em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace", margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 36, fontWeight: 900, color: ACCENT, margin: '0 0 8px', lineHeight: 1 }}>{value}</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{sub}</p>
    </div>
  );
}
