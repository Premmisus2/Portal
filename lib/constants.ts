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
};

export const NICHE_LIST = [
  'Cleaning', 'Construction', 'Construction & Handyman', 'Electrical', 'Fencing',
  'Flooring', 'Junk Removal', 'Landscaping', 'Moving', 'Painting',
  'Plumbing', 'Pressure Washing', 'Roofing', 'Snow Removal', 'Window Washing',
];

export const USD_TO_CAD = 1.38;

export const CLOSE_PRODUCTS = [
  // Marketing tiers
  { id: 'website',      label: 'Website Package',         pts: 1, price: '$1,500 CAD',        commission: '$500 CAD flat',               setupFee: null },
  { id: 'foundation',   label: 'Foundation 1.0',           pts: 2, price: '$1,599/mo',          commission: '~$112 CAD/mo',                setupFee: null },
  { id: 'authority',    label: 'Authority System 2.0',     pts: 3, price: '$2,999/mo',          commission: '~$210 CAD/mo',                setupFee: null },
  { id: 'domination',   label: 'Market Domination 3.0',   pts: 4, price: '$5,999/mo',          commission: '~$420 CAD/mo',                setupFee: null },
  // AI services — individual (1 pt each)
  { id: 'ai_vapi',      label: 'AI Receptionist',          pts: 1, price: '$1,200-1,500/mo',    commission: '$500 upfront + ~$98/mo',      setupFee: '$1,000' },
  { id: 'ai_sms',       label: 'SMS Sequences',            pts: 1, price: '$500-750/mo',         commission: '$375 upfront + ~$44/mo',      setupFee: '$750' },
  { id: 'ai_email',     label: 'Email Sequences',          pts: 1, price: '$400-500/mo',         commission: '$250 upfront + ~$31/mo',      setupFee: '$500' },
  { id: 'ai_chat',      label: 'Website Chatbot',          pts: 1, price: '$500-750/mo',         commission: '$375 upfront + ~$44/mo',      setupFee: '$750' },
  { id: 'ai_crm',       label: 'CRM Automation',           pts: 1, price: '$500-750/mo',         commission: '$375 upfront + ~$44/mo',      setupFee: '$750' },
  // AI bundles — pts by total package value
  { id: 'ai_bundle_2',  label: 'AI Bundle (~$2K/mo)',      pts: 2, price: '~$2,000/mo',          commission: '50% setup + 7% MRR',          setupFee: 'Varies' },
  { id: 'ai_bundle_3',  label: 'AI Bundle (~$2.5K+/mo)',   pts: 3, price: '~$2,500-5,999/mo',    commission: '50% setup + 7% MRR',          setupFee: 'Varies' },
  { id: 'ai_bundle_4',  label: 'AI Bundle ($6K+/mo)',      pts: 4, price: '$6,000+/mo',           commission: '50% setup + 7% MRR',          setupFee: 'Varies' },
];

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
