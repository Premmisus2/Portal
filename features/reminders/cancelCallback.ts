// cancelCallback — mark a callback_tasks row cancelled + flip pending
// notifications_queue rows to status='cancelled' so the worker skips them.
//
// Worker also re-verifies callback_tasks.status='scheduled' before firing,
// so even if this fails partially the reminder won't actually send (defense
// in depth — Perplexity reschedule-race catch).

import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';

export interface CancelCallbackParams {
  callbackTaskId: string;
  reason?: string | null;
}

export async function cancelCallback(params: CancelCallbackParams): Promise<void> {
  // Need the lead_id for the audit row.
  const { data: existing } = await supabase
    .from('callback_tasks')
    .select('lead_id, status')
    .eq('id', params.callbackTaskId)
    .single();

  if (!existing) throw new Error('Callback task not found');
  if (existing.status === 'cancelled') return; // idempotent — already cancelled.

  const cancelledAtIso = new Date().toISOString();

  const { error: taskErr } = await supabase
    .from('callback_tasks')
    .update({ status: 'cancelled', cancelled_at: cancelledAtIso, updated_at: cancelledAtIso })
    .eq('id', params.callbackTaskId);

  if (taskErr) throw new Error(`callback_tasks cancel failed: ${taskErr.message}`);

  // Flip all pending queue rows for this task to 'cancelled'.
  const { error: queueErr } = await supabase
    .from('notifications_queue')
    .update({ status: 'cancelled' })
    .eq('callback_task_id', params.callbackTaskId)
    .eq('status', 'pending');

  if (queueErr) {
    // The callback_tasks row is cancelled, so the worker will skip these
    // even if the queue update failed (it re-checks task status before firing).
    // Surface to audit so we can detect orphan pending rows.
    await recordAuditEvent({
      actionType: 'lead.callback_cancelled',
      leadId: existing.lead_id,
      payload: {
        callbackTaskId: params.callbackTaskId,
        reason: params.reason ?? null,
        queue_cancel_failed: true,
        queue_cancel_error: queueErr.message,
      },
    });
    return;
  }

  await recordAuditEvent({
    actionType: 'lead.callback_cancelled',
    leadId: existing.lead_id,
    payload: {
      callbackTaskId: params.callbackTaskId,
      reason: params.reason ?? null,
    },
  });
}
