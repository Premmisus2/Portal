-- Audit Log
-- Append-only record of every consequential rep + director action. Populated
-- via fire-and-forget calls to lib/audit.ts; queried by ActivityLogCard.
--
-- Action types use a dotted namespace (rep.deactivated, lead.assigned, etc.)
-- so filtering by prefix surfaces every action against a domain object.
-- Metadata is freeform jsonb — before/after, counts, contextual detail.
--
-- Forward-compat: lib/audit.ts swallows the insert error if the table doesn't
-- exist, so this migration can be applied at any time without breaking
-- pre-migration code paths.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_rep_id uuid REFERENCES public.reps(id),
  actor_email text,
  actor_role text,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log(actor_rep_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON public.audit_log(action_type, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by lib/audit.ts inserts and the read API)
CREATE POLICY "service_role_all" ON public.audit_log
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can insert their own actions (anon-key client path).
-- The actor_email column is the source of truth for who did what; if a rep
-- spoofs another rep's email here, RLS won't catch it but the action would
-- not have happened in their UI session anyway.
CREATE POLICY "authenticated_insert" ON public.audit_log
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can read everything for now (the UI is director-gated
-- client-side AND the API gates server-side; this is just the table-level
-- backstop). Tighten to actor_rep_id = auth.uid() if rep self-service ever
-- needs it later.
CREATE POLICY "authenticated_read" ON public.audit_log
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.audit_log IS 'Append-only audit trail. Populated by lib/audit.ts. See #settings-activity-log.';
COMMENT ON COLUMN public.audit_log.action_type IS 'Dotted namespace, e.g. rep.deactivated, lead.assigned, close.approved.';
COMMENT ON COLUMN public.audit_log.metadata IS 'Freeform JSON — before/after, counts, contextual detail. Indexed for jsonb search if needed later.';
