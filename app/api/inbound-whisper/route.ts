// Premmisus Dialer — Whisper played to the rep when they answer an inbound bridge,
// before Twilio connects them to the lead.

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function whisperFor(biz: string) {
  const safe = escapeXml(biz);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Inbound callback from ${safe}. Connecting now.</Say>
</Response>`;
}

function whisperGeneric() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Inbound call from an unknown number. Connecting now.</Say>
</Response>`;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const biz = (searchParams.get('biz') || '').trim();
  return new Response(biz ? whisperFor(biz) : whisperGeneric(), { headers: { 'Content-Type': 'application/xml' } });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const biz = (searchParams.get('biz') || '').trim();
  return new Response(biz ? whisperFor(biz) : whisperGeneric(), { headers: { 'Content-Type': 'application/xml' } });
}
