export interface Rep {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: 'rep' | 'director';
  invite_code?: string;
  phone?: string;
  created_at: string;
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
  body: string;
  type?: string;
  created_at: string;
}
