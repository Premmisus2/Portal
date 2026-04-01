// Premmisus Dialer — TwiML Bridge
// Called by Twilio when rep answers their phone
// Returns TwiML XML to bridge rep to lead with recording

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadPhone = searchParams.get('leadPhone') || '';
  const leadName = searchParams.get('leadName') || 'the lead';
  const BASE = (process.env.BASE_URL || '').trim();

  if (!leadPhone) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Say voice="alice">Error: no phone number provided.</Say><Hangup/></Response>`,
      { headers: { 'Content-Type': 'application/xml' } }
    );
  }

  const recordingCallback = BASE ? `${BASE}/api/recording-callback` : '';

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${leadName.replace(/[<>&"']/g, '')}. This call is being recorded.</Say>
  <Dial record="record-from-answer-dual"${recordingCallback ? ` recordingStatusCallback="${recordingCallback}" recordingStatusCallbackMethod="POST"` : ''} timeout="30" callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">
    <Number>${leadPhone.replace(/[^+0-9]/g, '')}</Number>
  </Dial>
  <Say voice="alice">The call has ended. Goodbye.</Say>
</Response>`;

  return new Response(twiml, { headers: { 'Content-Type': 'application/xml' } });
}
