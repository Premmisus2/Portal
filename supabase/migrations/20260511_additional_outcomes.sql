-- Migration: Add additional_outcomes to call_logs for multi-select outcome tagging.
-- Primary outcome stays in the existing `outcome` column (drives lead.status,
-- AI auto-classifier matching, and all existing reads). `additional_outcomes`
-- holds secondary tags selected by the rep in the CallLogger UI.
-- Run in Supabase SQL editor.

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS additional_outcomes TEXT[];
