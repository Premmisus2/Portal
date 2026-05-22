// SMS compliance helpers — CASL + TCPA + CTIA.
//
// Locked 2026-05-22 after 6-prong audit on the Sales Portal finish-build plan.
// All 6 prongs flagged the SMS-to-lead paths (auto-confirm at booking, AI-drafted
// post-call follow-up) as RED-blockers without a unified consent gate + CASL
// footer. This module is the single chokepoint every SMS-to-LEAD path must go
// through. SMS-to-REP (callback reminders, idle alerts) doesn't need this gate
// — reps are employees, CASL doesn't apply.
//
// What "consent" means here:
//   * Cold outreach to a Canadian small-business's published phone number from
//     Google Maps has *implied* consent under CASL — the number is
//     "conspicuously published" for receiving inquiries.
//   * Any reply, opt-in, or booking interaction promotes that to *express*
//     consent.
//   * A STOP keyword reply (handled by app/api/inbound-sms/route.ts) flips
//     leads.sms_opted_out_at to now() — hard suppression, never sends again.

const SUPABASE_URL = 'https://qokvhrrjrivvshaapncd.supabase.co';

/**
 * Server-side gate. Returns { ok: true } if the lead can receive an SMS,
 * { ok: false, reason } otherwise. Caller must check `ok` before sending.
 *
 * Reasons:
 *   * 'opted_out' — lead replied STOP. Hard block.
 *   * 'no_phone' — lead has no phone number on file.
 *   * 'not_found' — lead_id doesn't resolve.
 *   * 'fetch_failed' — Supabase transient error. Caller should retry later
 *     (notifications_queue retry path handles this).
 */
export async function canSendSmsToLead(
  leadId: string,
  sbServiceKey: string,
): Promise<{ ok: true; phone: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}&select=phone,sms_opted_out_at&limit=1`,
      { headers: { apikey: sbServiceKey, Authorization: `Bearer ${sbServiceKey}` } },
    );
    if (res.status >= 500) return { ok: false, reason: 'fetch_failed' };
    if (!res.ok) return { ok: false, reason: 'not_found' };
    const rows = (await res.json()) as Array<{ phone: string | null; sms_opted_out_at: string | null }>;
    if (!Array.isArray(rows) || rows.length === 0) return { ok: false, reason: 'not_found' };
    const lead = rows[0];
    if (lead.sms_opted_out_at) return { ok: false, reason: 'opted_out' };
    if (!lead.phone) return { ok: false, reason: 'no_phone' };
    return { ok: true, phone: lead.phone };
  } catch {
    return { ok: false, reason: 'fetch_failed' };
  }
}

// Footer locked 2026-05-22. CASL Section 6 requires sender identification +
// unsubscribe mechanism in every CEM (commercial electronic message). The
// 41-char footer is short enough to fit in a single 160-char SMS segment
// alongside ~119 chars of body — kept tight on purpose.
const CASL_FOOTER = ' — Premmisus. Reply STOP to unsubscribe.';

/**
 * Append CASL footer to an SMS body if not already present. Idempotent.
 * Returns the body unchanged if it already includes the footer (so templates
 * with custom phrasing aren't double-tagged).
 */
export function withCaslFooter(body: string): string {
  const lower = body.toLowerCase();
  // Recognize any variant of the unsubscribe instruction so we don't double-tag.
  if (lower.includes('reply stop') || lower.includes('text stop') || lower.includes('unsubscribe')) {
    return body.trim();
  }
  return `${body.trim()}${CASL_FOOTER}`;
}

/** Estimate SMS segment count (GSM-7) — useful for cost warnings in UI. */
export function smsSegmentCount(body: string): number {
  const len = body.length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153); // multipart UDH overhead
}
