-- Callback scheduling + Postgres-native SMS reminder queue (Slice 2).
--
-- Per 2026-05-20 4-prong audit verdict, QStash retired in favor of single
-- Postgres-native pipeline:
--   callback_tasks  — future-intent task rows owned by rep
--   notifications_queue — pre-computed reminder rows (T-60 / T-30 / T-10)
--     drained by a 1-min Vercel cron worker via FOR UPDATE SKIP LOCKED.
--
-- DST safety: scheduled_at_utc is the source of truth for the queue,
-- scheduled_local_time + scheduled_tz are stored alongside for far-future
-- DST verification (Gemini load-bearing catch). When the rep displays
-- "4:15 PM" three months out, we re-derive UTC from the wall-clock + tz at
-- render time to catch any DST shift since the booking was made.
--
-- Idempotency: notifications_queue has UNIQUE (callback_task_id, type) so
-- inserting a reminder of a given type twice is impossible. Worker uses
-- atomic UPDATE ... WHERE status='pending' RETURNING to claim a row before
-- firing Twilio — prevents concurrent workers from double-sending.

-- ── 1. callback_tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.callback_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  call_log_id uuid NULL REFERENCES public.call_logs(id) ON DELETE SET NULL,
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  scheduled_at_utc timestamptz NOT NULL,
  scheduled_local_time text NOT NULL,  -- "HH:MM" — for display + DST verify
  scheduled_tz text NOT NULL,          -- IANA (America/Toronto, Europe/Berlin)
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'skipped')),
  recurrence_rule text NULL,           -- RRULE (Slice 4 — recurring callbacks)
  parent_callback_id uuid NULL REFERENCES public.callback_tasks(id) ON DELETE SET NULL,
  notes text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_callback_tasks_rep_scheduled
  ON public.callback_tasks(rep_id, scheduled_at_utc);
CREATE INDEX IF NOT EXISTS idx_callback_tasks_status_scheduled
  ON public.callback_tasks(status, scheduled_at_utc)
  WHERE status = 'scheduled';

ALTER TABLE public.callback_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "callback_tasks_rep_select" ON public.callback_tasks;
CREATE POLICY "callback_tasks_rep_select" ON public.callback_tasks
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    rep_id IN (SELECT id FROM public.reps WHERE auth_id = auth.uid())
    OR public.is_director()
  );

DROP POLICY IF EXISTS "callback_tasks_rep_insert" ON public.callback_tasks;
CREATE POLICY "callback_tasks_rep_insert" ON public.callback_tasks
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    rep_id IN (SELECT id FROM public.reps WHERE auth_id = auth.uid())
    OR public.is_director()
  );

DROP POLICY IF EXISTS "callback_tasks_rep_update" ON public.callback_tasks;
CREATE POLICY "callback_tasks_rep_update" ON public.callback_tasks
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    rep_id IN (SELECT id FROM public.reps WHERE auth_id = auth.uid())
    OR public.is_director()
  );

DROP POLICY IF EXISTS "callback_tasks_service_role_all" ON public.callback_tasks;
CREATE POLICY "callback_tasks_service_role_all" ON public.callback_tasks
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.callback_tasks IS
  'Future-intent callback rows. scheduled_at_utc is queue source of truth; scheduled_local_time + scheduled_tz are for display + far-future DST verification. RLS: rep reads/writes own, director reads/writes all.';

-- ── 2. notifications_queue ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callback_task_id uuid NOT NULL REFERENCES public.callback_tasks(id) ON DELETE CASCADE,
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('callback_60min', 'callback_30min', 'callback_10min', 'callback_director_cc')),
  send_at_utc timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'cancelled', 'failed', 'dead_letter')),
  twilio_sid text NULL,
  error text NULL,
  retry_count int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (callback_task_id, type)
);

-- Partial index: only pending rows are scanned by the worker every minute.
CREATE INDEX IF NOT EXISTS idx_notifications_queue_pending_send_at
  ON public.notifications_queue(send_at_utc)
  WHERE status = 'pending';

-- Lookup by rep for director debugging.
CREATE INDEX IF NOT EXISTS idx_notifications_queue_rep
  ON public.notifications_queue(rep_id, created_at DESC);

ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;

-- Reps don't read this directly — it's worker-internal. Reps see the
-- callback_tasks row's status; the queue is plumbing. Director can read for
-- debugging via service_role-backed admin tools later.
DROP POLICY IF EXISTS "notifications_queue_service_role_all" ON public.notifications_queue;
CREATE POLICY "notifications_queue_service_role_all" ON public.notifications_queue
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.notifications_queue IS
  'Pre-computed reminder queue drained by 1-min cron worker. Unique (callback_task_id, type) enforces idempotency. Service-role only — reps see callback_tasks status, not the queue plumbing.';

-- ── 3. reps additions: timezone + director CC opt-in ─────────────────────
ALTER TABLE public.reps
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Toronto',
  ADD COLUMN IF NOT EXISTS cc_director_on_callbacks boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reps.timezone IS
  'IANA timezone (America/Toronto, Europe/Berlin, etc.). Drives callback time display + DST math. Defaults to Toronto.';

COMMENT ON COLUMN public.reps.cc_director_on_callbacks IS
  'When true, director gets a CC SMS on this rep''s callback reminders. Per-rep opt-in to avoid spamming Elliott when not desired.';
