// Send an outbound SMS to a lead. Thin client-side wrapper around /api/send-sms.
//
// The route handles:
//   * leads.sms_opted_out_at check (TCPA / CTIA compliance — refuses if set)
//   * Twilio API call
//   * sms_messages row insert (which triggers the touch_count counter via
//     the 20260521_lead_touch_counters trigger on sms_messages INSERT)
//   * Failure-path row insert for tracking even when Twilio rejects
//
// On success, this wrapper also writes an audit_log entry via recordAuditEvent.

import { recordAuditEvent } from '@/features/audit';

export interface SendSmsParams {
  leadId: string;
  repId: string;
  body: string;
  /** Optional: was this drafted from a template? Logged for analytics. */
  templateId?: string | null;
  /** Optional: the original AI/template draft before rep edits. Lets us measure rep override rate (Slice 3 template-quality loop). */
  originalDraft?: string | null;
}

export interface SendSmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const res = await fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: params.leadId,
      rep_id: params.repId,
      body: params.body,
    }),
  });

  let data: { sid?: string; status?: string; error?: string; code?: string | number } = {};
  try {
    data = await res.json();
  } catch {
    /* swallow — handled by !res.ok below */
  }

  if (!res.ok) {
    return { success: false, error: data.error || `HTTP ${res.status}` };
  }

  await recordAuditEvent({
    actionType: 'sms.sent',
    leadId: params.leadId,
    payload: {
      twilio_sid: data.sid ?? null,
      twilio_status: data.status ?? null,
      template_id: params.templateId ?? null,
      body_length: params.body.length,
      had_edits: params.originalDraft != null && params.originalDraft !== params.body,
    },
  });

  return { success: true, sid: data.sid, status: data.status };
}
