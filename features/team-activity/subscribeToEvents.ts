// Supabase Realtime subscription for headline events. Per 2026-05-21
// pre-build audit (4/4): Realtime is used ONLY on the team activity panel,
// not on leads or timelines (which use refresh-on-action + optimistic).
//
// Volume: ~10 reps × 80 calls/day = 800 INSERT events/day, of which
// maybe 5-10 are bookings/discoveries. ~1 interesting event every 30 min
// average. Easily within Supabase's Realtime budget.
//
// Filter happens client-side because Supabase postgres_changes filter
// syntax only supports simple eq./neq./gt./gte./lt./lte./in., and "outcome
// IN ('booked_call', 'discovery_completed')" is awkward to express. Subscribe
// to all call_logs INSERTs, filter on payload.new.outcome.

import { supabase } from '@/lib/supabase';
import type { FloorEventRow } from './getRecentEvents';
import { getRecentEvents } from './getRecentEvents';

export type FloorEventCallback = (events: FloorEventRow[]) => void;

const INTERESTING_OUTCOMES = new Set(['booked_call', 'discovery_completed']);

/**
 * Subscribe to incoming call_log INSERTs and re-fetch the events list when
 * an "interesting" outcome lands. Returns an unsubscribe function.
 *
 * Rationale: when an interesting INSERT fires, we don't trust the realtime
 * payload directly — we re-query via the SECURITY DEFINER RPC so the
 * role-aware anonymization (business_name nullification for reps) is
 * enforced server-side. Trade-off: one extra RPC call per interesting event,
 * vs. the security cost of trusting whatever fields the channel exposes.
 * Volume is tiny so the cost is irrelevant.
 */
export function subscribeToFloorEvents(onEvents: FloorEventCallback): () => void {
  const channel = supabase
    .channel('floor-events')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'call_logs' },
      async (payload) => {
        const outcome = (payload?.new as { outcome?: string } | null)?.outcome;
        if (!outcome || !INTERESTING_OUTCOMES.has(outcome)) return;
        try {
          const events = await getRecentEvents(25);
          onEvents(events);
        } catch {
          // Silent — the next poll/refetch will catch up.
        }
      },
    )
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}
