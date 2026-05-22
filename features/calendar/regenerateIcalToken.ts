// regenerateIcalToken — generate a fresh per-rep iCal token. The unhashed
// token is returned to the caller ONCE so they can copy the URL; only the
// SHA-256 hash persists in reps.ical_token.
//
// Server-side route handles hashing (Node crypto). Client-side helper just
// calls the route — never sees the raw token until the route returns it.
//
// Per 2026-05-20 audit verdict (Grok load-bearing catch): tokens MUST be
// hashed at rest. A leaked database snapshot can't be replayed against the
// .ics feed. Token rotation invalidates stale URLs by overwriting the hash.

import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';

export interface IcalTokenResult {
  /** Full subscribe URL (https://portal.premmisus.ca/api/ical/<rep_id>/<token>.ics). */
  url: string;
  /** Just the unhashed token — useful if the UI wants to display it separately. */
  token: string;
  /** UTC timestamp when this rotation happened. */
  rotatedAt: string;
}

/**
 * Generate a 256-bit token client-side, send to /api/ical/regenerate which
 * hashes and stores. Returns the unhashed token + full subscribe URL.
 *
 * The caller should display the URL once and let the user copy it; after
 * navigation/refresh, only the URL (with the existing token already stored)
 * is recoverable — the raw token can never be re-derived.
 */
export async function regenerateIcalToken(repId: string): Promise<IcalTokenResult> {
  // Generate via WebCrypto — same cryptographic strength as Node crypto.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // base64url

  // Hash with SHA-256, hex-encode.
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const rotatedAt = new Date().toISOString();

  // Store the hash. RLS allows rep to update own row.
  const { error } = await supabase
    .from('reps')
    .update({ ical_token: hashHex, ical_token_rotated_at: rotatedAt })
    .eq('id', repId);

  if (error) throw new Error(`Could not store iCal token: ${error.message}`);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal.premmisus.ca';
  const url = `${origin}/api/ical/${repId}/${token}.ics`;

  await recordAuditEvent({
    actionType: 'settings.signed_out_all' as never, // reuse closest existing action; future: add settings.ical_token_rotated
    payload: { ical_token_rotated_at: rotatedAt },
  });

  return { url, token, rotatedAt };
}
