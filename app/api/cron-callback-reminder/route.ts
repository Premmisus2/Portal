// Premmisus Nerve Center — Callback Reminder Cron
//
// Schedule: vercel.json `"0 14 * * 1-5"` — 14:00 UTC, Mon-Fri
//   - EDT (Mar-Nov, ~8 mo/yr): 10:00 AM ET
//   - EST (Nov-Mar, ~4 mo/yr):  9:00 AM ET
// One-hour drift across DST is intentional (Vercel cron schedules are
// UTC-only, no TZ option). Reps are dialing by 10 ET regardless, so the
// reminder lands during their workday in both seasons. Documented in
// BUILD-JOURNAL #tier-2-hardening.
//
// Sends SMS with overdue callbacks.
// Must be GET to be callable by Vercel cron (fixed 2026-04-21 after silent 405 failures)

import { NextResponse } from 'next/server';
import { startRun, finishRun } from '@/lib/cron-tracker';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export async function GET(request: Request) {
  // Required cron auth check
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const BASE = (process.env.BASE_URL || '').trim();

  if (!SB_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const runId = await startRun('cron-callback-reminder');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find call logs with callback_date <= today
    const logsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/call_logs?select=id,lead_id,business_name,callback_date,rep_id,notes&outcome=eq.callback_requested&callback_date=lte.${today}&order=callback_date.asc`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const logs = await logsRes.json();

    if (!Array.isArray(logs) || logs.length === 0) {
      await finishRun(runId, { status: 'success', rowsProcessed: 0, metadata: { reason: 'no_overdue_callbacks' } });
      return NextResponse.json({ message: 'No overdue callbacks' });
    }

    // Check which leads are still in callback status (not already handled)
    const leadIds = [...new Set(logs.map((l: any) => l.lead_id).filter(Boolean))];
    const overdue: any[] = [];

    for (const leadId of leadIds) {
      const leadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?select=id,status,business_name&id=eq.${leadId}`,
        { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
      );
      const leads = await leadRes.json();
      if (Array.isArray(leads) && leads.length > 0 && leads[0].status === 'callback') {
        const log = logs.find((l: any) => l.lead_id === leadId);
        overdue.push({
          business: leads[0].business_name || log?.business_name || 'Unknown',
          callbackDate: log?.callback_date,
          notes: log?.notes,
        });
      }
    }

    if (overdue.length === 0) {
      await finishRun(runId, { status: 'success', rowsProcessed: 0, metadata: { reason: 'all_handled' } });
      return NextResponse.json({ message: 'No overdue callbacks (all handled)' });
    }

    // Build SMS message
    let smsMsg = `[Premmisus] ${overdue.length} overdue callback${overdue.length > 1 ? 's' : ''}:\n`;
    overdue.slice(0, 5).forEach((cb: any) => {
      smsMsg += `• ${cb.business} (${cb.callbackDate})${cb.notes ? ' — ' + cb.notes.slice(0, 40) : ''}\n`;
    });
    if (overdue.length > 5) smsMsg += `...and ${overdue.length - 5} more`;
    smsMsg += `\nCheck portal.premmisus.ca`;

    // Send SMS — propagate delivery failure into cron status (was previously
    // .catch(() => {}) which swallowed Twilio/notify-sms errors silently and
    // let cron_runs.status='success' lie about a missed alert).
    let smsOk = true;
    let smsError: string | undefined;
    if (BASE) {
      try {
        const smsRes = await fetch(`${BASE}/api/notify-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'callback', repName: 'System', businessName: `${overdue.length} overdue callbacks`, notes: smsMsg }),
        });
        if (!smsRes.ok) {
          smsOk = false;
          smsError = `notify-sms HTTP ${smsRes.status}`;
        }
      } catch (e: unknown) {
        smsOk = false;
        smsError = e instanceof Error ? e.message : String(e);
      }
    } else {
      smsOk = false;
      smsError = 'BASE_URL not configured';
    }

    // Log notification regardless of delivery status (audit trail) — but the
    // status propagation above is what trips the watchdog.
    await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'callback_reminder', recipient: 'director', channel: 'sms', message: `${overdue.length} overdue callbacks${smsOk ? '' : ' (delivery failed)'}` }),
    });

    await finishRun(runId, {
      status: smsOk ? 'success' : 'failure',
      rowsProcessed: overdue.length,
      errorMessage: smsOk ? undefined : `Callback SMS delivery failed: ${smsError}`,
      metadata: { sms_ok: smsOk, sms_error: smsError ?? null, callbacks: overdue.length },
    });
    return NextResponse.json({ overdue: overdue.length, sms_ok: smsOk });

  } catch (err: any) {
    await finishRun(runId, { status: 'failure', errorMessage: err?.message || String(err) });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
