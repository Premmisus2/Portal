-- Team activity panel (Slice 1.5) — RPCs powering the leaderboard + headline
-- events strip on /floor.
--
-- Per locked permission model (memory: sales-floor-permissions):
--   * Reps see aggregate counts for all reps (leaderboard).
--   * Reps see headline events with NICHE ONLY — lead business names hidden.
--   * Directors see everything including lead business names.
--   * Decision authority gating is enforced separately by RLS on the
--     mutating actions; this file is read-only data exposure.
--
-- Implementation choice (Claude judgment 2026-05-21, see post-build audit):
--   * SECURITY DEFINER RPCs — bypass standard call_logs RLS so reps can
--     read aggregated team data without seeing raw call_log rows for other
--     reps. Anonymization happens INSIDE the function based on is_director().
--   * Returns role-aware shapes — reps see business_name as NULL.
--   * Today-bucket uses America/Toronto per the standing timezone rule (see
--     CLAUDE.md "Timezone rule (binding)"). Server cron is UTC, but the
--     "today" boundary that matters here is the rep's working day.

-- ── 1. Per-rep today's counts (leaderboard data) ──────────────────────────
-- Returns one row per active rep with today's call count, connect count,
-- and booking count. Sorted desc by calls. Used by /floor TeamActivityPanel
-- on a 30-second poll.

CREATE OR REPLACE FUNCTION public.get_floor_today_counts()
RETURNS TABLE (
  rep_id uuid,
  rep_name text,
  call_count int,
  connect_count int,
  booked_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    COUNT(cl.id) FILTER (WHERE cl.rep_id IS NOT NULL)::int,
    COUNT(cl.id) FILTER (
      WHERE cl.outcome IN (
        'callback_requested','not_interested','booked_call',
        'discovery_completed','inbound_callback'
      )
    )::int,
    COUNT(cl.id) FILTER (
      WHERE cl.outcome IN ('booked_call','discovery_completed')
    )::int
  FROM public.reps r
  LEFT JOIN public.call_logs cl
    ON cl.rep_id = r.id
    AND (cl.created_at AT TIME ZONE 'America/Toronto')
        >= date_trunc('day', (now() AT TIME ZONE 'America/Toronto'))
  -- NOTE: no `r.active` filter — column doesn't exist in production despite
  -- the 20260502_reps_active.sql migration existing (schema drift). If/when
  -- the column is added, append: `WHERE COALESCE(r.active, true) = true`.
  GROUP BY r.id, r.name
  ORDER BY COUNT(cl.id) FILTER (WHERE cl.rep_id IS NOT NULL) DESC, r.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_floor_today_counts() TO authenticated;

COMMENT ON FUNCTION public.get_floor_today_counts() IS
  'Sales Floor leaderboard data. Returns per-rep today counts (Toronto day). SECURITY DEFINER bypasses call_logs RLS so reps see team aggregates without raw row access. Polled every 30s by /floor TeamActivityPanel.';

-- ── 2. Recent headline events (motivational ticker) ───────────────────────
-- Last N booking/discovery events. business_name is NULL for non-director
-- callers (niche-only anonymization per locked permission model). Directors
-- see full lead identity.

CREATE OR REPLACE FUNCTION public.get_floor_recent_events(p_limit int DEFAULT 25)
RETURNS TABLE (
  event_id uuid,
  event_type text,
  rep_id uuid,
  rep_name text,
  niche text,
  business_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_director boolean;
BEGIN
  v_is_director := public.is_director();

  RETURN QUERY
  SELECT
    cl.id,
    CASE cl.outcome
      WHEN 'booked_call' THEN 'booked'
      WHEN 'discovery_completed' THEN 'discovery'
      ELSE cl.outcome
    END,
    cl.rep_id,
    r.name,
    l.niche,
    CASE WHEN v_is_director THEN l.business_name ELSE NULL END,
    cl.created_at
  FROM public.call_logs cl
  JOIN public.reps r ON r.id = cl.rep_id
  LEFT JOIN public.leads l ON l.id = cl.lead_id
  WHERE cl.outcome IN ('booked_call', 'discovery_completed')
    AND cl.rep_id IS NOT NULL
    AND cl.created_at > now() - interval '7 days'
  ORDER BY cl.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_floor_recent_events(int) TO authenticated;

COMMENT ON FUNCTION public.get_floor_recent_events(int) IS
  'Sales Floor headline events. Returns last N booked/discovery events from the past 7 days. business_name is NULL for non-director callers (niche-only anonymization per locked permission model). p_limit clamped to [1, 200].';
