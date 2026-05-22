-- Web Push subscriptions — one row per (rep, device).
-- Used by /api/inbound-sms to fan out push notifications when a lead texts back.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS push_subscriptions_rep_id_idx ON push_subscriptions(rep_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_service_role_all" ON push_subscriptions;
CREATE POLICY "push_subscriptions_service_role_all" ON push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "push_subscriptions_rep_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_rep_own" ON push_subscriptions
  FOR ALL TO authenticated
  USING (rep_id::text = auth.uid()::text)
  WITH CHECK (rep_id::text = auth.uid()::text);

COMMENT ON TABLE push_subscriptions IS 'Per-device Web Push subscriptions. One row per (rep, device). Used by /api/inbound-sms to fan out push notifications when a lead texts back.';
