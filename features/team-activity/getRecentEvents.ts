// Fetch recent headline events (booked discoveries, completed discoveries)
// from the past 7 days. business_name is NULL for non-director callers
// (niche-only anonymization per locked permission model).

import { supabase } from '@/lib/supabase';

export type FloorEventType = 'booked' | 'discovery';

export interface FloorEventRow {
  event_id: string;
  event_type: FloorEventType;
  rep_id: string;
  rep_name: string;
  niche: string | null;
  business_name: string | null;
  created_at: string;
}

export async function getRecentEvents(limit = 25): Promise<FloorEventRow[]> {
  const { data, error } = await supabase.rpc('get_floor_recent_events', { p_limit: limit });
  if (error) throw new Error(`get_floor_recent_events failed: ${error.message}`);
  return (data || []) as FloorEventRow[];
}
