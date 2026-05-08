// Premmisus Dialer — Initiate Twilio click-to-call
// POST: { repPhone, leadPhone, leadName, leadId, repId }
// Returns: { callSid, status } or { error }

import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export async function POST(request: Request) {
  const SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const FROM = process.env.TWILIO_PHONE_NUMBER || '';
  const BASE = (process.env.BASE_URL || '').trim();
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  if (!SID || !TOKEN || !FROM || !BASE) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }

  const { repPhone, leadPhone, leadName, leadId, repId } = await request.json();
  if (!repPhone || !leadPhone || !leadId || !repId) {
    return NextResponse.json({ error: 'Missing required fields: repPhone, leadPhone, leadId, repId' }, { status: 400 });
  }

  try {
    // 1. Call Twilio REST API to initiate call to rep's phone
    const twilioAuth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const twimlUrl = `${BASE}/api/twiml-bridge?leadPhone=${encodeURIComponent(leadPhone)}&leadName=${encodeURIComponent(leadName || 'Unknown')}`;
    const statusUrl = `${BASE}/api/call-status`;

    // StatusCallbackEvent must be sent as MULTIPLE params, not one space-separated
    // string — Twilio's API treats the value as an array. The previous form
    // produced a single invalid event name, so Twilio fired zero status webhooks
    // and twilio_status was forever stuck at 'initiated' (cron-watchdog had to
    // sweep stuck rows). See Twilio call-resource docs.
    const params = new URLSearchParams();
    params.append('To', repPhone);
    params.append('From', FROM);
    params.append('Url', twimlUrl);
    params.append('Method', 'GET');
    params.append('StatusCallback', statusUrl);
    params.append('StatusCallbackEvent', 'initiated');
    params.append('StatusCallbackEvent', 'ringing');
    params.append('StatusCallbackEvent', 'answered');
    params.append('StatusCallbackEvent', 'completed');
    params.append('StatusCallbackMethod', 'POST');
    params.append('Record', 'true');

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      return NextResponse.json({ error: twilioData.message || 'Twilio call failed', code: twilioData.code }, { status: 400 });
    }

    // 2. Create call_log entry in Supabase with call_sid
    const logRes = await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        lead_id: leadId,
        rep_id: repId,
        call_sid: twilioData.sid,
        call_type: 'twilio',
        outcome: 'no_answer', // default, updated when rep logs outcome
        twilio_status: 'initiated',
        business_name: leadName || null,
      }),
    });

    if (!logRes.ok) {
      const logErr = await logRes.text();
      console.error('call_log insert failed:', logErr);
      return NextResponse.json({ error: 'Call initiated but failed to create log: ' + logErr }, { status: 500 });
    }

    const logData = await logRes.json();

    return NextResponse.json({
      callSid: twilioData.sid,
      status: 'initiated',
      callLogId: Array.isArray(logData) ? logData[0]?.id : null,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
