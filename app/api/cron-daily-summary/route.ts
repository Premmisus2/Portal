// Premmisus Nerve Center — Daily Summary Cron
// Runs at 9pm ET Mon-Fri (01:00 UTC Tue-Sat in DST, 02:00 UTC in EST — vercel.json
// is locked to DST since cold calling launched in May; revisit when DST ends).
// Sends formatted Telegram summary of today's activity plus broadcasts a
// team-standup SMS to every active rep with a phone number.
// Must be GET to be callable by Vercel cron (fixed 2026-04-21 after silent 405 failures)

import { NextResponse } from 'next/server';
import { startRun, finishRun } from '@/lib/cron-tracker';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

// E.164 normalizer — Twilio rejects anything else.
// Strips spaces, dashes, parens. Adds +1 if it's a 10-digit NA number.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return null;
}

export async function GET(request: Request) {
  // Required cron auth check
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!SB_KEY || !BOT_TOKEN || !CHAT_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const runId = await startRun('cron-daily-summary');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all reps (including directors — Elliott calls now too)
    const repsRes = await fetch(`${SUPABASE_URL}/rest/v1/reps?select=id,name,role,phone&order=created_at.asc`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const reps = await repsRes.json();

    // Get today's call logs
    const logsRes = await fetch(`${SUPABASE_URL}/rest/v1/call_logs?select=*&created_at=gte.${today}T00:00:00&order=created_at.desc`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const logs = await logsRes.json();

    if (!Array.isArray(logs)) {
      await finishRun(runId, { status: 'success', rowsProcessed: 0, metadata: { reason: 'no_logs' } });
      return NextResponse.json({ message: 'No logs' });
    }

    // Build summary per rep — include directors now (Elliott calls too)
    let summary = `📊 *DAILY SUMMARY — ${today}*\n`;
    let totalCalls = 0;
    let totalBookings = 0;
    let totalDiscovery = 0;
    let totalCallbacks = 0;

    interface SmsRow { name: string; calls: number; booked: number; discovery: number; callbacks: number; conv: number; }
    const smsRows: SmsRow[] = [];

    const activeReps = Array.isArray(reps) ? reps : [];

    for (const rep of activeReps) {
      const repLogs = logs.filter((l: any) => l.rep_id === rep.id);
      if (repLogs.length === 0) {
        summary += `\n*${rep.name}:*\n  ⚠️ No calls today\n`;
        smsRows.push({ name: rep.name, calls: 0, booked: 0, discovery: 0, callbacks: 0, conv: 0 });
        continue;
      }

      const calls = repLogs.length;
      const connects = repLogs.filter((l: any) => !['no_answer', 'wrong_number', 'voicemail'].includes(l.outcome)).length;
      const bookedCalls = repLogs.filter((l: any) => l.outcome === 'booked_call').length;
      const discoveryCalls = repLogs.filter((l: any) => l.outcome === 'discovery_completed').length;
      const bookings = bookedCalls + discoveryCalls;
      const callbacks = repLogs.filter((l: any) => l.outcome === 'callback_requested').length;
      const notInterested = repLogs.filter((l: any) => l.outcome === 'not_interested').length;
      const wrongNumbers = repLogs.filter((l: any) => l.outcome === 'wrong_number').length;
      const connectRate = calls > 0 ? Math.round((connects / calls) * 100) : 0;
      const convRate = calls > 0 ? Math.round((bookings / calls) * 100) : 0;
      smsRows.push({ name: rep.name, calls, booked: bookedCalls, discovery: discoveryCalls, callbacks, conv: convRate });
      totalDiscovery += discoveryCalls;
      totalCallbacks += callbacks;

      // Find longest call
      const withDuration = repLogs.filter((l: any) => l.duration_seconds && l.duration_seconds > 0);
      const longest = withDuration.sort((a: any, b: any) => b.duration_seconds - a.duration_seconds)[0];
      const longestStr = longest
        ? `${Math.floor(longest.duration_seconds / 60)}m ${longest.duration_seconds % 60}s with ${longest.business_name || 'Unknown'}`
        : 'N/A';

      totalCalls += calls;
      totalBookings += bookings;

      summary += `\n*${rep.name}:*\n`;
      summary += `  📞 ${calls} calls | ${connects} connects | ${connectRate}% rate\n`;
      summary += `  🟢 ${bookings} booking${bookings !== 1 ? 's' : ''} | 🟡 ${callbacks} callback${callbacks !== 1 ? 's' : ''}\n`;
      if (wrongNumbers > 0) summary += `  ⚠️ ${wrongNumbers} wrong numbers\n`;
      if (notInterested > 0) summary += `  🔴 ${notInterested} not interested\n`;
      summary += `  🏆 Best call: ${longestStr}\n`;

      // Coaching tips
      if (notInterested >= 3) summary += `  💡 _Review objection handling scripts_\n`;
      if (wrongNumbers >= 5) summary += `  💡 _Lead data quality issue — consider scrubbing list_\n`;
      if (connectRate < 20) summary += `  💡 _Low connect rate — try different calling times_\n`;
    }

    summary += `\n*TOTALS:* ${totalCalls} calls | ${totalBookings} bookings | ${totalDiscovery} discovery | ${totalCallbacks} callbacks`;
    summary += `\n\n_Generated by Premmisus Nerve Center_`;

    // Send to Telegram
    const teleRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: summary, parse_mode: 'Markdown' }),
    });

    const teleData = await teleRes.json();

    // Compute the propagation flag BEFORE the notifications_log write so that
    // if the audit-log write itself throws (Supabase hiccup), the outer catch
    // doesn't misreport a successful Telegram delivery as a cron failure.
    // Telegram delivery failure is a real cron failure — without delivery the
    // summary never reaches the director. Propagate so cron-watchdog catches it.
    const telegramOk = teleRes.ok && teleData?.ok === true;

    // Best-effort audit log — its failure is non-critical to the cron's job.
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily_summary', recipient: 'director', channel: 'telegram', message: `${totalCalls} calls, ${totalBookings} bookings` }),
      });
    } catch {
      // swallow — audit log is best-effort, real signal is in cron_runs
    }

    // ── Team SMS broadcast ────────────────────────────────────────────────
    // Sends a compact leaderboard SMS to every active rep with a phone number.
    // SMS failures are tracked in metadata but do NOT fail the cron — Telegram
    // delivery is the primary signal that the summary reached the director.
    const TWILIO_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const TWILIO_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const TWILIO_FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();

    let smsSent = 0;
    let smsFailed = 0;
    const smsErrors: string[] = [];

    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      // Sort SMS rows the same way the leaderboard ranks them.
      const ranked = [...smsRows].sort((a, b) => {
        const sa = a.booked * 100 + a.discovery * 60 + a.callbacks * 15 + a.calls;
        const sb = b.booked * 100 + b.discovery * 60 + b.callbacks * 15 + b.calls;
        if (sb !== sa) return sb - sa;
        if (b.calls !== a.calls) return b.calls - a.calls;
        return a.name.localeCompare(b.name);
      });

      let smsBody = `[Premmisus] Daily Standup ${today}\n`;
      ranked.forEach((r, i) => {
        if (r.calls === 0) {
          smsBody += `${i + 1}. ${r.name}: no calls\n`;
        } else {
          smsBody += `${i + 1}. ${r.name}: ${r.calls} calls, ${r.booked} book, ${r.discovery} disc, ${r.callbacks} cb (${r.conv}%)\n`;
        }
      });
      smsBody += `TEAM: ${totalCalls} calls, ${totalBookings} books, ${totalDiscovery} disc, ${totalCallbacks} cb`;

      const recipients = activeReps
        .map((r: any) => ({ name: r.name, phone: normalizePhone(r.phone) }))
        .filter((r: any) => !!r.phone);

      const twilioAuth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

      for (const recipient of recipients) {
        try {
          const params = new URLSearchParams({ To: recipient.phone!, From: TWILIO_FROM, Body: smsBody });
          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${twilioAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
          if (twilioRes.ok) {
            smsSent++;
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
                method: 'POST',
                headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'daily_summary', recipient: recipient.name, channel: 'sms', message: `${totalCalls} calls, ${totalBookings} bookings` }),
              });
            } catch { /* audit log best-effort */ }
          } else {
            smsFailed++;
            const data = await twilioRes.json().catch(() => ({}));
            smsErrors.push(`${recipient.name}: ${data?.message || twilioRes.status}`);
          }
        } catch (e: any) {
          smsFailed++;
          smsErrors.push(`${recipient.name}: ${e?.message || 'send error'}`);
        }
      }
    } else {
      smsErrors.push('Twilio not configured');
    }

    await finishRun(runId, {
      status: telegramOk ? 'success' : 'failure',
      rowsProcessed: totalCalls,
      errorMessage: telegramOk
        ? undefined
        : `Telegram send failed (HTTP ${teleRes.status}): ${teleData?.description ?? 'unknown'}`,
      metadata: { totalCalls, totalBookings, totalDiscovery, totalCallbacks, telegram_ok: telegramOk, smsSent, smsFailed, smsErrors: smsErrors.length ? smsErrors : undefined },
    });
    return NextResponse.json({ success: telegramOk, totalCalls, totalBookings, totalDiscovery, totalCallbacks, smsSent, smsFailed });

  } catch (err: any) {
    await finishRun(runId, { status: 'failure', errorMessage: err?.message || String(err) });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
