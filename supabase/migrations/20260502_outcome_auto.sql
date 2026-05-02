-- Premmisus Sales Portal — Auto outcome classification
-- 2026-05-02 #outcome-auto-classifier
-- Extends call_logs with AI-classified outcome separate from rep-set outcome.
-- The two coexist so we can compare AI vs human judgment in the Reps tab.

ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS outcome_auto text,
  ADD COLUMN IF NOT EXISTS outcome_auto_confidence numeric,
  ADD COLUMN IF NOT EXISTS outcome_auto_reasoning text,
  ADD COLUMN IF NOT EXISTS outcome_auto_at timestamptz;

-- Whitelist constraint matching constants.ts OUTCOME_LABELS keys.
-- Rep-set `outcome` already has its own CHECK constraint (sql/supabase-audit-fixes.sql).
ALTER TABLE call_logs
  DROP CONSTRAINT IF EXISTS call_logs_outcome_auto_check;
ALTER TABLE call_logs
  ADD CONSTRAINT call_logs_outcome_auto_check
  CHECK (outcome_auto IS NULL OR outcome_auto IN (
    'booked_call','callback_requested','no_answer','voicemail_left',
    'not_interested','wrong_number','discovery_completed','no_show'
  ));

CREATE INDEX IF NOT EXISTS idx_call_logs_outcome_auto
  ON call_logs(outcome_auto) WHERE outcome_auto IS NOT NULL;
