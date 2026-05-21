-- call_logs.source enum — deprecation instrumentation for /cockpit vs ColdCallView.
--
-- Per 2026-05-19 Round 2 audit (Option C: additive with forcing migration),
-- the new /cockpit route ships alongside the legacy ColdCallView. Reps
-- self-migrate via the gravitational pull of AI features that only live in
-- /cockpit. Deprecation of ColdCallView is data-driven, not opinion-driven:
-- redirect the legacy view to /cockpit when EITHER
--   (a) ≥75% of call_logs.source='cockpit' for 7 consecutive days across all
--       active reps, OR
--   (b) zero ColdCallView usage for 5 consecutive days.
--
-- This migration adds the `source` column day-1 so the metric is instrumented
-- from the moment Slice 1 ships. Default 'coldcall' for backfill safety; new
-- logs from /cockpit set 'cockpit' explicitly.

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'coldcall'
    CHECK (source IN ('cockpit', 'coldcall'));

CREATE INDEX IF NOT EXISTS idx_call_logs_source_created
  ON public.call_logs(source, created_at DESC);

COMMENT ON COLUMN public.call_logs.source IS
  'Which surface created this call_log row. Drives ColdCallView deprecation metric. See /Mafia/handoff/2026-05-19-prompt-sales-portal-rep-cockpit.md decision #11.';
