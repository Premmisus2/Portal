-- Extend call_logs.source enum to include 'manual' for ad-hoc dials from
-- the Call Center manual dialer (Slice 1.6 polish 2026-05-21).
--
-- 'manual' = rep dialed an arbitrary number without first having a lead.
-- The dialer flow creates a stub lead on the fly then initiates the call;
-- both lead.source and call_logs.source carry the 'manual' tag for analytics
-- ("how often do we dial numbers that aren't in our pipeline?").

ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_source_check;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_source_check
  CHECK (source IN ('cockpit', 'coldcall', 'manual'));
