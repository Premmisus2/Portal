// /api/ical/[rep_id]/[token]/route.ts — per-rep .ics WebCal feed.
//
// Token URLs look like:
//   https://portal.premmisus.ca/api/ical/<uuid>/<base64url>.ics
// The trailing ".ics" is part of the route segment because some calendar
// apps (notably older Apple Calendar releases) sniff the path extension
// before they even read Content-Type. Next.js treats this as a literal
// segment; we strip the suffix server-side before hashing.
//
// Per 2026-05-20 audit verdict:
//   * Hashed token at rest — provided token gets SHA-256'd and compared
//     against reps.ical_token. Leaked DB can't be replayed.
//   * DTSTART;TZID with VTIMEZONE — DST math is offloaded to calendar
//     parsers (they handle it correctly; we don't).
//   * Cache-Control: private, max-age=300 — Google Calendar polls every
//     few hours regardless; Apple is faster. Don't promise real-time.
//
// Service-role read on callback_tasks (RLS doesn't apply to the worker key).

import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import ical, { ICalCalendarMethod, ICalEventStatus } from 'ical-generator';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

interface CallbackRow {
  id: string;
  lead_id: string;
  scheduled_at_utc: string;
  scheduled_local_time: string;
  scheduled_tz: string;
  status: string;
  notes: string | null;
  leads: { business_name: string; contact_name: string | null; phone: string | null; niche: string | null } | null;
}

interface RepRow {
  id: string;
  name: string;
  ical_token: string | null;
  timezone: string;
}

async function sbFetch<T>(path: string, key: string): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function GET(
  request: Request,
  { params }: { params: { rep_id: string; token: string } },
) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!SB_KEY) {
    console.error('[ical] missing SUPABASE_SERVICE_KEY env var');
    return new NextResponse('Service unavailable', { status: 503 });
  }

  // Strip the trailing .ics suffix (kept in the URL for calendar-app extension sniffing).
  const rawToken = params.token.replace(/\.ics$/i, '');
  if (!rawToken) return new NextResponse('Not found', { status: 404 });

  // Hash the provided token (same algorithm as regenerateIcalToken).
  // The unhashed token is bytes-from-base64url; we have to round-trip to
  // bytes before hashing so the hash matches what was stored.
  let rawBytes: Buffer;
  try {
    rawBytes = Buffer.from(rawToken.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return new NextResponse('Bad token', { status: 401 });
  }
  const providedHash = createHash('sha256').update(rawBytes).digest('hex');

  // FIX (post-ship audit 2026-05-21): encodeURIComponent on rep_id.
  // Previously `${params.rep_id}` was interpolated raw, letting an attacker
  // send /api/ical/123&select=*/abc.ics to inject PostgREST query modifiers
  // and exfiltrate columns the route never intended to expose.
  // Also validate UUID shape — anything that isn't a uuid is rejected outright.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.rep_id)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const safeRepId = encodeURIComponent(params.rep_id);

  // Look up the rep.
  const reps = await sbFetch<RepRow[]>(
    `reps?id=eq.${safeRepId}&select=id,name,ical_token,timezone&limit=1`,
    SB_KEY,
  );
  const rep = reps?.[0];

  // Constant-time-ish: always compute the comparison even on missing rep
  // (mitigates a tiny timing oracle on rep_id existence).
  const storedHash = rep?.ical_token || '';
  let tokenOk = false;
  if (storedHash.length === providedHash.length && storedHash.length > 0) {
    let mismatch = 0;
    for (let i = 0; i < providedHash.length; i++) {
      mismatch |= providedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    tokenOk = mismatch === 0;
  }

  if (!rep || !tokenOk) {
    // Log access denials so an attacker probing tokens gets noticed in
    // the runtime logs. Don't leak whether rep_id or token was wrong.
    console.warn(`[ical] 401 rep_id=${params.rep_id} ua=${request.headers.get('user-agent')?.slice(0, 60) || '-'}`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fetch the rep's scheduled + recently-cancelled callbacks. Cancelled
  // ones stay in the feed for 7 days so calendar apps that cached them
  // pick up the CANCELLED status on next poll.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  // rep.id came from the DB lookup so it's safe; still encode it for symmetry.
  const callbacks = await sbFetch<CallbackRow[]>(
    `callback_tasks?rep_id=eq.${encodeURIComponent(rep.id)}&or=(status.eq.scheduled,and(status.eq.cancelled,cancelled_at.gte.${encodeURIComponent(sevenDaysAgo)}))&select=id,lead_id,scheduled_at_utc,scheduled_local_time,scheduled_tz,status,notes,leads(business_name,contact_name,phone,niche)&order=scheduled_at_utc.asc&limit=200`,
    SB_KEY,
  );

  // Build the calendar.
  const cal = ical({
    name: `Premmisus Callbacks — ${rep.name}`,
    prodId: { company: 'Premmisus', product: 'Sales Floor', language: 'EN' },
    timezone: rep.timezone || 'America/Toronto',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 60 * 5, // refresh hint (5 minutes; Google ignores anyway).
  });

  (callbacks || []).forEach((cb) => {
    const start = new Date(cb.scheduled_at_utc);
    const end = new Date(start.getTime() + 15 * 60_000); // 15-min slot
    const business = cb.leads?.business_name || 'Lead';
    const contact = cb.leads?.contact_name || '';
    const phone = cb.leads?.phone || '';
    const niche = cb.leads?.niche || '';

    const summary = `📞 Callback: ${business}`;
    const descriptionLines = [
      contact ? `Contact: ${contact}` : '',
      phone ? `Phone: ${phone}` : '',
      niche ? `Niche: ${niche}` : '',
      cb.notes ? `Notes: ${cb.notes}` : '',
      '',
      `Open: https://portal.premmisus.ca/floor?lead=${cb.lead_id}`,
    ].filter(Boolean);

    cal.createEvent({
      id: `callback-${cb.id}@premmisus.ca`,
      start,
      end,
      timezone: cb.scheduled_tz || rep.timezone || 'America/Toronto',
      summary,
      description: descriptionLines.join('\n'),
      status: cb.status === 'cancelled' ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
      url: `https://portal.premmisus.ca/floor?lead=${cb.lead_id}`,
    });
  });

  console.log(`[ical] served rep=${rep.name} events=${callbacks?.length ?? 0}`);

  return new NextResponse(cal.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'X-Published-TTL': 'PT5M',
    },
  });
}
