// Build a playable audio src for a call_log row.
// Twilio recording URLs require Basic Auth, so the browser can't load them
// directly — they all have to go through /api/recording, which authenticates
// server-side. Older rows may not have recording_sid populated, so we extract
// the SID from the stored URL as a fallback.
export function recordingProxySrc(log: { recording_sid?: string | null; recording_url?: string | null }): string | null {
  const sid = log.recording_sid?.trim() || extractRecordingSid(log.recording_url);
  return sid ? `/api/recording?sid=${sid}` : null;
}

function extractRecordingSid(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/Recordings\/(RE[a-f0-9]{32})/i);
  return match ? match[1] : null;
}
