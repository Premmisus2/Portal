// Vapi tool: books a strategy call on the AI Receptionist calendar in GHL.
// Creates or updates the contact, then creates the appointment.

import { NextResponse } from 'next/server';
import { verifyVapiSecret, extractToolCalls, vapiToolResponse } from '@/lib/vapi-auth';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

type BookArgs = {
  caller_name?: string;
  business_name?: string;
  phone: string;
  email?: string;
  preferred_slot_iso: string;
  notes?: string;
  lead_id?: string;
};

export async function POST(req: Request) {
  if (!verifyVapiSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const GHL_KEY = (process.env.GHL_API_KEY || '').trim();
  const LOCATION = (process.env.GHL_LOCATION_ID || 'ugg4v4G1WJMtqGcWFUp5').trim();
  const CAL_ID = (process.env.GHL_AI_RECEPTIONIST_CALENDAR_ID || '').trim();
  const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!GHL_KEY || !CAL_ID) {
    return NextResponse.json({ error: 'GHL not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const toolCalls = extractToolCalls(body);
  const tc = toolCalls[0];
  const toolCallId = tc?.id || 'unknown';
  const args = (tc?.function?.arguments || {}) as BookArgs;

  if (!args.phone || !args.preferred_slot_iso) {
    return NextResponse.json(
      vapiToolResponse(toolCallId, { ok: false, error: 'phone and preferred_slot_iso are required' }),
    );
  }

  try {
    // 1. Upsert GHL contact
    const contactRes = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GHL_KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: LOCATION,
        phone: args.phone,
        firstName: (args.caller_name || '').split(' ')[0] || undefined,
        lastName: (args.caller_name || '').split(' ').slice(1).join(' ') || undefined,
        email: args.email,
        companyName: args.business_name,
        source: 'AI Receptionist (Sarah)',
      }),
    });
    const contactData = await contactRes.json();
    const contactId = contactData?.contact?.id || contactData?.id;
    if (!contactId) {
      console.error('[sarah-book] contact upsert failed', contactData);
      return NextResponse.json(
        vapiToolResponse(toolCallId, { ok: false, error: 'contact upsert failed' }),
      );
    }

    // 2. Create appointment
    const startMs = new Date(args.preferred_slot_iso).getTime();
    const endMs = startMs + 30 * 60 * 1000;

    const apptRes = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GHL_KEY}`, Version: '2021-04-15', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calendarId: CAL_ID,
        locationId: LOCATION,
        contactId,
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        title: `Strategy Call — ${args.business_name || args.caller_name || 'Inbound'}`,
        appointmentStatus: 'confirmed',
        notes: args.notes ? `Booked by Sarah (AI Receptionist).\n\n${args.notes}` : 'Booked by Sarah (AI Receptionist).',
      }),
    });
    const apptData = await apptRes.json();
    if (!apptRes.ok) {
      console.error('[sarah-book] appointment create failed', apptData);
      return NextResponse.json(
        vapiToolResponse(toolCallId, { ok: false, error: apptData.message || 'appointment failed' }),
      );
    }

    // 3. Mirror to Supabase call_logs (best-effort, non-blocking)
    if (SB_KEY) {
      fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: args.lead_id || null,
          rep_id: null,
          outcome: 'booked_call',
          call_type: 'inbound_sarah',
          business_name: args.business_name || null,
          notes: `Sarah booked strategy call for ${new Date(startMs).toISOString()}. ${args.notes || ''}`.trim(),
        }),
      }).catch(() => {});
    }

    return NextResponse.json(
      vapiToolResponse(toolCallId, {
        ok: true,
        appointment_id: apptData.id,
        confirmation_message: `Booked. The caller is confirmed for ${new Date(startMs).toLocaleString('en-US', { timeZone: 'America/Edmonton', weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })} Mountain Time. Tell them you've sent a calendar invite to their email if you have one, otherwise that Elliott will text the Zoom link before the call.`,
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('[sarah-book] threw', msg);
    return NextResponse.json(vapiToolResponse(toolCallId, { ok: false, error: msg }));
  }
}
