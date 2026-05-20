-- Migration: Inbound callback disposition tagging.
--
-- When a lead calls our Twilio number back (outcome='inbound_callback'),
-- the rep needs a place to record what happened: did they pick up, was the
-- lead interested, did they ask for a follow-up in N months, did they say
-- "don't contact me" (DNC)?
--
-- Reuses existing callback_date / callback_time / callback_reason for the
-- follow-up scheduling so cron-callback-reminder picks these up unchanged.
-- Adds three new columns specific to the inbound disposition flow.

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS inbound_disposition TEXT,
  ADD COLUMN IF NOT EXISTS inbound_disposition_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inbound_disposition_notes TEXT;

-- Drop the old constraint if a prior version of this migration shipped one,
-- then add the canonical disposition CHECK.
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_inbound_disposition_check;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_inbound_disposition_check
  CHECK (inbound_disposition IS NULL OR inbound_disposition IN (
    'interested',
    'follow_up',
    'not_interested',
    'dnc',
    'wrong_person'
  ));

-- Index the "untagged callbacks" query path the lead-row pill uses.
CREATE INDEX IF NOT EXISTS call_logs_untagged_inbound_callbacks_idx
  ON public.call_logs (lead_id, created_at DESC)
  WHERE outcome = 'inbound_callback' AND inbound_disposition IS NULL;
