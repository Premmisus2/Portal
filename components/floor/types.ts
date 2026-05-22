import type { Lead } from '@/lib/types';

// Extended lead row with the new counter columns added 2026-05-21
// (last_touch_at + touch_count + connect_count trigger-maintained).
// Shared by FloorContent, LeadSheet, LeadDrawer.
export interface FloorLead extends Lead {
  last_touch_at?: string | null;
  touch_count?: number;
  connect_count?: number;
}
