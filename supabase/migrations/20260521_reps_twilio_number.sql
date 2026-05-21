-- reps.twilio_number — schema prep for per-rep DID (Direct Inward Dial) numbers.
--
-- Currently all reps share +12494682807 (TWILIO_PHONE_NUMBER env var) for both
-- outbound dials and inbound routing. As the team grows past ~5 active reps,
-- per-rep numbers become valuable:
--   * Lead trust — consistent caller ID across multiple touches from the same rep.
--   * Caller-ID confusion fix — multiple reps calling same lead no longer share
--     the same outbound number.
--   * Carrier deliverability — spreads outbound reputation across numbers
--     instead of concentrating spam-flag risk on one DID.
--   * A2P 10DLC throughput — each number has its own per-second cap.
--
-- Cost: ~$1.15/month per US number on Twilio. 10 reps = ~$11.50/month.
--
-- This column is nullable and unused by Slice 1 of the rep cockpit build —
-- purely forward-compat schema prep. When per-rep numbers are bought:
--   1. Populate reps.twilio_number for each rep (E.164: +14165551234).
--   2. Update initiate-call route to read reps.twilio_number || TWILIO_PHONE_NUMBER.
--   3. Update inbound-voice routing to match the inbound's "To" number against
--      reps.twilio_number first (lead called Isaiah's number → goes to Isaiah,
--      no DB lookup needed).
-- Until then, outbound continues using TWILIO_PHONE_NUMBER env var unchanged.

ALTER TABLE public.reps
  ADD COLUMN IF NOT EXISTS twilio_number text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reps_twilio_number
  ON public.reps(twilio_number)
  WHERE twilio_number IS NOT NULL;

COMMENT ON COLUMN public.reps.twilio_number IS
  'Per-rep Twilio DID in E.164 format (e.g. +14165551234). NULL = use shared TWILIO_PHONE_NUMBER env var. Unique when set so inbound routing can match incoming "To" number → rep. Bought at scale (>5 active reps).';
