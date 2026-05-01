-- Cron Alert Deduplication
-- Tracks every alert the watchdog sends so it can suppress repeats and escalate.
-- Why: Without this, a single stuck cron generates one SMS per watchdog tick (every 3h).
-- A 4-day silent failure produced ~30 alerts before the dedupe layer existed.

CREATE TABLE IF NOT EXISTS public.cron_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  alert_reason text NOT NULL,
  alerted_at timestamptz NOT NULL DEFAULT now(),
  sms_sid text,
  message text,
  escalated boolean NOT NULL DEFAULT false,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cron_alerts_job_recent
  ON public.cron_alerts (job_name, alert_reason, alerted_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_alerts_open
  ON public.cron_alerts (job_name)
  WHERE resolved_at IS NULL;

ALTER TABLE public.cron_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.cron_alerts
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read" ON public.cron_alerts
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.cron_alerts IS 'Watchdog alert log. One row per SMS sent. Used to suppress repeats within 12h and trigger escalation after 24h.';
COMMENT ON COLUMN public.cron_alerts.alert_reason IS 'Category: no_recent_success | stuck_running | n8n_overdue.';
COMMENT ON COLUMN public.cron_alerts.escalated IS 'True after the watchdog re-alerts at 24h+ with STILL BROKEN message.';
COMMENT ON COLUMN public.cron_alerts.resolved_at IS 'Set by watchdog when the alerted cron next runs successfully.';
