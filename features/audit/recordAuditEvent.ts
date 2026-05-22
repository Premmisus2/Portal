// Single source of truth for audit_log writes.
//
// Wraps lib/audit.ts with a cleaner shape + auto-pulls rep context from
// localStorage so callers don't have to construct AuditParams manually.
// Use this from any new code that touches lead PII or changes state.
//
// Existing components calling lib/audit.ts's audit() / auditFromLocalStorage()
// continue to work — this is additive. Future: retro-wire those callers to
// this function once the features/* pattern is established.
//
// Fire-and-forget — never throws, never blocks the UI.

import { audit, auditFromLocalStorage } from '@/lib/audit';

/**
 * The canonical set of action verbs. Keeping these enumerated (rather than
 * free-form strings) makes it easy to grep, prevents typos, and gives the
 * activity-log UI a known taxonomy to render labels + icons against.
 */
export type AuditAction =
  // Lead lifecycle
  | 'lead.call_logged'
  | 'lead.status_changed'
  | 'lead.callback_scheduled'
  | 'lead.callback_cancelled'
  | 'lead.callback_rescheduled'
  | 'lead.callback_completed'
  | 'lead.callback_recurrence_stopped'
  | 'lead.note_added'
  | 'lead.assigned'
  | 'lead.unassigned'
  // SMS
  | 'sms.sent'
  | 'sms.draft_saved'
  | 'sms.template_applied'
  // Floor surface telemetry (UI events)
  | 'floor.drawer_opened'
  | 'floor.lead_navigated'
  // Director actions
  | 'lead.bulk_assigned'
  | 'close.approved'
  | 'close.rejected';

export interface RecordAuditEventParams {
  actionType: AuditAction;
  /** The lead this event relates to (if any). Auto-fills targetType/targetId. */
  leadId?: string | null;
  /** Override targetType (defaults to 'lead' when leadId is set). */
  targetType?: string | null;
  /** Override targetId (defaults to leadId when set). */
  targetId?: string | null;
  /** Freeform jsonb. Drop in before/after, counts, anything useful in the log. */
  payload?: Record<string, unknown> | null;
}

/**
 * Single point of audit_log writes. Auto-pulls rep context from localStorage.
 * Fire-and-forget — never throws, never blocks.
 *
 * NOTE: `floor.drawer_opened` and `floor.lead_navigated` are high-volume UI
 * telemetry. Per the 2026-05-20 audit (Gemini load-bearing catch), we may
 * move UI telemetry out of Postgres later. For Slice 1 it stays here —
 * sample at the call site if needed.
 */
export async function recordAuditEvent(params: RecordAuditEventParams): Promise<void> {
  const base = auditFromLocalStorage({
    actionType: params.actionType,
    targetType: params.targetType ?? (params.leadId ? 'lead' : null),
    targetId: params.targetId ?? params.leadId ?? null,
    metadata: params.payload ?? null,
  });
  return audit(base);
}
