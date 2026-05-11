-- Migration: Add callback_time and additional_callback_reasons to call_logs.
-- `callback_date` stays DATE (read by AllLeadsTable, LeadRow, ColdCallView,
-- cron-callback-reminder). `callback_time` is a sibling TEXT (HH:MM) so the
-- existing date-string comparisons keep working unchanged.
-- `additional_callback_reasons` mirrors the additional_outcomes pattern —
-- primary reason stays in `callback_reason`, secondaries land in the array.

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS callback_time TEXT,
  ADD COLUMN IF NOT EXISTS additional_callback_reasons TEXT[];
