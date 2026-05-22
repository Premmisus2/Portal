// getAgendaQueue — pulls scheduled callbacks for a rep, joined to lead context,
// for rendering the Agenda Queue at the top of /floor. Phase 1 of the
// finish-build (locked 2026-05-22 after 6-prong audit).
//
// Index strategy: backed by idx_callback_tasks_agenda_queue (rep_id,
// scheduled_at_utc) WHERE status='scheduled'. Stays fast even at 200+ tasks/rep.

import { supabase } from '@/lib/supabase';

export interface AgendaQueueRow {
  id: string;
  lead_id: string;
  scheduled_at_utc: string;
  scheduled_local_time: string;
  scheduled_tz: string;
  notes: string | null;
  recurrence_rule: string | null;
  parent_callback_id: string | null;
  // Joined lead context
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  niche: string | null;
  city: string | null;
  // Last interaction snippet — pulled from leads aggregate fields.
  last_touch_at: string | null;
}

export interface AgendaQueueGrouped {
  overdue: AgendaQueueRow[];
  today: AgendaQueueRow[];
  upcoming: AgendaQueueRow[];
}

/**
 * Fetch all scheduled callbacks for a rep within a 7-day forward window.
 * Overdue (past) callbacks are also included regardless of how far back.
 * Returns rows sorted by scheduled_at_utc ascending.
 *
 * For director shadow view, pass the shadow rep id explicitly. For directors
 * viewing as themselves, pass their own id (they only see their own callbacks
 * in the agenda — to see another rep's agenda, shadow into them).
 */
export async function getAgendaQueue(repId: string): Promise<AgendaQueueRow[]> {
  // 7 days forward — anything further out is "later" and not actionable now.
  const horizonUtc = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();

  const { data, error } = await supabase
    .from('callback_tasks')
    .select(`
      id,
      lead_id,
      scheduled_at_utc,
      scheduled_local_time,
      scheduled_tz,
      notes,
      recurrence_rule,
      parent_callback_id,
      leads!inner (
        business_name,
        contact_name,
        phone,
        niche,
        city,
        last_touch_at
      )
    `)
    .eq('rep_id', repId)
    .eq('status', 'scheduled')
    .lte('scheduled_at_utc', horizonUtc)
    .order('scheduled_at_utc', { ascending: true });

  if (error || !data) return [];

  return data.map((row: unknown) => {
    const r = row as {
      id: string;
      lead_id: string;
      scheduled_at_utc: string;
      scheduled_local_time: string;
      scheduled_tz: string;
      notes: string | null;
      recurrence_rule: string | null;
      parent_callback_id: string | null;
      leads: {
        business_name: string;
        contact_name: string | null;
        phone: string | null;
        niche: string | null;
        city: string | null;
        last_touch_at: string | null;
      };
    };
    return {
      id: r.id,
      lead_id: r.lead_id,
      scheduled_at_utc: r.scheduled_at_utc,
      scheduled_local_time: r.scheduled_local_time,
      scheduled_tz: r.scheduled_tz,
      notes: r.notes,
      recurrence_rule: r.recurrence_rule,
      parent_callback_id: r.parent_callback_id,
      business_name: r.leads?.business_name || '(unknown)',
      contact_name: r.leads?.contact_name || null,
      phone: r.leads?.phone || null,
      niche: r.leads?.niche || null,
      city: r.leads?.city || null,
      last_touch_at: r.leads?.last_touch_at || null,
    };
  });
}

/**
 * Bucket rows into Overdue / Today / Upcoming based on the rep's local day.
 * "Today" uses the rep's IANA TZ (stored on each row) to compute day boundary —
 * NOT the server's UTC midnight (otherwise reps on the West Coast would see
 * Today bleed into tomorrow at 5pm local).
 */
export function groupAgendaQueue(rows: AgendaQueueRow[], nowMs: number = Date.now()): AgendaQueueGrouped {
  const overdue: AgendaQueueRow[] = [];
  const today: AgendaQueueRow[] = [];
  const upcoming: AgendaQueueRow[] = [];

  for (const row of rows) {
    const t = new Date(row.scheduled_at_utc).getTime();
    if (t < nowMs) {
      overdue.push(row);
      continue;
    }
    // Compute "today" in the row's stored tz (the rep's tz at booking time).
    const tz = row.scheduled_tz || 'America/Toronto';
    const dayKeyNow = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(nowMs));
    const dayKeyRow = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(row.scheduled_at_utc));
    if (dayKeyNow === dayKeyRow) {
      today.push(row);
    } else {
      upcoming.push(row);
    }
  }

  return { overdue, today, upcoming };
}
