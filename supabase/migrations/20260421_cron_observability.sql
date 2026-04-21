-- Cron Observability Baseline
-- Adds cron_runs table for tracking scheduled job execution.
-- Why: Silent cron failures (POST/GET mismatch, env var drift, Supabase outages) are
-- invisible without a log. This table captures every invocation so the watchdog cron
-- can detect missed cycles and SMS Elliott.

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failure')),
  rows_processed integer,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started
  ON public.cron_runs (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_runs_status
  ON public.cron_runs (status)
  WHERE status != 'success';

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by cron routes + watchdog)
CREATE POLICY "service_role_all" ON public.cron_runs
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users (dashboard, Command Center) can read but not write
CREATE POLICY "authenticated_read" ON public.cron_runs
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.cron_runs IS 'Execution log for every scheduled cron invocation. Populated by cron-tracker helper. Queried by cron-watchdog.';
COMMENT ON COLUMN public.cron_runs.job_name IS 'Matches the route path after /api/ (e.g. cron-idle-check, cron-daily-summary).';
COMMENT ON COLUMN public.cron_runs.status IS 'running -> (success|failure). Watchdog treats missing rows or stale running rows as silent failures.';
