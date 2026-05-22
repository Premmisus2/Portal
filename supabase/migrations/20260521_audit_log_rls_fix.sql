-- audit_log RLS scope-down — Slice 1 prerequisite migration.
--
-- The original audit_log table (20260504) shipped with
-- `authenticated SELECT (all) USING (true)`. That was acceptable when audit_log
-- only held director-facing state changes (rep.deactivated, lead.assigned).
-- Slice 1 of the rep cockpit (2026-05-19/20 audit) starts writing lead context
-- into `metadata` jsonb on every consequential rep action — at which point any
-- rep with a JWT can hit /rest/v1/audit_log?select=* and exfiltrate the entire
-- lead pipeline. 4/4 audit consensus 2026-05-20 flagged this as critical.
--
-- Fix: scope SELECT to "the rep's own actor rows OR director sees all". The
-- existing public.is_director() function (supabase-fix.sql) is the canonical
-- director check; matches policy shape used elsewhere in the portal.
--
-- Service-role and authenticated INSERT policies remain unchanged.

DROP POLICY IF EXISTS "authenticated_read" ON public.audit_log;

CREATE POLICY "authenticated_read_own_or_director" ON public.audit_log
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    actor_rep_id IN (SELECT id FROM public.reps WHERE auth_id = auth.uid())
    OR public.is_director()
  );
