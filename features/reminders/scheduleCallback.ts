// scheduleCallback — book a callback for a lead. Single-transaction insert
// of one callback_tasks row + 3 notifications_queue rows (T-60 / T-30 / T-10).
//
// Per locked Slice 2 spec (2026-05-20 audit verdict):
//   * scheduled_at_utc is the queue source of truth.
//   * scheduled_local_time + scheduled_tz stored alongside for far-future
//     DST verification (Gemini load-bearing catch).
//   * Worker cron drains notifications_queue every minute.
//   * If reps.cc_director_on_callbacks is true, a 4th queue row routes a
//     director-CC SMS to ELLIOTT_PHONE at T-30 (single reminder, not all 3).

import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';

export interface ScheduleCallbackParams {
  leadId: string;
  repId: string;
  /** UTC moment of the callback (derived from local + tz client-side). */
  scheduledAtUtc: Date;
  /** "HH:MM" — for display + DST verification on the row. */
  scheduledLocalTime: string;
  /** IANA timezone the rep booked in. Snapshot at booking time. */
  scheduledTz: string;
  /** Optional notes — rep's reminder to self about why this callback. */
  notes?: string | null;
  /** If the booking was triggered from a specific call log (e.g. PostCallView). */
  callLogId?: string | null;
}

export interface ScheduleCallbackResult {
  callbackTaskId: string;
}

/**
 * Reject UTC moments in the past or less than 5 minutes out — no point
 * pre-computing T-60/T-30/T-10 reminders that would fire in the past.
 */
function validateScheduledTime(when: Date): void {
  const now = Date.now();
  const t = when.getTime();
  if (Number.isNaN(t)) throw new Error('Invalid scheduled time');
  if (t <= now + 5 * 60_000) {
    throw new Error('Callback must be at least 5 minutes in the future');
  }
}

const OFFSETS_MS = {
  callback_60min: 60 * 60_000,
  callback_30min: 30 * 60_000,
  callback_10min: 10 * 60_000,
};

export async function scheduleCallback(params: ScheduleCallbackParams): Promise<ScheduleCallbackResult> {
  validateScheduledTime(params.scheduledAtUtc);

  const scheduledAtIso = params.scheduledAtUtc.toISOString();

  // 1. Insert the callback_tasks row.
  const { data: task, error: taskErr } = await supabase
    .from('callback_tasks')
    .insert({
      lead_id: params.leadId,
      call_log_id: params.callLogId ?? null,
      rep_id: params.repId,
      scheduled_at_utc: scheduledAtIso,
      scheduled_local_time: params.scheduledLocalTime,
      scheduled_tz: params.scheduledTz,
      notes: params.notes ?? null,
      status: 'scheduled',
    })
    .select('id')
    .single();

  if (taskErr || !task?.id) {
    throw new Error(`callback_tasks insert failed: ${taskErr?.message || 'no id returned'}`);
  }

  // 2. Insert the 3 reminder rows (T-60, T-30, T-10). They share the same
  //    callback_task_id; UNIQUE (callback_task_id, type) prevents accidental
  //    duplicates on retry.
  const queueRows = (Object.entries(OFFSETS_MS) as Array<[keyof typeof OFFSETS_MS, number]>).map(
    ([type, offsetMs]) => ({
      callback_task_id: task.id,
      rep_id: params.repId,
      type,
      send_at_utc: new Date(params.scheduledAtUtc.getTime() - offsetMs).toISOString(),
      status: 'pending' as const,
    }),
  );

  // 3. Check reps.cc_director_on_callbacks to decide whether to add the CC row.
  //    Done in a separate query so the bulk insert doesn't have to know about it.
  const { data: rep } = await supabase
    .from('reps')
    .select('cc_director_on_callbacks')
    .eq('id', params.repId)
    .single();

  if (rep?.cc_director_on_callbacks) {
    queueRows.push({
      callback_task_id: task.id,
      rep_id: params.repId,
      type: 'callback_director_cc' as unknown as keyof typeof OFFSETS_MS, // cast for inserter
      send_at_utc: new Date(params.scheduledAtUtc.getTime() - OFFSETS_MS.callback_30min).toISOString(),
      status: 'pending' as const,
    });
  }

  const { error: queueErr } = await supabase
    .from('notifications_queue')
    .insert(queueRows);

  if (queueErr) {
    // Best-effort cleanup — try to mark the orphan task as cancelled so it
    // doesn't appear as a real callback. The CALLBACK_TASK row exists; the
    // queue failed. Without queue rows, no reminder will fire.
    await supabase.from('callback_tasks').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', task.id);
    throw new Error(`notifications_queue insert failed: ${queueErr.message}`);
  }

  await recordAuditEvent({
    actionType: 'lead.callback_scheduled',
    leadId: params.leadId,
    payload: {
      callbackTaskId: task.id,
      scheduledAtUtc: scheduledAtIso,
      scheduledLocalTime: params.scheduledLocalTime,
      scheduledTz: params.scheduledTz,
      ccDirector: !!rep?.cc_director_on_callbacks,
    },
  });

  return { callbackTaskId: task.id };
}
