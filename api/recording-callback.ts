// Premmisus Dialer — Recording Callback
// Receives recording-ready webhook from Twilio
// Stores recording URL and duration in Supabase call_logs

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(200).send('OK');

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  // Twilio sends form-encoded data
  const body = req.body || {};
  const callSid = body.CallSid || body.callSid || '';
  const recordingSid = body.RecordingSid || body.recordingSid || '';
  const recordingUrl = body.RecordingUrl || body.recordingUrl || '';
  const recordingDuration = body.RecordingDuration || body.recordingDuration || '';

  if (!callSid || !recordingUrl) return res.status(200).send('OK');

  try {
    const updates: Record<string, any> = {
      recording_sid: recordingSid,
      recording_url: recordingUrl + '.mp3', // Twilio serves recordings as MP3 at this URL
      transcript_status: 'pending', // Ready for Phase 2 transcription
    };

    if (recordingDuration) {
      updates.duration_seconds = parseInt(recordingDuration, 10);
    }

    await fetch(`${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${callSid}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updates),
    });

  } catch (err) {
    console.error('recording-callback error:', err);
  }

  return res.status(200).send('OK');
}
