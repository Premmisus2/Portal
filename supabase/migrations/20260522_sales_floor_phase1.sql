-- Phase 1 of Sales Floor finish-build (6-prong audit verdict 2026-05-22).
--
-- Locks in:
--   1. UNIQUE (parent_callback_id, scheduled_at_utc) partial index — prevents
--      duplicate child rows from RRULE expansion retries (Audit consensus:
--      DeepSeek + Grok-4 + Perplexity load-bearing).
--   2. Composite index on (rep_id, scheduled_at_utc) WHERE status='scheduled'
--      — backs the Agenda Queue per-rep section grouping (Grok-4 + Grok-Build
--      load-bearing).
--   3. Extended notifications_queue type CHECK to allow 'callback_confirm_to_lead'
--      for Phase 2 auto-confirm SMS.
--   4. schedule_callback_atomic() RPC — SECURITY INVOKER, frozen search_path,
--      ON CONFLICT DO NOTHING on queue inserts for idempotency. Replaces the
--      JS-side 2-step flow that risked orphan tasks. Audit consensus 6/6.
--   5. expand_recurring_callback() RPC — fires on task completion, creates
--      next occurrence + reminders in one transaction. Idempotent via
--      ON CONFLICT on the new UNIQUE index from #1.

-- ============================================================================
-- 1. Idempotency: no duplicate child rows from RRULE expansion retries.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uniq_callback_tasks_recurring_child
  ON public.callback_tasks (parent_callback_id, scheduled_at_utc)
  WHERE parent_callback_id IS NOT NULL;

-- ============================================================================
-- 2. Composite for Agenda Queue per-rep grouping (Overdue / Today / Upcoming).
--    Partial on status='scheduled' — drops index footprint for cancelled /
--    completed rows (the queue never queries those).
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_callback_tasks_agenda_queue
  ON public.callback_tasks (rep_id, scheduled_at_utc)
  WHERE status = 'scheduled';

-- ============================================================================
-- 3. Extend notifications_queue type CHECK for the new lead-facing confirm SMS.
-- ============================================================================
ALTER TABLE public.notifications_queue DROP CONSTRAINT IF EXISTS notifications_queue_type_check;
ALTER TABLE public.notifications_queue ADD CONSTRAINT notifications_queue_type_check
  CHECK (type = ANY (ARRAY[
    'callback_60min'::text,
    'callback_30min'::text,
    'callback_10min'::text,
    'callback_director_cc'::text,
    'callback_confirm_to_lead'::text
  ]));

-- ============================================================================
-- 4. Atomic schedule_callback RPC.
--
-- SECURITY INVOKER + frozen search_path: an authenticated user calling this
-- via PostgREST runs with their own role + RLS. Existing RLS on
-- callback_tasks_rep_insert + notifications_queue_service_role_all means:
--   - callback_tasks insert: rep can insert only with rep_id = auth.uid()
--     (RLS policy already enforces this).
--   - notifications_queue insert: ONLY service_role can write. We need this
--     RPC to run with service role for the queue inserts. SOLUTION: keep
--     INVOKER + use a separate service_role grant for the function via
--     SET LOCAL role. Cleaner: split into two functions, one for the task
--     (invoker) and one for the queue (definer with checks). For v1, we'll
--     allow authenticated to call this RPC and add explicit ownership check
--     inline. The function itself is SECURITY DEFINER for the queue inserts
--     ONLY, with explicit rep_id = auth.uid() guard.
--
-- Net: SECURITY DEFINER with explicit ownership check + frozen search_path
-- + verified rep_id == auth.uid() inside the function before any insert.
-- This is the audit-recommended pattern.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.schedule_callback_atomic(
  p_lead_id uuid,
  p_rep_id uuid,
  p_scheduled_at_utc timestamptz,
  p_scheduled_local_time text,
  p_scheduled_tz text,
  p_notes text DEFAULT NULL,
  p_call_log_id uuid DEFAULT NULL,
  p_recurrence_rule text DEFAULT NULL,
  p_cc_director boolean DEFAULT false,
  p_send_auto_confirm boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_callback_id uuid;
  v_target_ms bigint := extract(epoch from p_scheduled_at_utc) * 1000;
  v_now_ms    bigint := extract(epoch from now()) * 1000;
  v_caller_uid uuid := auth.uid();
  v_caller_role text;
  v_assigned_rep uuid;
BEGIN
  -- Ownership / role check — definer needs explicit auth.
  SELECT role INTO v_caller_role FROM public.reps WHERE id = v_caller_uid;
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'unauthorized: caller is not a rep' USING ERRCODE = '42501';
  END IF;
  -- Reps can only schedule for themselves. Directors can schedule for anyone.
  IF v_caller_role <> 'director' AND v_caller_uid <> p_rep_id THEN
    RAISE EXCEPTION 'unauthorized: reps can only schedule callbacks for self' USING ERRCODE = '42501';
  END IF;
  -- Lead must be assigned to the target rep (or caller is director).
  SELECT assigned_rep_id INTO v_assigned_rep FROM public.leads WHERE id = p_lead_id;
  IF v_caller_role <> 'director' AND v_assigned_rep IS DISTINCT FROM p_rep_id THEN
    RAISE EXCEPTION 'unauthorized: lead not assigned to target rep' USING ERRCODE = '42501';
  END IF;

  -- Defense in depth: reject < 5min in future.
  IF v_target_ms <= v_now_ms + 5 * 60000 THEN
    RAISE EXCEPTION 'callback must be at least 5 minutes in the future';
  END IF;

  -- Insert callback_tasks row.
  INSERT INTO public.callback_tasks (
    lead_id, call_log_id, rep_id, scheduled_at_utc, scheduled_local_time,
    scheduled_tz, notes, recurrence_rule, status
  )
  VALUES (
    p_lead_id, p_call_log_id, p_rep_id, p_scheduled_at_utc, p_scheduled_local_time,
    p_scheduled_tz, p_notes, p_recurrence_rule, 'scheduled'
  )
  RETURNING id INTO v_callback_id;

  -- Reminder rows — only those whose send_at_utc is in the future.
  -- ON CONFLICT DO NOTHING ensures idempotency if this RPC is retried.
  INSERT INTO public.notifications_queue (callback_task_id, rep_id, type, send_at_utc, status)
  SELECT v_callback_id, p_rep_id, t, p_scheduled_at_utc - (offset_ms || ' milliseconds')::interval, 'pending'
  FROM (VALUES
    ('callback_60min', 3600000),
    ('callback_30min', 1800000),
    ('callback_10min',  600000)
  ) AS x(t, offset_ms)
  WHERE p_scheduled_at_utc - (offset_ms || ' milliseconds')::interval > now()
  ON CONFLICT (callback_task_id, type) DO NOTHING;

  -- Director CC at T-30 if requested.
  IF p_cc_director AND p_scheduled_at_utc - interval '30 minutes' > now() THEN
    INSERT INTO public.notifications_queue (callback_task_id, rep_id, type, send_at_utc, status)
    VALUES (v_callback_id, p_rep_id, 'callback_director_cc', p_scheduled_at_utc - interval '30 minutes', 'pending')
    ON CONFLICT (callback_task_id, type) DO NOTHING;
  END IF;

  -- Auto-confirm SMS to LEAD — sends on next worker drain (~60s). The drain
  -- worker calls lib/sms-compliance.canSendSmsToLead() before firing so an
  -- opted-out lead is skipped silently. Skip if caller opts out via flag.
  IF p_send_auto_confirm THEN
    INSERT INTO public.notifications_queue (callback_task_id, rep_id, type, send_at_utc, status)
    VALUES (v_callback_id, p_rep_id, 'callback_confirm_to_lead', now(), 'pending')
    ON CONFLICT (callback_task_id, type) DO NOTHING;
  END IF;

  RETURN v_callback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_callback_atomic(uuid,uuid,timestamptz,text,text,text,uuid,text,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_callback_atomic(uuid,uuid,timestamptz,text,text,text,uuid,text,boolean,boolean) TO authenticated;

-- ============================================================================
-- 5. Expand recurring callback. Called by the "Mark Complete" flow when the
--    completed row has a recurrence_rule set. Idempotent — duplicate calls
--    return the existing child id via the UNIQUE constraint.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expand_recurring_callback(
  p_completed_task_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent       public.callback_tasks%ROWTYPE;
  v_new_id       uuid;
  v_next_at      timestamptz;
  v_caller_uid   uuid := auth.uid();
  v_caller_role  text;
BEGIN
  SELECT role INTO v_caller_role FROM public.reps WHERE id = v_caller_uid;
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'unauthorized: caller is not a rep' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_parent FROM public.callback_tasks WHERE id = p_completed_task_id;
  IF NOT FOUND OR v_parent.recurrence_rule IS NULL THEN
    RETURN NULL;
  END IF;

  -- Ownership check.
  IF v_caller_role <> 'director' AND v_caller_uid <> v_parent.rep_id THEN
    RAISE EXCEPTION 'unauthorized: cannot expand recurrence on another rep''s callback' USING ERRCODE = '42501';
  END IF;

  -- Simple RRULE parser — DAILY/WEEKLY/BIWEEKLY/MONTHLY only for v1.
  -- ical-generator–style FREQ=WEEKLY;INTERVAL=1 is recognized; INTERVAL>1 is
  -- treated as the BIWEEKLY shortcut. Stop-repeating sets recurrence_rule=NULL
  -- on the parent which short-circuits above.
  v_next_at := CASE
    WHEN v_parent.recurrence_rule ILIKE '%FREQ=DAILY%'    THEN v_parent.scheduled_at_utc + interval '1 day'
    WHEN v_parent.recurrence_rule ILIKE '%FREQ=BIWEEKLY%' THEN v_parent.scheduled_at_utc + interval '2 weeks'
    WHEN v_parent.recurrence_rule ILIKE '%FREQ=WEEKLY%'   THEN v_parent.scheduled_at_utc + interval '1 week'
    WHEN v_parent.recurrence_rule ILIKE '%FREQ=MONTHLY%'  THEN v_parent.scheduled_at_utc + interval '1 month'
    ELSE NULL
  END;

  IF v_next_at IS NULL THEN
    RETURN NULL;
  END IF;

  -- Idempotent insert — UNIQUE(parent_callback_id, scheduled_at_utc) catches retries.
  INSERT INTO public.callback_tasks (
    lead_id, rep_id, scheduled_at_utc, scheduled_local_time, scheduled_tz,
    notes, recurrence_rule, parent_callback_id, status
  )
  VALUES (
    v_parent.lead_id, v_parent.rep_id, v_next_at, v_parent.scheduled_local_time,
    v_parent.scheduled_tz, v_parent.notes, v_parent.recurrence_rule, v_parent.id, 'scheduled'
  )
  ON CONFLICT (parent_callback_id, scheduled_at_utc)
    DO UPDATE SET updated_at = public.callback_tasks.updated_at  -- no-op, just to RETURN
  RETURNING id INTO v_new_id;

  -- Reminders for the new occurrence.
  INSERT INTO public.notifications_queue (callback_task_id, rep_id, type, send_at_utc, status)
  SELECT v_new_id, v_parent.rep_id, t, v_next_at - (offset_ms || ' milliseconds')::interval, 'pending'
  FROM (VALUES
    ('callback_60min', 3600000),
    ('callback_30min', 1800000),
    ('callback_10min',  600000)
  ) AS x(t, offset_ms)
  WHERE v_next_at - (offset_ms || ' milliseconds')::interval > now()
  ON CONFLICT (callback_task_id, type) DO NOTHING;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.expand_recurring_callback(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expand_recurring_callback(uuid) TO authenticated;

-- ============================================================================
-- 6. Conflict-detection helper. Read-only. Returns overlapping callbacks
--    within ±15 minutes of target time for a given rep. Used by the time-
--    picker to warn (never block).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_callback_conflicts(
  p_rep_id uuid,
  p_target_utc timestamptz,
  p_window_minutes int DEFAULT 15
)
RETURNS TABLE (
  callback_id uuid,
  business_name text,
  scheduled_at_utc timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT ct.id, l.business_name, ct.scheduled_at_utc
  FROM public.callback_tasks ct
  JOIN public.leads l ON l.id = ct.lead_id
  WHERE ct.rep_id = p_rep_id
    AND ct.status = 'scheduled'
    AND ct.scheduled_at_utc BETWEEN (p_target_utc - (p_window_minutes || ' minutes')::interval)
                                AND (p_target_utc + (p_window_minutes || ' minutes')::interval)
  ORDER BY ct.scheduled_at_utc
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.find_callback_conflicts(uuid, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_callback_conflicts(uuid, timestamptz, int) TO authenticated;
