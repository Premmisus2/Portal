-- Premmisus Sales Portal — notifications_log retroactive migration
--
-- Tier 1 #6 from the May 1 2026 audit (#notifications-log-migration).
-- The table was created manually in Supabase UI at some prior point and has
-- been receiving writes from cron-idle-check, cron-callback-reminder, and
-- cron-daily-summary, but no migration was checked in. This migration
-- captures the live schema so the table is reproducible on a new project
-- or after disaster recovery.
--
-- Idempotent — uses CREATE TABLE IF NOT EXISTS, so running on the live DB
-- where the table already exists is a no-op.

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,                    -- 'idle' | 'callback_reminder' | 'daily_summary' | future types
  recipient text NOT NULL,               -- rep_id UUID (string form) or 'director'
  channel text NOT NULL,                 -- 'sms' | 'telegram' | 'sms+telegram'
  message text NOT NULL,                 -- human-readable description of what was sent
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes — optimize the dedup queries that cron-idle-check runs at line ~63
-- (looking for "did we already alert this recipient today?")
CREATE INDEX IF NOT EXISTS idx_notifications_log_type_recipient_created
  ON public.notifications_log(type, recipient, created_at DESC);

-- No RLS by design — this table is service-role-only (cron routes use
-- SUPABASE_SERVICE_KEY which bypasses RLS). If any future client-side code
-- needs to read this, add explicit RLS policies at that time.
