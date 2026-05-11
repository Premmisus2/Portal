export interface Rep {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: 'rep' | 'director';
  invite_code?: string;
  phone?: string;
  active?: boolean;
  created_at: string;
}

export interface RepStats {
  rep_id: string;
  total_closes: number;
  pending_closes: number;
  approved_points: number;
  total_calls: number;
  total_calls_auto: number;     // call_sid IS NOT NULL — Twilio dialer
  total_calls_manual: number;   // call_sid IS NULL — rep filled the log form
  total_results_auto: number;   // outcome_auto IS NOT NULL — populated once #outcome-auto-classifier ships
  warm_leads_contacted: number; // priority HOT/HIGH AND status in (contacted, callback, booked, discovery_completed)
  warm_leads_closed: number;    // priority HOT/HIGH AND status in (booked, discovery_completed)
  last_close_at: string | null;
  last_call_at: string | null;
  assigned_leads: number;
}

export interface Lead {
  id: string;
  business_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  niche?: string;
  city?: string;
  province?: string;
  website?: string;
  google_reviews?: number;
  status: 'new' | 'contacted' | 'voicemail' | 'callback' | 'not_interested' | 'booked' | 'discovery_completed' | 'no_show' | 'wrong_number';
  priority?: 'HOT' | 'HIGH' | 'MEDIUM';
  assigned_rep_id?: string;
  batch_id?: string;
  source?: string;
  notes?: string;
  callback_date?: string;
  callback_reason?: string;
  created_at: string;
  updated_at?: string;
  reps?: { name: string };
}

export interface CallLog {
  id: string;
  lead_id?: string;
  rep_id: string;
  outcome: string;
  additional_outcomes?: string[] | null;
  call_sid?: string;
  call_type?: string;
  twilio_status?: string;
  duration_seconds?: number;
  recording_sid?: string;
  recording_url?: string;
  transcript?: string;
  transcript_status?: string;
  business_name?: string;
  notes?: string;
  callback_date?: string;
  callback_reason?: string;
  booking_type?: string;
  outcome_auto?: string | null;
  outcome_auto_confidence?: number | null;
  outcome_auto_reasoning?: string | null;
  outcome_auto_at?: string | null;
  created_at: string;
  reps?: { name: string };
}

export interface Close {
  id: string;
  rep_id: string;
  pts: number;
  product_label: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Handoff {
  id: string;
  rep_id: string;
  company: string;
  niche?: string;
  pain_point?: string;
  next_step?: string;
  notes?: string;
  followup_status?: string;
  created_at: string;
  reps?: { name: string };
}

export interface ImportBatch {
  id: string;
  label: string;
  source_type: string;
  lead_count: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'normal' | 'urgent';
  created_at: string;
}
