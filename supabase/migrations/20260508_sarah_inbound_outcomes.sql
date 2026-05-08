-- Phase 1 schema prep for the Sarah AI receptionist + inbound callback feature.
-- Apply BEFORE flipping SARAH_ENABLED=true. Until then, Sarah code is gated off
-- and the existing call_logs paths keep working.
--
-- Apply via Supabase Dashboard → SQL Editor (one paste, ~5 seconds).

-- 1. Allow new outcome values produced by inbound flows.
--    'inbound_callback' — used by the existing rep-bridge inbound logger.
--    'ai_receptionist'  — used by the Vapi end-of-call webhook.
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_outcome_check;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_outcome_check
  CHECK (outcome IN (
    'no_answer',
    'voicemail_left',
    'callback_requested',
    'not_interested',
    'booked_call',
    'wrong_number',
    'discovery_completed',
    'no_show',
    'inbound_callback',
    'ai_receptionist'
  ));

-- 2. Add metadata column for Sarah end-of-call analysis (ended_reason,
--    success_eval, cost_usd). Nullable JSONB so existing rows are unaffected.
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 3. Allow lead_id to be null so unknown-caller inbound calls (no matching
--    leads row) can still be logged. Existing rows are unaffected.
ALTER TABLE public.call_logs ALTER COLUMN lead_id DROP NOT NULL;

-- 4. Allow rep_id to be null for ai_receptionist rows where Sarah handled the
--    call without a rep involved (Vapi webhook insert sets rep_id to null).
ALTER TABLE public.call_logs ALTER COLUMN rep_id DROP NOT NULL;
