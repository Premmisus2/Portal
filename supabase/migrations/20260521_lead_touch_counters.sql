-- Lead touch/connect counters — Slice 1 schema for the rep cockpit.
--
-- Adds `last_touch_at`, `touch_count`, `connect_count` materialized columns
-- on `leads`, maintained by AFTER INSERT triggers on `call_logs` and
-- `sms_messages`. These columns drive the "Next Action" sort + "Nth call /
-- Mth connect" banner in /cockpit.
--
-- TAXONOMY (canonical — see /deploy/docs/event-taxonomy.md v1):
--   touch    = rep-driven attempt or conversation. Includes every call_log
--              row with rep_id IS NOT NULL (any outcome), and every outbound
--              SMS row with rep_id IS NOT NULL AND direction='outbound'.
--              EXCLUDES ai_receptionist rows (system event, not rep effort)
--              and STOP/HELP auto-replies (no rep involvement).
--   connect  = touches where a live conversation happened. Subset of touches.
--              Outcomes counted: callback_requested, not_interested,
--              booked_call, discovery_completed, inbound_callback.
--              EXCLUDES no_answer, voicemail_left, wrong_number, no_show.
--
-- Trigger pattern: AFTER INSERT + atomic per-row UPDATE on leads. Not
-- computed columns (can't aggregate across tables) and not materialized
-- views (would lag and break rep trust). Row-level locks on the leads row
-- serialize concurrent updates cleanly; if you ever bulk-import call_logs,
-- do it in batches.
--
-- 4/4 audit verdict 2026-05-20 (Gemini, Perplexity, OpenAI, Grok).
-- Load-bearing safeguards baked in below: REVOKE column-level UPDATE so
-- client-side PATCH /leads can never overwrite trigger-managed columns
-- (Gemini race-condition catch).

-- 1. ADD COLUMNS

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS touch_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS connect_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_last_touch_at
  ON public.leads(last_touch_at DESC NULLS LAST);

COMMENT ON COLUMN public.leads.last_touch_at IS
  'Most recent rep-driven touch (call_log OR outbound SMS). Maintained by triggers — never PATCH from client. See /deploy/docs/event-taxonomy.md.';

COMMENT ON COLUMN public.leads.touch_count IS
  'Count of rep-driven touches. Maintained by triggers. See /deploy/docs/event-taxonomy.md.';

COMMENT ON COLUMN public.leads.connect_count IS
  'Count of live-conversation outcomes from call_logs. Subset of touch_count. Maintained by triggers. See /deploy/docs/event-taxonomy.md.';

-- 2. TRIGGER FOR CALL_LOGS

CREATE OR REPLACE FUNCTION public.update_lead_counters_from_call()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip non-rep-driven rows: ai_receptionist (Sarah solo), STOP/HELP autoresponses,
  -- system reconciliation inserts, or any row lacking lead context.
  IF NEW.rep_id IS NULL OR NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.leads
  SET
    touch_count = touch_count + 1,
    last_touch_at = NEW.created_at,
    connect_count = connect_count + CASE
      WHEN NEW.outcome IN (
        'callback_requested',
        'not_interested',
        'booked_call',
        'discovery_completed',
        'inbound_callback'
      ) THEN 1
      ELSE 0
    END
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_counters_from_call ON public.call_logs;
CREATE TRIGGER trg_lead_counters_from_call
  AFTER INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_counters_from_call();

-- 3. TRIGGER FOR SMS_MESSAGES (touches only; SMS doesn't drive connects)

CREATE OR REPLACE FUNCTION public.update_lead_counters_from_sms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only outbound rep-initiated SMS counts as a touch.
  -- Inbound replies, STOP/HELP autoresponses, and system messages don't.
  IF NEW.direction != 'outbound' OR NEW.rep_id IS NULL OR NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.leads
  SET
    touch_count = touch_count + 1,
    last_touch_at = NEW.created_at
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_counters_from_sms ON public.sms_messages;
CREATE TRIGGER trg_lead_counters_from_sms
  AFTER INSERT ON public.sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_counters_from_sms();

-- 4. BACKFILL existing rows

UPDATE public.leads l
SET
  touch_count = COALESCE(call_subq.touches, 0) + COALESCE(sms_subq.touches, 0),
  connect_count = COALESCE(call_subq.connects, 0),
  last_touch_at = GREATEST(call_subq.last_at, sms_subq.last_at)
FROM (
  SELECT
    lead_id,
    COUNT(*) AS touches,
    COUNT(*) FILTER (WHERE outcome IN (
      'callback_requested','not_interested','booked_call',
      'discovery_completed','inbound_callback'
    )) AS connects,
    MAX(created_at) AS last_at
  FROM public.call_logs
  WHERE rep_id IS NOT NULL AND lead_id IS NOT NULL
  GROUP BY lead_id
) call_subq
FULL OUTER JOIN (
  SELECT
    lead_id,
    COUNT(*) AS touches,
    MAX(created_at) AS last_at
  FROM public.sms_messages
  WHERE direction = 'outbound' AND rep_id IS NOT NULL AND lead_id IS NOT NULL
  GROUP BY lead_id
) sms_subq USING (lead_id)
WHERE l.id = COALESCE(call_subq.lead_id, sms_subq.lead_id);

-- 5. LOCK DOWN trigger-managed columns from client UPDATE.
--    The portal updates leads directly via PostgREST from the browser (anon key
--    + RLS). If a rep's UI submits a full-row PATCH including touch_count, the
--    trigger's atomic increment can be silently overwritten — see Gemini's
--    PostgREST-vs-trigger race-condition catch (2026-05-20 audit).
--    Column-level REVOKE is the durable fix; service_role retains full access.

REVOKE UPDATE (last_touch_at, touch_count, connect_count) ON public.leads FROM authenticated;
REVOKE UPDATE (last_touch_at, touch_count, connect_count) ON public.leads FROM anon;
