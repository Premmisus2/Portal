export const HANDOFF_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxVsb_aNVgIVS7wCUtOVzi3kJS2VyfSiUp5N3e2IPyNXjl9xSAc1yh3RarJwgG1CMdb/exec';
export const PORTAL_AUTH_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwE0Q0oRyL0oLfvjnYe9jWzhwu0stKEwWnCIZTbqTcLGsYs286p09gNovfTzxF4qk2P/exec';
export const CALL_LOG_WEBHOOK = 'https://script.google.com/macros/s/AKfycbz2gylsLejcBUe1zjSkuJmE8tWUFcMfqNVzV0ZF-cfCe9tk5U-Feq2SI20xQX1kRQ/exec';
export const CALENDAR_ENDPOINT = '';
export const NOTES_EXPIRY_DAYS = 7;

export const DIRECTOR_EMAILS = ['elliott@premmisus.ca', 'elliott@premmisus.com'];

export const PRODUCT_LABELS: Record<number, string> = {
  1: 'Website Package',
  2: 'Foundation 1.0',
  3: 'Authority System 2.0',
  4: 'Market Domination 3.0',
};

export const OUTCOME_LABELS: Record<string, string> = {
  no_answer: 'No Answer',
  voicemail_left: 'Voicemail Left',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  booked_call: 'Booked Call',
  discovery_completed: 'Discovery Booked',
  no_show: 'No Show',
  wrong_number: 'Wrong Number',
  inbound_callback: 'Inbound Callback',
  ai_receptionist: 'AI Receptionist',
};

export const INBOUND_DISPOSITION_LABELS: Record<string, string> = {
  interested: 'Interested — Move Forward',
  follow_up: 'Follow Up Later',
  not_interested: 'Not Interested Right Now',
  dnc: 'Do Not Contact',
  wrong_person: 'Wrong Person / Mis-dial',
};

export const INBOUND_DISPOSITION_COLORS: Record<string, string> = {
  interested: '#22c55e',
  follow_up: '#F59E0B',
  not_interested: '#888',
  dnc: '#ff6060',
  wrong_person: '#555',
};

export const CALLBACK_REASON_LABELS: Record<string, string> = {
  too_busy: 'Too Busy / On Job Site',
  has_someone: 'Has Someone Working On It',
  call_later: 'Asked to Call Back Later',
  interested: 'Interested But Not Ready',
  wants_info: 'Wants More Information',
  owner_away: 'Owner Away from Phone',
  other: 'Other',
};

export const CALLBACK_REASON_COLORS: Record<string, string> = {
  too_busy: '#F59E0B',
  has_someone: '#888',
  call_later: '#F59E0B',
  interested: '#22c55e',
  wants_info: '#3B82F6',
  owner_away: '#A78BFA',
  other: '#555',
};

export const OUTCOME_COLORS: Record<string, string> = {
  no_answer: '#555',
  voicemail_left: '#F59E0B',
  callback_requested: '#F59E0B',
  not_interested: '#ff6060',
  booked_call: '#22c55e',
  discovery_completed: '#00F0FF',
  no_show: '#ff8800',
  wrong_number: '#ff6060',
  inbound_callback: '#00F0FF',
  ai_receptionist: '#A78BFA',
};

export const NICHE_LIST = [
  'Cleaning', 'Construction', 'Construction & Handyman', 'Electrical', 'Fencing',
  'Flooring', 'Junk Removal', 'Landscaping', 'Moving', 'Painting',
  'Plumbing', 'Pressure Washing', 'Roofing', 'Snow Removal', 'Window Washing',
];

export const USD_TO_CAD = 1.38;

// Pricing locked 2026-05-11 after market audit (Hook Agency, Service Scalers,
// Scorpion, Blue Corona, Caliph Digital comps; Vapi/GHL raw-cost teardown).
// Foundation 1.0 uses Option C — inbound vs outbound split. Reps quote based on
// lead source; this constant carries the OUTBOUND price (90%+ of current closes).
// Inbound price is in INBOUND_OVERRIDE_PRICING below.
export const CLOSE_PRODUCTS = [
  // Marketing tiers
  { id: 'website',      label: 'Website Package',         pts: 1, price: '$1,500 CAD',        commission: '$500 CAD flat',               setupFee: null },
  { id: 'foundation',   label: 'Foundation 1.0',           pts: 2, price: '$1,599/mo',          commission: '~$112 CAD/mo',                setupFee: null },
  { id: 'authority',    label: 'Authority System 2.0',     pts: 3, price: '$2,999/mo',          commission: '~$210 CAD/mo',                setupFee: null },
  { id: 'domination',   label: 'Market Domination 3.0',   pts: 4, price: '$5,999/mo',          commission: '~$420 CAD/mo',                setupFee: null },
  // AI services — individual (1 pt each)
  { id: 'ai_vapi_lite',     label: 'AI Receptionist — Lite',     pts: 1, price: '$499/mo',           commission: '$250 upfront + ~$35/mo',      setupFee: '$499' },
  { id: 'ai_vapi',          label: 'AI Receptionist — Standard', pts: 1, price: '$999/mo',           commission: '$500 upfront + ~$70/mo',      setupFee: '$999' },
  { id: 'ai_vapi_premium',  label: 'AI Receptionist — Premium',  pts: 2, price: '$1,499/mo',         commission: '$750 upfront + ~$105/mo',     setupFee: '$1,499' },
  { id: 'ai_sms',       label: 'SMS Sequences',            pts: 1, price: '$500-750/mo',         commission: '$375 upfront + ~$44/mo',      setupFee: '$750' },
  { id: 'ai_email',     label: 'Email Sequences',          pts: 1, price: '$500-750/mo',         commission: '$250 upfront + ~$35/mo',      setupFee: '$500' },
  { id: 'ai_chat',      label: 'Website Chatbot',          pts: 1, price: '$500-750/mo',         commission: '$375 upfront + ~$44/mo',      setupFee: '$750' },
  { id: 'ai_crm',       label: 'CRM Automation',           pts: 1, price: '$600-900/mo',         commission: '$375 upfront + ~$53/mo',      setupFee: '$750' },
  // AI bundles — pts by total package value
  { id: 'ai_bundle_2',  label: 'AI Bundle (~$2K/mo)',      pts: 2, price: '~$2,000/mo',          commission: '50% setup + 7% MRR',          setupFee: 'Varies' },
  { id: 'ai_bundle_3',  label: 'AI Bundle (~$2.5K+/mo)',   pts: 3, price: '~$2,500-5,999/mo',    commission: '50% setup + 7% MRR',          setupFee: 'Varies' },
  { id: 'ai_bundle_4',  label: 'AI Bundle ($6K+/mo)',      pts: 4, price: '$6,000+/mo',           commission: '50% setup + 7% MRR',          setupFee: 'Varies' },
];

// Inbound prices for Option C. When the lead source is warm (referral, website
// opt-in, paid-ad form, social DM inbound, organic content), reps quote the
// inbound number. The product itself is identical — only the price changes
// based on how the prospect arrived.
export const INBOUND_OVERRIDE_PRICING: Record<string, { price: string; commission: string }> = {
  foundation: { price: '$1,799/mo', commission: '~$126 CAD/mo' },
  // Authority / Market Domination / Full Stack stay single-price for now.
  // Revisit when inbound channel matures (paid ads + social + SEO live).
};

// DACH pricing — applies when the client is in Germany / Austria / Switzerland.
// EUR ceiling is real (Aaron.ai €350, Alveni €299-€499, Parloa €149+). Do NOT
// quote CAD numbers in EUR; that prices Premmisus 2-3x above the market.
export const DACH_PRICING: Record<string, { price: string; setupFee?: string; commission?: string }> = {
  website:           { price: '€1,500 EUR',           commission: '€500 EUR flat' },
  foundation:        { price: '€999/mo',              commission: '~€70/mo' }, // inbound override: €1,199/mo
  authority:         { price: '€1,799/mo',            commission: '~€126/mo' },
  domination:        { price: '€3,499/mo',            commission: '~€245/mo' },
  full_stack:        { price: '€4,999-€8,999/mo',     commission: '50% setup + 7% MRR' },
  ai_vapi_lite:      { price: '€299/mo',              setupFee: '€499',   commission: '€250 upfront + ~€21/mo' },
  ai_vapi:           { price: '€499/mo',              setupFee: '€799',   commission: '€400 upfront + ~€35/mo' },
  ai_vapi_premium:   { price: '€899/mo',              setupFee: '€1,500', commission: '€750 upfront + ~€63/mo' },
  ai_sms:            { price: '€299-499/mo',          setupFee: '€499',   commission: '50% setup + 7% MRR' },
  ai_email:          { price: '€299-499/mo',          setupFee: '€499',   commission: '50% setup + 7% MRR' },
  ai_chat:           { price: '€299-499/mo',          setupFee: '€499',   commission: '50% setup + 7% MRR' },
  ai_crm:            { price: '€399-599/mo',          setupFee: '€499',   commission: '50% setup + 7% MRR' },
  bundle_discount:   { price: '€150 off when ≥3 services' },
};

// Bundle discount — CAD market.
export const BUNDLE_DISCOUNT_CAD = 250;

// Commission framework — locked 2026-05-11.
// Setup: 50% of the setup fee, paid on director approval.
// Recurring: 7% of MRR every month the client stays.
// Manager override: 3% on team-member sales (Manager Growth Lead+).
// CLAWBACK: 90-day cliff on RECURRING only. Setup commission stays untouched.
//   - If the client cancels within 90 days, the recurring commission earned
//     during those months is deducted from the rep's next commission check.
//   - EXCEPTION: clawback does NOT apply if the cancellation is due to a
//     Premmisus delivery failure (we didn't deliver what was sold). Director
//     judgement call on which is which.
export const COMMISSION_FRAMEWORK = {
  setupPercent: 0.5,
  recurringPercent: 0.07,
  managerOverridePercent: 0.03,
  clawbackWindowDays: 90,
  clawbackAppliesToSetup: false,
  clawbackExceptionDeliveryFailure: true,
};

export type TierInfo = {
  name: string;
  next: string | null;
  at: number | null;
  color: string;
  barColor: string;
  badge: { bg: string; border: string; color: string };
  hasRecurring: boolean;
  hasOverride: boolean;
};

export const getTierInfo = (closes: number): TierInfo => {
  if (closes < 10) return {
    name: 'Junior Growth Associate', next: 'Field Commander', at: 10,
    color: '#fb923c', barColor: '#f97316',
    badge: { bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.3)', color: '#fb923c' },
    hasRecurring: false, hasOverride: false,
  };
  if (closes < 25) return {
    name: 'Field Commander', next: 'Manager Growth Lead', at: 25,
    color: '#00F0FF', barColor: '#00c4cc',
    badge: { bg: 'rgba(0,240,255,.1)', border: 'rgba(0,240,255,.3)', color: '#00F0FF' },
    hasRecurring: true, hasOverride: false,
  };
  if (closes < 50) return {
    name: 'Manager Growth Lead', next: 'Executive', at: 50,
    color: '#60a5fa', barColor: '#0072FF',
    badge: { bg: 'rgba(0,114,255,.12)', border: 'rgba(0,114,255,.3)', color: '#60a5fa' },
    hasRecurring: true, hasOverride: true,
  };
  return {
    name: 'Executive', next: null, at: null,
    color: '#a78bfa', barColor: '#7c3aed',
    badge: { bg: 'rgba(124,58,237,.12)', border: 'rgba(124,58,237,.35)', color: '#a78bfa' },
    hasRecurring: true, hasOverride: true,
  };
};

export const fmtCAD = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
export const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
