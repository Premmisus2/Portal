-- Protect trigger-managed lead counters from client UPDATE.
--
-- The 20260521_lead_touch_counters migration attempted column-level REVOKE
-- on last_touch_at / touch_count / connect_count. That approach failed in
-- practice: column-level REVOKE is masked by the table-level UPDATE grant
-- already on `authenticated`, so reps could still PATCH those columns.
--
-- Confirmed via information_schema.column_privileges 2026-05-21 post-apply.
--
-- Fix: BEFORE UPDATE trigger that resets the trigger-managed columns to OLD
-- whenever the UPDATE comes from a client role. The increment-trigger
-- functions are SECURITY DEFINER, so when they UPDATE leads the row context
-- runs as the function owner (postgres) — current_user = postgres → check
-- skipped → counters update normally. Client UPDATEs run as authenticated
-- → check passes → counters reverted.

CREATE OR REPLACE FUNCTION public.protect_lead_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
-- IMPORTANT: NO SECURITY DEFINER. We need current_user to reflect the
-- originating session (authenticated for client writes; postgres for the
-- internal SECURITY DEFINER increment chain).
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.last_touch_at := OLD.last_touch_at;
    NEW.touch_count := OLD.touch_count;
    NEW.connect_count := OLD.connect_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lead_counters ON public.leads;
CREATE TRIGGER trg_protect_lead_counters
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_lead_counters();
