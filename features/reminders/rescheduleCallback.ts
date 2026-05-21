// rescheduleCallback — move an existing callback to a new time.
//
// Pattern: cancel + recreate. The old callback_tasks row gets status='cancelled'
// + cancelled_at, and the old queue rows flip to 'cancelled'. Then a new
// callback_tasks row + 3 new queue rows are inserted with the new time.
// parent_callback_id on the new row chains back to the cancelled one for
// history.

import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';
import { cancelCallback } from './cancelCallback';
import { scheduleCallback } from './scheduleCallback';

export interface RescheduleCallbackParams {
  callbackTaskId: string;
  newScheduledAtUtc: Date;
  newScheduledLocalTime: string;
  newScheduledTz: string;
  notes?: string | null;
}

export async function rescheduleCallback(params: RescheduleCallbackParams): Promise<{ newCallbackTaskId: string }> {
  // Read the existing row for lead_id + rep_id.
  const { data: existing } = await supabase
    .from('callback_tasks')
    .select('id, lead_id, rep_id, call_log_id, status')
    .eq('id', params.callbackTaskId)
    .single();

  if (!existing) throw new Error('Original callback not found');
  if (existing.status !== 'scheduled') {
    throw new Error(`Cannot reschedule a callback with status '${existing.status}'`);
  }

  // Cancel the original (flips queue rows too).
  await cancelCallback({
    callbackTaskId: params.callbackTaskId,
    reason: 'rescheduled',
  });

  // Create the new one.
  const { callbackTaskId: newId } = await scheduleCallback({
    leadId: existing.lead_id,
    repId: existing.rep_id,
    callLogId: existing.call_log_id,
    scheduledAtUtc: params.newScheduledAtUtc,
    scheduledLocalTime: params.newScheduledLocalTime,
    scheduledTz: params.newScheduledTz,
    notes: params.notes ?? null,
  });

  // Chain new → old via parent_callback_id (audit trail).
  await supabase
    .from('callback_tasks')
    .update({ parent_callback_id: params.callbackTaskId })
    .eq('id', newId);

  await recordAuditEvent({
    actionType: 'lead.callback_rescheduled',
    leadId: existing.lead_id,
    payload: {
      oldCallbackTaskId: params.callbackTaskId,
      newCallbackTaskId: newId,
      newScheduledAtUtc: params.newScheduledAtUtc.toISOString(),
    },
  });

  return { newCallbackTaskId: newId };
}
