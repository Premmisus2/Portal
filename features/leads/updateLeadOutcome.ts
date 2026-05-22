// Change a lead's status WITHOUT logging a call. Use cases:
//   * Rep flips "not_interested" back to "callback" after a fresh signal.
//   * Director reassigns a stalled lead's status during cleanup.
//   * Bulk pipeline operations.
//
// For status changes driven by a call outcome, use logCall() instead —
// that path also inserts the call_logs row and fires director notifications.

import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'voicemail'
  | 'callback'
  | 'not_interested'
  | 'booked'
  | 'discovery_completed'
  | 'no_show'
  | 'wrong_number';

export interface UpdateLeadOutcomeParams {
  leadId: string;
  newStatus: LeadStatus;
  notes?: string | null;
  /** Short label for the audit log — e.g., "rep manual override", "director cleanup". */
  reason?: string | null;
}

export async function updateLeadOutcome(params: UpdateLeadOutcomeParams): Promise<void> {
  // Fetch prior status for the audit payload (before/after delta).
  const { data: prior } = await supabase
    .from('leads')
    .select('status')
    .eq('id', params.leadId)
    .single();

  const updates: Record<string, unknown> = {
    status: params.newStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.notes !== undefined && params.notes !== null) {
    updates.notes = params.notes;
  }

  const { error } = await supabase.from('leads').update(updates).eq('id', params.leadId);
  if (error) throw new Error(`leads update failed: ${error.message}`);

  await recordAuditEvent({
    actionType: 'lead.status_changed',
    leadId: params.leadId,
    payload: {
      from: prior?.status ?? null,
      to: params.newStatus,
      reason: params.reason ?? null,
    },
  });
}
