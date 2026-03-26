// Premmisus Dialer — TwiML Bridge
// Called by Twilio when rep answers their phone
// Returns TwiML XML to bridge rep to lead with recording

export default function handler(req: any, res: any) {
  const leadPhone = req.query?.leadPhone || '';
  const leadName = req.query?.leadName || 'the lead';
  const BASE = (process.env.BASE_URL || '').trim();

  if (!leadPhone) {
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="alice">Error: no phone number provided.</Say><Hangup/></Response>`);
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

  res.setHeader('Content-Type', 'application/xml');
  return res.status(200).send(twiml);
}
