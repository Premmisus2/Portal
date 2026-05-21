// Fetch today's per-rep call/connect/booked counts for the Sales Floor
// leaderboard. SECURITY DEFINER RPC bypasses call_logs RLS so reps see
// team aggregates without raw row access. Polled every 30s by the UI.

import { supabase } from '@/lib/supabase';

export interface TodayCountRow {
  rep_id: string;
  rep_name: string;
  call_count: number;
  connect_count: number;
  booked_count: number;
}

export async function getTodayCounts(): Promise<TodayCountRow[]> {
  const { data, error } = await supabase.rpc('get_floor_today_counts');
  if (error) throw new Error(`get_floor_today_counts failed: ${error.message}`);
  return (data || []) as TodayCountRow[];
}
