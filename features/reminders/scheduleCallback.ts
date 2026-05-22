// scheduleCallback — book a callback for a lead. Single Supabase RPC call
// (schedule_callback_atomic) that does callback_tasks insert + 3 reminder rows
// + optional director CC + auto-confirm SMS to lead all in ONE transaction.
//
// Locked Phase 1 (2026-05-22) after 6-prong audit verdict on the original
// 2-step JS flow — every prong flagged the orphan-task risk if the queue
// insert failed mid-flight. The atomic RPC eliminates that.
//
// Per locked Slice 2 + Phase 1 spec:
//   * scheduled_at_utc is the queue source of truth.
//   * scheduled_local_time + scheduled_tz stored for far-future DST verification.
//   * Worker cron drains notifications_queue every minute.
//   * If reps.cc_director_on_callbacks is true, server enables p_cc_director.
//   * Auto-confirm SMS to lead enqueued at booking; drain worker checks
//     leads.sms_opted_out_at before firing (CASL gate, see lib/sms-compliance).

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
  /** Optional RRULE for recurring callbacks (FREQ=DAILY/WEEKLY/BIWEEKLY/MONTHLY). */
  recurrenceRule?: string | null;
  /** Skip the auto-confirm SMS to the lead (e.g. internal-only callbacks). */
  skipAutoConfirm?: boolean;
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

export async function scheduleCallback(params: ScheduleCallbackParams): Promise<ScheduleCallbackResult> {
  validateScheduledTime(params.scheduledAtUtc);

  const scheduledAtIso = params.scheduledAtUtc.toISOString();

  // Read rep CC preference (one query — could be inlined in RPC later if we
  // want a single round-trip; kept here so the RPC stays a pure scheduler).
  const { data: rep } = await supabase
    .from('reps')
    .select('cc_director_on_callbacks')
    .eq('id', params.repId)
    .single();

  const { data, error } = await supabase.rpc('schedule_callback_atomic', {
    p_lead_id: params.leadId,
    p_rep_id: params.repId,
    p_scheduled_at_utc: scheduledAtIso,
    p_scheduled_local_time: params.scheduledLocalTime,
    p_scheduled_tz: params.scheduledTz,
    p_notes: params.notes ?? null,
    p_call_log_id: params.callLogId ?? null,
    p_recurrence_rule: params.recurrenceRule ?? null,
    p_cc_director: !!rep?.cc_director_on_callbacks,
    p_send_auto_confirm: params.skipAutoConfirm ? false : true,
  });

  if (error || !data) {
    throw new Error(`schedule_callback_atomic failed: ${error?.message || 'no id returned'}`);
  }

  const callbackTaskId = data as string;

  await recordAuditEvent({
    actionType: 'lead.callback_scheduled',
    leadId: params.leadId,
    payload: {
      callbackTaskId,
      scheduledAtUtc: scheduledAtIso,
      scheduledLocalTime: params.scheduledLocalTime,
      scheduledTz: params.scheduledTz,
      ccDirector: !!rep?.cc_director_on_callbacks,
      recurrenceRule: params.recurrenceRule ?? null,
      autoConfirmEnqueued: !params.skipAutoConfirm,
    },
  });

  return { callbackTaskId };
}

/**
 * Find any existing rep callbacks within ±window minutes of the target UTC
 * moment. Used by the booking UI to WARN (never block) on overlaps. Per-rep
 * scoped so no cross-rep schedule data leaks.
 */
export async function findCallbackConflicts(params: {
  repId: string;
  targetUtc: Date;
  windowMinutes?: number;
}): Promise<Array<{ id: string; businessName: string; scheduledAtUtc: string }>> {
  const { data, error } = await supabase.rpc('find_callback_conflicts', {
    p_rep_id: params.repId,
    p_target_utc: params.targetUtc.toISOString(),
    p_window_minutes: params.windowMinutes ?? 15,
  });
  if (error || !data) return [];
  return (data as Array<{ callback_id: string; business_name: string; scheduled_at_utc: string }>).map(r => ({
    id: r.callback_id,
    businessName: r.business_name,
    scheduledAtUtc: r.scheduled_at_utc,
  }));
}

/**
 * Mark a callback complete + expand the next occurrence atomically if
 * recurrence_rule is set on the parent. Returns the new child callback id
 * (or null if non-recurring).
 */
export async function completeCallback(params: {
  callbackTaskId: string;
  leadId: string;
}): Promise<{ nextCallbackId: string | null }> {
  const nowIso = new Date().toISOString();

  // 1. Flip the status — RLS allows rep update on own callback_tasks rows.
  const { error: updateErr } = await supabase
    .from('callback_tasks')
    .update({ status: 'completed', completed_at: nowIso })
    .eq('id', params.callbackTaskId);

  if (updateErr) {
    throw new Error(`Failed to complete callback: ${updateErr.message}`);
  }

  // 2. Call expand RPC — returns new child id if recurrence rule was set, NULL otherwise.
  const { data: nextId, error: expandErr } = await supabase.rpc('expand_recurring_callback', {
    p_completed_task_id: params.callbackTaskId,
  });

  if (expandErr) {
    // Best-effort log — completion already saved, just no recurrence.
    await recordAuditEvent({
      actionType: 'lead.callback_completed',
      leadId: params.leadId,
      payload: {
        callbackTaskId: params.callbackTaskId,
        recurrenceExpandError: expandErr.message,
      },
    });
    return { nextCallbackId: null };
  }

  await recordAuditEvent({
    actionType: 'lead.callback_completed',
    leadId: params.leadId,
    payload: {
      callbackTaskId: params.callbackTaskId,
      nextCallbackId: (nextId as string | null) || null,
    },
  });

  return { nextCallbackId: (nextId as string | null) || null };
}

/**
 * Stop a recurring series — sets recurrence_rule=NULL on the current callback.
 * The current occurrence stays; no future expansions.
 */
export async function stopRecurringCallback(params: {
  callbackTaskId: string;
  leadId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('callback_tasks')
    .update({ recurrence_rule: null })
    .eq('id', params.callbackTaskId);

  if (error) {
    throw new Error(`Failed to stop recurrence: ${error.message}`);
  }

  await recordAuditEvent({
    actionType: 'lead.callback_recurrence_stopped',
    leadId: params.leadId,
    payload: { callbackTaskId: params.callbackTaskId },
  });
}
