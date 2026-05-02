// Premmisus Sales Portal — Audit log writer
//
// Fire-and-forget logger for consequential rep + director actions. Inserts
// into the `audit_log` table via the user's authenticated Supabase session
// (anon key + RLS authenticated_insert policy). Never throws, never blocks
// the UI — if the table is missing, RLS denies, or the network drops, the
// call quietly fails and the user's action proceeds normally.
//
// Action type convention: dotted namespace, lowercase, snake_case for the
// verb. Examples: rep.deactivated, rep.activated, rep.role_changed,
// lead.assigned, lead.unassigned, close.approved, close.rejected,
// settings.password_changed, settings.name_updated, settings.signed_out_all,
// auth.signed_in, auth.signed_out, leads.imported, invite.code_generated.
//
// Filter by prefix ("rep.*", "close.*") to surface every action against a
// domain object.
//
// `metadata` is freeform — drop in before/after values, counts, and any
// other context that would be useful to a director scrolling the log at 2am.

import { supabase } from './supabase';
import { reportClientError } from './error-reporting';

export type AuditParams = {
  actorRepId: string | null;
  actorEmail: string;
  actorRole: string;
  actionType: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function readUserAgent(): string | null {
  if (typeof navigator === 'undefined') return null;
  try { return (navigator.userAgent || '').slice(0, 300); } catch { return null; }
}

export async function audit(params: AuditParams): Promise<void> {
  if (!params.actionType) return;
  try {
    const row: Record<string, unknown> = {
      actor_rep_id: params.actorRepId || null,
      actor_email: params.actorEmail || null,
      actor_role: params.actorRole || null,
      action_type: params.actionType,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      metadata: params.metadata ?? null,
      user_agent: readUserAgent(),
      // ip_address is intentionally not captured client-side (the browser
      // can't see its own egress IP reliably). If we ever need it, log it
      // server-side in an /api/audit relay using request headers.
    };
    const { error } = await supabase.from('audit_log').insert(row);
    if (error) {
      // 42P01 = relation does not exist (migration not applied) → swallow
      // silently. Anything else is unexpected; surface to error-reporting
      // for visibility but DON'T re-throw.
      const code = (error as { code?: string }).code || '';
      if (code === '42P01' || /audit_log/.test(error.message || '') && /relation/.test(error.message || '')) {
        return;
      }
      reportClientError('audit.insert', error, { actionType: params.actionType }, 'settings-activity-log');
    }
  } catch (err) {
    // Never let audit failures bubble. Silent unless it's surprising.
    reportClientError('audit.insert', err, { actionType: params.actionType }, 'settings-activity-log');
  }
}

// Convenience helper for the common case where the caller already has the
// rep context in localStorage (every authenticated view). Reads pmss_user
// (display name) + pmss_email + the rep id stashed in pmss_rep_id (if set).
// Returns the params with sensible fallbacks; callers can override any field.
export function auditFromLocalStorage(
  base: Pick<AuditParams, 'actionType'> & Partial<AuditParams>,
): AuditParams {
  let email = '';
  let role = '';
  let repId: string | null = null;
  try {
    email = localStorage.getItem('pmss_email') || '';
    role = localStorage.getItem('pmss_view') === 'rep' ? 'rep' : (localStorage.getItem('pmss_role') || '');
    repId = localStorage.getItem('pmss_rep_id');
  } catch {}
  return {
    actorRepId: base.actorRepId ?? repId,
    actorEmail: base.actorEmail ?? email,
    actorRole: base.actorRole ?? role,
    actionType: base.actionType,
    targetType: base.targetType,
    targetId: base.targetId,
    metadata: base.metadata,
  };
}
