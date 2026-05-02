-- Notification Routes
-- Per-alert-type Telegram routing. Rows here override the single TELEGRAM_CHAT_ID
-- env var. If no row exists for an alert_type, sender falls back to the env var
-- (forward-compat: pre-migration the table doesn't exist and lookups silently
-- degrade — every alert keeps going to the default chat).
--
-- alert_type values currently emitted by the portal:
--   server_error         (lib/server-error.ts)
--   client_error         (lib/error-reporting.ts → notify-telegram)
--   booked_call          (CallLogger when rep books a call)
--   idle                 (cron-idle-check)
--   daily_summary        (cron-daily-summary)
--   callback_reminder    (cron-callback-reminder)
--   health_check         (cron-health-check)
--   close_approved       (DirectorView when director approves a close)
--   close_rejected       (DirectorView when director rejects a close)
--   cron_failure         (cron-watchdog when a cron is silent)

CREATE TABLE IF NOT EXISTS public.notification_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL UNIQUE,
  telegram_chat_id text NOT NULL,
  telegram_topic_id text,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_routes_alert_type
  ON public.notification_routes (alert_type);

ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API route + cron senders)
CREATE POLICY "service_role_all" ON public.notification_routes
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read (for the routing card UI). The card itself
-- is director-gated client-side AND the CRUD endpoints check role server-side,
-- but reads are harmless either way.
CREATE POLICY "authenticated_read" ON public.notification_routes
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- Auto-bump updated_at on update so the UI can show "edited Xm ago"
CREATE OR REPLACE FUNCTION public.notification_routes_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_routes_updated_at ON public.notification_routes;
CREATE TRIGGER notification_routes_updated_at
  BEFORE UPDATE ON public.notification_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.notification_routes_set_updated_at();

COMMENT ON TABLE public.notification_routes IS 'Per-alert-type Telegram routing. Overrides TELEGRAM_CHAT_ID env var. See #settings-notification-routing.';
COMMENT ON COLUMN public.notification_routes.alert_type IS 'Discriminator matching the type field passed to /api/notify-telegram or the alert family used in lib/server-error.ts.';
COMMENT ON COLUMN public.notification_routes.telegram_topic_id IS 'Optional: Telegram supergroup topic id (message_thread_id in the Bot API).';
