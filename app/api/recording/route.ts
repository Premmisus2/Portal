// Premmisus Dialer — Recording Proxy
// Browsers can't play Twilio recording URLs directly because Twilio requires
// HTTP Basic Auth on /Recordings/{Sid}.mp3. This route fetches the MP3 with
// auth server-side and streams it back so <audio> tags can play it.
//
// Range requests are forwarded so audio seeking works.

import { NextRequest } from 'next/server';

const TWILIO_RECORDING_RE = /^RE[a-f0-9]{32}$/i;

export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get('sid') || '';
  if (!TWILIO_RECORDING_RE.test(sid)) {
    return new Response('Bad recording sid', { status: 400 });
  }

  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    return new Response('Twilio credentials not configured', { status: 500 });
  }

  const mp3Url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Recordings/${sid}.mp3`;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

  const headers: Record<string, string> = { Authorization: `Basic ${auth}` };
  const range = request.headers.get('range');
  if (range) headers['Range'] = range;

  const upstream = await fetch(mp3Url, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Twilio responded ${upstream.status}`, { status: upstream.status });
  }

  const passthrough = new Headers();
  for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(key);
    if (value) passthrough.set(key, value);
  }
  if (!passthrough.has('content-type')) passthrough.set('content-type', 'audio/mpeg');
  if (!passthrough.has('accept-ranges')) passthrough.set('accept-ranges', 'bytes');
  passthrough.set('cache-control', 'private, max-age=3600');

  return new Response(upstream.body, { status: upstream.status, headers: passthrough });
}
