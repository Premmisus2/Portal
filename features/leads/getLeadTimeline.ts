// Returns a unified timeline of every touchpoint on a lead — calls + outbound
// SMS, sorted newest-first. Drives the /floor drawer's history panel.
//
// Each entry tagged with `kind` so the UI can render different chrome per type.
// Status changes are NOT included here — they live in audit_log and surface
// via a separate query if the UI wants them inline.

import { supabase } from '@/lib/supabase';

export type TimelineEntry =
  | {
      kind: 'call';
      id: string;
      created_at: string;
      rep_id: string;
      outcome: string;
      additional_outcomes: string[] | null;
      notes: string | null;
      duration_seconds: number | null;
      transcript: string | null;
      transcript_status: string | null;
      recording_url: string | null;
      source: 'cockpit' | 'coldcall' | null;
    }
  | {
      kind: 'sms';
      id: string;
      created_at: string;
      rep_id: string | null;
      direction: 'inbound' | 'outbound';
      body: string;
      status: string | null;
      from_phone: string;
      to_phone: string;
    };

export async function getLeadTimeline(leadId: string): Promise<TimelineEntry[]> {
  const [callsRes, smsRes] = await Promise.all([
    supabase
      .from('call_logs')
      .select(
        'id, created_at, rep_id, outcome, additional_outcomes, notes, duration_seconds, transcript, transcript_status, recording_url, source',
      )
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sms_messages')
      .select('id, created_at, rep_id, direction, body, status, from_phone, to_phone')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
  ]);

  if (callsRes.error) throw new Error(`call_logs fetch failed: ${callsRes.error.message}`);
  if (smsRes.error) throw new Error(`sms_messages fetch failed: ${smsRes.error.message}`);

  const calls: TimelineEntry[] = (callsRes.data || []).map((c: any) => ({
    kind: 'call' as const,
    id: c.id,
    created_at: c.created_at,
    rep_id: c.rep_id,
    outcome: c.outcome,
    additional_outcomes: c.additional_outcomes,
    notes: c.notes,
    duration_seconds: c.duration_seconds,
    transcript: c.transcript,
    transcript_status: c.transcript_status,
    recording_url: c.recording_url,
    source: c.source,
  }));

  const smses: TimelineEntry[] = (smsRes.data || []).map((s: any) => ({
    kind: 'sms' as const,
    id: s.id,
    created_at: s.created_at,
    rep_id: s.rep_id,
    direction: s.direction,
    body: s.body,
    status: s.status,
    from_phone: s.from_phone,
    to_phone: s.to_phone,
  }));

  return [...calls, ...smses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
