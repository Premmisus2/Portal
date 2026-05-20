// Twilio webhook signature verification.
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
//
// Algorithm:
//   1. Take the full URL the webhook was POSTed to (no trailing slash).
//   2. Sort all POST params alphabetically by key.
//   3. Concatenate URL + key1 + val1 + key2 + val2 + ...
//   4. HMAC-SHA1 with TWILIO_AUTH_TOKEN as the secret.
//   5. Base64-encode the digest.
//   6. Compare to the X-Twilio-Signature header (timing-safe).
//
// Without this, anyone who knows a Twilio webhook URL can spoof form data and
// trigger every side effect the route has (call_logs writes, SMS sends, etc).

import { createHmac, timingSafeEqual } from 'crypto';

export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signatureHeader: string,
  authToken: string,
): boolean {
  if (!signatureHeader || !authToken) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}
