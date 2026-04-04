// Premmisus Nerve Center — Callback Reminder Cron
// Runs at 9am ET (Mon-Fri), sends SMS with overdue callbacks

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export async function POST(request: Request) {
  // Required cron auth check
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const BASE = (process.env.BASE_URL || '').trim();

  if (!SB_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find call logs with callback_date <= today
    const logsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/call_logs?select=id,lead_id,business_name,callback_date,rep_id,notes&outcome=eq.callback_requested&callback_date=lte.${today}&order=callback_date.asc`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const logs = await logsRes.json();

    if (!Array.isArray(logs) || logs.length === 0) {
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
      return NextResponse.json({ message: 'No overdue callbacks (all handled)' });
    }

    // Build SMS message
    let smsMsg = `[Premmisus] ${overdue.length} overdue callback${overdue.length > 1 ? 's' : ''}:\n`;
    overdue.slice(0, 5).forEach((cb: any) => {
      smsMsg += `• ${cb.business} (${cb.callbackDate})${cb.notes ? ' — ' + cb.notes.slice(0, 40) : ''}\n`;
    });
    if (overdue.length > 5) smsMsg += `...and ${overdue.length - 5} more`;
    smsMsg += `\nCheck portal.premmisus.ca`;

    // Send SMS
    if (BASE) {
      await fetch(`${BASE}/api/notify-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'callback', repName: 'System', businessName: `${overdue.length} overdue callbacks`, notes: smsMsg }),
      }).catch(() => {});
    }

    // Log
    await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'callback_reminder', recipient: 'director', channel: 'sms', message: `${overdue.length} overdue callbacks` }),
    });

    return NextResponse.json({ overdue: overdue.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
