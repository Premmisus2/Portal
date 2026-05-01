// Premmisus Dialer — Call Status Poll
//
// Server-side poll endpoint for the active-call modal. Replaces the previous
// pattern of TwilioCallModal hitting Supabase directly with the anon key,
// which silently failed if RLS blocked the read (modal stuck on "ringing"
// for the full 5-minute timeout).
//
// Hardening (2026-05-01, #twilio-webhook-hardening):
// Server uses SUPABASE_SERVICE_KEY (bypasses RLS). The call_sid is opaque
// (32-char Twilio identifier) so practical scoping is via knowledge of the
// SID — same as the existing initiate-call route.

import { NextResponse } from 'next/server';
import { reportServerError } from '@/lib/server-error';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export async function GET(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  if (!SB_KEY) {
    await reportServerError(
      'call-status-poll.env',
      'SUPABASE_SERVICE_KEY missing — modal will be stuck on ringing',
      undefined,
      'twilio-webhook-hardening',
    );
    return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sid = searchParams.get('sid') || '';
  if (!sid || !/^[A-Za-z0-9]+$/.test(sid)) {
    return NextResponse.json({ error: 'sid required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/call_logs?select=twilio_status,duration_seconds,recording_url&call_sid=eq.${encodeURIComponent(sid)}&limit=1`,
      {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
        },
        // Don't cache — we're polling for live status changes
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      await reportServerError(
        'call-status-poll.fetch',
        `Supabase returned ${res.status}: ${body.slice(0, 200)}`,
        { call_sid: sid },
        'twilio-webhook-hardening',
      );
      return NextResponse.json({ error: 'upstream error' }, { status: 502 });
    }
    const rows = await res.json();
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return NextResponse.json({ row });
  } catch (err) {
    await reportServerError('call-status-poll.fetch', err, { call_sid: sid }, 'twilio-webhook-hardening');
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
