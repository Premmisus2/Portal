// Premmisus Dialer — Recording Callback
// Receives recording-ready webhook from Twilio
// Stores recording URL in Supabase, then transcribes via Gemini
//
// Hardening (2026-05-01, #twilio-webhook-hardening):
// - updateCallLog now returns a boolean and logs PATCH failures to Telegram
// - transcribeAndStore reports Gemini errors with the actual response body
// - Twilio still gets 200 on every request (avoids retry storms)

import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { reportServerError } from '@/lib/server-error';

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

const ALLOWED_OUTCOMES = [
  'booked_call','callback_requested','no_answer','voicemail_left',
  'not_interested','wrong_number','discovery_completed','no_show'
] as const;
type AllowedOutcome = typeof ALLOWED_OUTCOMES[number];

const MIN_TRANSCRIPT_CHARS_FOR_CLASSIFICATION = 40;

async function updateCallLog(callSid: string, updates: Record<string, any>, sbKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${encodeURIComponent(callSid)}`, {
      method: 'PATCH',
      headers: {
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      await reportServerError(
        'recording-callback.updateCallLog',
        `Supabase PATCH ${res.status}: ${body.slice(0, 200)}`,
        { call_sid: callSid, update_keys: Object.keys(updates).join(',') },
        'twilio-webhook-hardening',
      );
      return false;
    }
    return true;
  } catch (err) {
    await reportServerError(
      'recording-callback.updateCallLog',
      err,
      { call_sid: callSid, update_keys: Object.keys(updates).join(',') },
      'twilio-webhook-hardening',
    );
    return false;
  }
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
      await classifyAndStore(callSid, transcript, SB_KEY);
    } else {
      await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Gemini returned empty response' }, SB_KEY);
    }

  } catch (transcribeErr: any) {
    await updateCallLog(callSid, { transcript_status: 'failed', transcript: 'Transcription error: ' + (transcribeErr.message || '').slice(0, 200) }, SB_KEY);
  }
}

async function classifyAndStore(callSid: string, transcript: string, sbKey: string): Promise<void> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
  if (!GEMINI_KEY) return;

  // Skip very short / empty transcripts — likely no_answer or voicemail tone with no speech.
  // Better to leave outcome_auto NULL than fabricate a confident-sounding guess from 5 chars.
  if (!transcript || transcript.trim().length < MIN_TRANSCRIPT_CHARS_FOR_CLASSIFICATION) {
    await updateCallLog(callSid, {
      outcome_auto: 'no_answer',
      outcome_auto_confidence: 0.3,
      outcome_auto_reasoning: 'Transcript too short to classify — defaulted to no_answer',
      outcome_auto_at: new Date().toISOString(),
    }, sbKey);
    return;
  }

  const prompt = `You are classifying the outcome of a cold-call recording for a sales operations system. Read the transcript and pick exactly ONE outcome from this list:

- booked_call: prospect agreed to a strategy/discovery call (any future scheduled meeting)
- callback_requested: prospect asked the rep to call back later (no commitment to a meeting)
- no_answer: phone rang, no one picked up (transcript will be very short or empty)
- voicemail_left: call went to voicemail
- not_interested: prospect declined, hung up, or said "not interested"
- wrong_number: wrong person, business closed/sold, or number disconnected

Return ONLY a JSON object on a single line, no markdown fences, no commentary:
{"outcome":"<one of the values above>","confidence":<0.0-1.0>,"reasoning":"<one sentence>"}

Transcript:
${transcript.slice(0, 8000)}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 256,
            temperature: 0.0,
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                outcome: { type: 'string', enum: [...ALLOWED_OUTCOMES] },
                confidence: { type: 'number' },
                reasoning: { type: 'string' },
              },
              required: ['outcome', 'confidence', 'reasoning'],
              propertyOrdering: ['outcome', 'confidence', 'reasoning'],
            },
          },
        }),
      }
    );

    if (!res.ok) {
      await reportServerError(
        'recording-callback.classifyAndStore.gemini',
        `Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`,
        { call_sid: callSid },
        'outcome-auto-classifier',
      );
      return;
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed: { outcome?: string; confidence?: number; reasoning?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      await reportServerError(
        'recording-callback.classifyAndStore.parse',
        `JSON parse failed: ${text.slice(0, 200)}`,
        { call_sid: callSid },
        'outcome-auto-classifier',
      );
      return;
    }

    if (!parsed.outcome || !ALLOWED_OUTCOMES.includes(parsed.outcome as AllowedOutcome)) {
      await reportServerError(
        'recording-callback.classifyAndStore.invalidOutcome',
        `Gemini returned non-whitelisted outcome: ${parsed.outcome}`,
        { call_sid: callSid, outcome: parsed.outcome },
        'outcome-auto-classifier',
      );
      return;
    }

    await updateCallLog(callSid, {
      outcome_auto: parsed.outcome,
      outcome_auto_confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : null,
      outcome_auto_reasoning: (parsed.reasoning || '').slice(0, 500),
      outcome_auto_at: new Date().toISOString(),
    }, sbKey);

  } catch (err) {
    await reportServerError(
      'recording-callback.classifyAndStore',
      err,
      { call_sid: callSid },
      'outcome-auto-classifier',
    );
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
    await reportServerError(
      'recording-callback.handler',
      err,
      { call_sid: callSid, recording_sid: recordingSid },
      'twilio-webhook-hardening',
    );
    return new Response('OK', { status: 200 });
  }
}
