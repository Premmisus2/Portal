// Vapi tool: returns the next 3 available 30-minute slots on the AI Receptionist calendar.
// Sarah calls this when a caller wants to book — she offers the slots verbally.

import { NextResponse } from 'next/server';
import { verifyVapiSecret, extractToolCalls, vapiToolResponse } from '@/lib/vapi-auth';

const GHL_BASE = 'https://services.leadconnectorhq.com';

export async function POST(req: Request) {
  if (!verifyVapiSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const GHL_KEY = (process.env.GHL_API_KEY || '').trim();
  const CAL_ID = (process.env.GHL_AI_RECEPTIONIST_CALENDAR_ID || '').trim();
  const TZ = (process.env.SARAH_TIMEZONE || 'America/Edmonton').trim();

  if (!GHL_KEY || !CAL_ID) {
    return NextResponse.json({ error: 'GHL not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const toolCalls = extractToolCalls(body);
  const toolCallId = toolCalls[0]?.id || 'unknown';

  const start = Date.now();
  const end = start + 7 * 24 * 60 * 60 * 1000; // next 7 days

  try {
    const url = `${GHL_BASE}/calendars/${CAL_ID}/free-slots?startDate=${start}&endDate=${end}&timezone=${encodeURIComponent(TZ)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${GHL_KEY}`, Version: '2021-04-15' },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        vapiToolResponse(toolCallId, { error: data.message || 'GHL error', status: res.status }),
      );
    }

    // GHL response shape: { "2026-05-09": { slots: [iso, iso, ...] }, ... }
    const slots: string[] = [];
    for (const day of Object.values(data) as Array<{ slots?: string[] }>) {
      if (Array.isArray(day?.slots)) slots.push(...day.slots);
      if (slots.length >= 3) break;
    }

    const top3 = slots.slice(0, 3).map((iso) => {
      const d = new Date(iso);
      const human = d.toLocaleString('en-US', {
        timeZone: TZ,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return { iso, human };
    });

    return NextResponse.json(
      vapiToolResponse(toolCallId, {
        slots: top3,
        timezone: TZ,
        instructions:
          'Read these slots back to the caller verbally. When they pick one, call book_strategy_call with the chosen iso string.',
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(vapiToolResponse(toolCallId, { error: msg }));
  }
}
