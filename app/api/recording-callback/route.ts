// Premmisus Dialer — Recording Callback
// Receives recording-ready webhook from Twilio
// Stores recording URL in Supabase, then transcribes via Gemini

import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

async function updateCallLog(callSid: string, updates: Record<string, any>, sbKey: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${callSid}`, {
    method: 'PATCH',
    headers: {
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(updates),
  });
}

async function transcribeAndStore(callSid: string, mp3Url: string) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';

  if (!GEMINI_KEY) {
    await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Gemini API key not configured' }, SB_KEY);
    return;
  }

  try {
    // Download the MP3 from Twilio (requires auth)
    const twilioAuth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const audioRes = await fetch(mp3Url, {
      headers: { 'Authorization': `Basic ${twilioAuth}` },
    });

    if (!audioRes.ok) {
      await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Failed to download recording' }, SB_KEY);
      return;
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // Send to Gemini for transcription
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'audio/mpeg',
                  data: audioBase64,
                }
              },
              {
                text: 'Transcribe this phone call recording. Output ONLY the transcription, nothing else. Use speaker labels (Speaker 1, Speaker 2) to distinguish between the two people on the call. Include timestamps if possible.'
              }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1,
          }
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Gemini error: ' + errText.slice(0, 200) }, SB_KEY);
      return;
    }

    const geminiData = await geminiRes.json();
    const transcript = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (transcript) {
      await updateCallLog(callSid, { transcript, transcript_status: 'completed' }, SB_KEY);
    } else {
      await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Gemini returned empty response' }, SB_KEY);
    }

  } catch (transcribeErr: any) {
    await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Transcription error: ' + (transcribeErr.message || '').slice(0, 200) }, SB_KEY);
  }
}

export async function POST(request: Request) {
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

  // Twilio sends form-encoded data
  const text = await request.text();
  const params = new URLSearchParams(text);
  const callSid = params.get('CallSid') || params.get('callSid') || '';
  const recordingSid = params.get('RecordingSid') || params.get('recordingSid') || '';
  const recordingUrl = params.get('RecordingUrl') || params.get('recordingUrl') || '';
  const recordingDuration = params.get('RecordingDuration') || params.get('recordingDuration') || '';

  if (!callSid || !recordingUrl) return new Response('OK', { status: 200 });

  try {
    // 1. Store recording URL + duration in Supabase
    const mp3Url = recordingUrl + '.mp3';
    const updates: Record<string, any> = {
      recording_sid: recordingSid,
      recording_url: mp3Url,
      transcript_status: 'processing',
    };
    if (recordingDuration) {
      updates.duration_seconds = parseInt(recordingDuration, 10);
    }
    await updateCallLog(callSid, updates, SB_KEY);

    // 2. Return 200 to Twilio immediately, run transcription in background
    const response = NextResponse.json({ received: true });
    waitUntil(transcribeAndStore(callSid, mp3Url));
    return response;

  } catch (err) {
    console.error('recording-callback error:', err);
    return new Response('OK', { status: 200 });
  }
}
