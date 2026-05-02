-- Premmisus Sales Portal — Rep deactivation flag
-- 2026-05-02 #reps-tab-v1
--
-- Adds `active` boolean to reps. Defaults true so existing rows are preserved.
-- App-level effects when active=false:
--   1. LoginView signIn handler refuses sign-in
--   2. Reps tab + assignment dropdowns hide the row
--   3. Bulk-assign + per-row Edit cannot pick this rep
--
-- Auth-level effects: NONE. We do not call supabase.auth.admin here, so the
-- auth user still technically exists. The app-side rejection in LoginView is
-- the gate. If we ever need a hard-disable, a future migration can add a
-- trigger that flips `auth.users.banned_until` on update, but that requires
-- supabase auth admin access we don't expose to the client.

-- Idempotent: safe to run multiple times.
ALTER TABLE reps
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Backfill: any rows inserted before this migration default to active=true,
-- but be explicit about it so the intent is undeniable in audit logs.
UPDATE reps SET active = true WHERE active IS NULL;

CREATE INDEX IF NOT EXISTS idx_reps_active ON reps(active) WHERE active = true;
