// Premmisus Tracker — SMS Notification via Twilio
// Sends SMS to Elliott when reps book calls, request follow-ups, or go idle

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const FROM = process.env.TWILIO_PHONE_NUMBER || '';
  const TO = (process.env.ELLIOTT_PHONE || '').trim();

  if (!SID || !TOKEN || !FROM || !TO) {
    return NextResponse.json({ error: 'SMS not configured' }, { status: 500 });
  }

  const { type, repName, businessName, phone, notes } = await request.json();

  let message = '';
  switch (type) {
    case 'booked':
      message = `[Premmisus] ${repName || 'Rep'} booked a call with ${businessName || 'Unknown'}${phone ? ' (' + phone + ')' : ''}. Check portal.`;
      break;
    case 'callback':
      message = `[Premmisus] ${repName || 'Rep'} — follow-up requested: ${businessName || 'Unknown'}${notes ? '. Notes: ' + notes.slice(0, 80) : ''}`;
      break;
    case 'idle':
      message = `[Premmisus] No rep activity for 2+ hours. Check portal.premmisus.ca`;
      break;
    case 'handoff':
      message = `[Premmisus] ${repName || 'Rep'} handed off ${businessName || 'a lead'}. Check portal for details.`;
      break;
    default:
      message = `[Premmisus] ${repName || 'Rep'}: ${businessName || 'Activity update'}. Check portal.`;
  }

  try {
    const twilioAuth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: TO, From: FROM, Body: message });

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      return NextResponse.json({ error: data.message || 'SMS failed', code: data.code }, { status: 400 });
    }

    return NextResponse.json({ success: true, sid: data.sid });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
