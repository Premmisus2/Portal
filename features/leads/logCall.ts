// Log a call against a lead. Single source of truth for the "call done"
// transition. Used by both legacy ColdCallView and new /floor.
//
// Side effects (in order):
//   1. INSERT into call_logs with outcome + metadata.
//      The 20260521_lead_touch_counters trigger auto-increments
//      leads.touch_count / connect_count / last_touch_at.
//   2. UPDATE leads.status based on outcome (STATUS_MAP).
//   3. Fire missed-call autoreply for voicemail_left / no_answer.
//      The route guards on auto_reply_sent_at + 24h cooldown.
//   4. Fire director-notification SMS + Telegram for booked / callback_requested
//      (primary OR secondary outcome).
//   5. recordAuditEvent → audit_log row.

import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';

const STATUS_MAP: Record<string, string> = {
  no_answer: 'contacted',
  voicemail_left: 'voicemail',
  callback_requested: 'callback',
  not_interested: 'not_interested',
  booked_call: 'booked',
  wrong_number: 'wrong_number',
  discovery_completed: 'discovery_completed',
  no_show: 'no_show',
};

export interface LogCallParams {
  leadId: string;
  repId: string;
  outcome: string;
  additionalOutcomes?: string[] | null;
  notes?: string | null;
  callbackDate?: string | null;
  callbackTime?: string | null;
  callSid?: string | null;
  /** 'cockpit' (new /floor) or 'coldcall' (legacy). Drives the deprecation metric per 2026-05-19 Round 2 decision #11. */
  source: 'cockpit' | 'coldcall';
  /** Optional context for director-notification + audit row */
  businessName?: string | null;
  phone?: string | null;
  repName?: string | null;
}

export interface LogCallResult {
  callLogId: string;
  newStatus: string;
}

export async function logCall(params: LogCallParams): Promise<LogCallResult> {
  const insertPayload = {
    lead_id: params.leadId,
    rep_id: params.repId,
    outcome: params.outcome,
    additional_outcomes: params.additionalOutcomes ?? null,
    notes: params.notes ?? null,
    callback_date: params.callbackDate ?? null,
    callback_time: params.callbackTime ?? null,
    call_sid: params.callSid ?? null,
    business_name: params.businessName ?? null,
    source: params.source,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('call_logs')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    throw new Error(`call_logs insert failed: ${insertErr?.message || 'no id returned'}`);
  }

  const newStatus = STATUS_MAP[params.outcome] || 'contacted';
  const { error: updateErr } = await supabase
    .from('leads')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', params.leadId);

  if (updateErr) {
    // Status update failed but call_log persisted — surface in audit so a
    // director can reconcile manually.
    await recordAuditEvent({
      actionType: 'lead.call_logged',
      leadId: params.leadId,
      payload: {
        callLogId: inserted.id,
        outcome: params.outcome,
        status_update_failed: true,
        status_update_error: updateErr.message,
      },
    });
    throw new Error(`leads.status update failed: ${updateErr.message}`);
  }

  // Side effect 3: missed-call SMS auto-reply (route is idempotent — 24h cooldown).
  if (params.outcome === 'voicemail_left' || params.outcome === 'no_answer') {
    fetch('/api/missed-call-autoreply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_log_id: inserted.id }),
    }).catch(() => {});
  }

  // Side effect 4: director notifications for booked / callback (primary OR secondary).
  const selected = new Set([params.outcome, ...(params.additionalOutcomes || [])]);
  const bookedHit = selected.has('booked_call') || selected.has('discovery_completed');
  if (bookedHit) void fireDirectorNotif('booked', params);
  if (selected.has('callback_requested')) void fireDirectorNotif('callback', params);

  // Side effect 5: audit_log.
  await recordAuditEvent({
    actionType: 'lead.call_logged',
    leadId: params.leadId,
    payload: {
      callLogId: inserted.id,
      outcome: params.outcome,
      additionalOutcomes: params.additionalOutcomes ?? null,
      newStatus,
      source: params.source,
    },
  });

  return { callLogId: inserted.id, newStatus };
}

async function fireDirectorNotif(type: 'booked' | 'callback', params: LogCallParams): Promise<void> {
  const body = JSON.stringify({
    type,
    repName: params.repName || 'Rep',
    businessName: params.businessName || 'Unknown',
    phone: params.phone || undefined,
    notes: params.notes || undefined,
  });
  // Notify both rails — silent failures are acceptable for director-side alerts.
  fetch('/api/notify-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
  fetch('/api/notify-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
}
