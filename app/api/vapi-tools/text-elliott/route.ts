// Vapi tool: SMS Elliott when a caller insists on talking to him directly,
// or when Sarah escalates anything urgent.

import { NextResponse } from 'next/server';
import { verifyVapiSecret, extractToolCalls, vapiToolResponse } from '@/lib/vapi-auth';

type TextArgs = {
  caller_name?: string;
  business_name?: string;
  phone?: string;
  summary: string;
  urgency?: 'now' | 'soon' | 'whenever';
  preferred_callback_time?: string;
};

export async function POST(req: Request) {
  if (!verifyVapiSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const FROM = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  const TO = (process.env.ELLIOTT_PHONE || '').trim();

  if (!SID || !TOKEN || !FROM || !TO) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const toolCalls = extractToolCalls(body);
  const tc = toolCalls[0];
  const toolCallId = tc?.id || 'unknown';
  const args = (tc?.function?.arguments || {}) as TextArgs;

  if (!args.summary) {
    return NextResponse.json(
      vapiToolResponse(toolCallId, { ok: false, error: 'summary is required' }),
    );
  }

  const urgencyTag = args.urgency === 'now' ? '🔥 NOW' : args.urgency === 'soon' ? '⏱️ SOON' : '📞 callback';
  const lines = [
    `${urgencyTag} — Sarah escalation`,
    args.caller_name || args.business_name ? `${args.caller_name || ''}${args.business_name ? ` (${args.business_name})` : ''}`.trim() : null,
    args.phone ? `📱 ${args.phone}` : null,
    args.preferred_callback_time ? `🕒 wants callback: ${args.preferred_callback_time}` : null,
    '',
    args.summary,
  ].filter(Boolean);

  const smsBody = lines.join('\n').slice(0, 1500);

  try {
    const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: TO, From: FROM, Body: smsBody });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[sarah-text] twilio failed', data);
      return NextResponse.json(
        vapiToolResponse(toolCallId, { ok: false, error: data.message || 'twilio error' }),
      );
    }

    return NextResponse.json(
      vapiToolResponse(toolCallId, {
        ok: true,
        confirmation_message:
          'Sent. Tell the caller Elliott has been notified and will call them back within the hour.',
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('[sarah-text] threw', msg);
    return NextResponse.json(vapiToolResponse(toolCallId, { ok: false, error: msg }));
  }
}
