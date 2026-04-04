// Premmisus Nerve Center — Idle Detection Cron
// Runs every hour during business hours (8am-6pm ET, Mon-Fri)
// Checks if any rep has been idle for 2+ hours, sends SMS + Telegram

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

async function sbQuery(path: string, sbKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` },
  });
  return res.json();
}

async function sendSMS(body: any) {
  const BASE = (process.env.BASE_URL || '').trim();
  if (!BASE) return;
  await fetch(`${BASE}/api/notify-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function sendTelegram(body: any) {
  const BASE = (process.env.BASE_URL || '').trim();
  if (!BASE) return;
  await fetch(`${BASE}/api/notify-telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function POST(request: Request) {
  // Required cron auth check
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  if (!SB_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get all non-director reps
    const reps = await sbQuery('reps?select=id,name,role&role=eq.rep', SB_KEY);
    if (!Array.isArray(reps) || reps.length === 0) return NextResponse.json({ message: 'No reps found' });

    // Check already-sent notifications today
    const sentToday = await sbQuery(`notifications_log?select=recipient&type=eq.idle&created_at=gte.${today}T00:00:00`, SB_KEY);
    const alreadyNotified = new Set((Array.isArray(sentToday) ? sentToday : []).map((n: any) => n.recipient));

    const idleReps: string[] = [];

    for (const rep of reps) {
      if (alreadyNotified.has(rep.id)) continue;

      // Get most recent call for this rep
      const logs = await sbQuery(`call_logs?select=created_at&rep_id=eq.${rep.id}&order=created_at.desc&limit=1`, SB_KEY);

      let isIdle = false;
      if (!Array.isArray(logs) || logs.length === 0) {
        isIdle = true; // No calls at all today
      } else {
        const lastCall = new Date(logs[0].created_at);
        const gapMinutes = (now.getTime() - lastCall.getTime()) / (1000 * 60);
        if (gapMinutes > 120) isIdle = true;
      }

      if (isIdle) {
        idleReps.push(rep.name);

        // Log notification to prevent duplicates
        await fetch(`${SUPABASE_URL}/rest/v1/notifications_log`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'idle', recipient: rep.id, channel: 'sms+telegram', message: `${rep.name} idle 2+ hours` }),
        });

        // Send notifications
        await sendSMS({ type: 'idle', repName: rep.name });
        await sendTelegram({ type: 'idle', repName: rep.name });
      }
    }

    return NextResponse.json({ checked: reps.length, idle: idleReps });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
