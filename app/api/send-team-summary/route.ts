// Director-only manual broadcast of the daily team-standup SMS.
// Mirrors the broadcast inside cron-daily-summary so directors can dry-run
// the SMS before relying on the 9PM ET cron. No CRON_SECRET — gated by
// requireDirector instead.

import { NextResponse } from 'next/server';
import { requireDirector } from '@/lib/api-auth';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return null;
}

export async function POST(request: Request) {
  const auth = await requireDirector(request);
  if (auth.ok !== true) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const TWILIO_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const TWILIO_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  if (!SB_KEY) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }

  // Optional: dry-run mode for previewing the SMS body without actually sending.
  // Pass { dryRun: true } in the body. Defaults to false (real send).
  let dryRun = false;
  let onlyMe = false;
  try {
    const body = await request.json().catch(() => ({}));
    dryRun = !!body?.dryRun;
    onlyMe = !!body?.onlyMe;
  } catch { /* no body */ }

  const today = new Date().toISOString().split('T')[0];

  // Fetch reps + today's logs in parallel.
  const [repsRes, logsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/reps?select=id,name,role,phone&order=created_at.asc`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    }),
    fetch(`${SUPABASE_URL}/rest/v1/call_logs?select=rep_id,outcome&created_at=gte.${today}T00:00:00`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    }),
  ]);
  const reps = await repsRes.json();
  const logs = await logsRes.json();
  if (!Array.isArray(reps) || !Array.isArray(logs)) {
    return NextResponse.json({ error: 'Failed to load reps or logs' }, { status: 500 });
  }

  const activeReps = reps;

  let totalCalls = 0;
  let totalBookings = 0;
  let totalDiscovery = 0;
  let totalCallbacks = 0;

  interface Row { name: string; calls: number; booked: number; discovery: number; callbacks: number; conv: number; }
  const rows: Row[] = activeReps.map((rep: any) => {
    const own = logs.filter((l: any) => l.rep_id === rep.id);
    const calls = own.length;
    const booked = own.filter((l: any) => l.outcome === 'booked_call').length;
    const discovery = own.filter((l: any) => l.outcome === 'discovery_completed').length;
    const callbacks = own.filter((l: any) => l.outcome === 'callback_requested').length;
    const conv = calls > 0 ? Math.round(((booked + discovery) / calls) * 100) : 0;
    totalCalls += calls;
    totalBookings += booked + discovery;
    totalDiscovery += discovery;
    totalCallbacks += callbacks;
    return { name: rep.name, calls, booked, discovery, callbacks, conv };
  });

  const ranked = [...rows].sort((a, b) => {
    const sa = a.booked * 100 + a.discovery * 60 + a.callbacks * 15 + a.calls;
    const sb = b.booked * 100 + b.discovery * 60 + b.callbacks * 15 + b.calls;
    if (sb !== sa) return sb - sa;
    if (b.calls !== a.calls) return b.calls - a.calls;
    return a.name.localeCompare(b.name);
  });

  let smsBody = `[Premmisus TEST] Daily Standup ${today}\n`;
  ranked.forEach((r, i) => {
    if (r.calls === 0) {
      smsBody += `${i + 1}. ${r.name}: no calls\n`;
    } else {
      smsBody += `${i + 1}. ${r.name}: ${r.calls} calls, ${r.booked} book, ${r.discovery} disc, ${r.callbacks} cb (${r.conv}%)\n`;
    }
  });
  smsBody += `TEAM: ${totalCalls} calls, ${totalBookings} books, ${totalDiscovery} disc, ${totalCallbacks} cb`;

  // Pick recipients.
  let recipients = activeReps
    .map((r: any) => ({ id: r.id, name: r.name, phone: normalizePhone(r.phone) }))
    .filter((r: any) => !!r.phone);

  if (onlyMe) {
    recipients = recipients.filter((r: any) => r.id === auth.repId);
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      smsBody,
      recipients: recipients.map((r: any) => ({ name: r.name, phone: r.phone })),
      stats: { totalCalls, totalBookings, totalDiscovery, totalCallbacks, repCount: rows.length },
    });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients have phone numbers set. Set rep phones in the Director Dashboard.' }, { status: 400 });
  }

  const twilioAuth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  const results: Array<{ name: string; phone: string; ok: boolean; error?: string; sid?: string }> = [];

  for (const recipient of recipients) {
    try {
      const params = new URLSearchParams({ To: recipient.phone!, From: TWILIO_FROM, Body: smsBody });
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${twilioAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await twilioRes.json().catch(() => ({}));
      if (twilioRes.ok) {
        results.push({ name: recipient.name, phone: recipient.phone!, ok: true, sid: data?.sid });
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
            method: 'POST',
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'daily_summary_test', recipient: recipient.name, channel: 'sms', message: `${totalCalls} calls, ${totalBookings} bookings (test)` }),
          });
        } catch { /* audit best-effort */ }
      } else {
        results.push({ name: recipient.name, phone: recipient.phone!, ok: false, error: data?.message || `HTTP ${twilioRes.status}` });
      }
    } catch (e: any) {
      results.push({ name: recipient.name, phone: recipient.phone!, ok: false, error: e?.message || 'send error' });
    }
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  return NextResponse.json({
    dryRun: false,
    onlyMe,
    smsBody,
    sent,
    failed,
    results,
    stats: { totalCalls, totalBookings, totalDiscovery, totalCallbacks, repCount: rows.length },
  });
}
