-- Phase 2 of Sales Floor finish-build (audit-locked 2026-05-22).
-- Adds outcome_subtag (call_logs), sms_templates, sms_drafts.
-- DEFERRED per audit: template performance loop, /floor/templates director CRUD.

-- 1. call_logs.outcome_subtag — secondary classification. OPTIONAL.
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS outcome_subtag text NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_outcome_subtag
  ON public.call_logs (outcome, outcome_subtag, created_at DESC)
  WHERE outcome_subtag IS NOT NULL;

-- 2. sms_templates — director-curated body templates.
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  outcome_trigger text NOT NULL,
  outcome_subtag text NULL,
  body_template text NOT NULL,
  pitch_angle text NULL CHECK (pitch_angle IN ('ai_receptionist','crm_automation','website','general_followup') OR pitch_angle IS NULL),
  owner_rep_id uuid NULL REFERENCES public.reps(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_match
  ON public.sms_templates (outcome_trigger, outcome_subtag, owner_rep_id)
  WHERE active = true;

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_templates_authenticated_read" ON public.sms_templates
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "sms_templates_service_role_all" ON public.sms_templates
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. sms_drafts — what was suggested, what got sent (or skipped).
CREATE TABLE IF NOT EXISTS public.sms_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  call_log_id uuid NULL REFERENCES public.call_logs(id) ON DELETE SET NULL,
  template_id uuid NULL REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  drafted_body text NOT NULL,
  final_body text NULL,
  status text NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted','sent','skipped','edited_sent')),
  sent_at timestamptz NULL,
  twilio_sid text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_drafts_lead ON public.sms_drafts (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_drafts_rep ON public.sms_drafts (rep_id, created_at DESC);

ALTER TABLE public.sms_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_drafts_authenticated_read" ON public.sms_drafts
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "sms_drafts_authenticated_insert" ON public.sms_drafts
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sms_drafts_service_role_all" ON public.sms_drafts
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Seed starter templates. Director can edit via Supabase dashboard.
INSERT INTO public.sms_templates (name, outcome_trigger, outcome_subtag, body_template, pitch_angle, owner_rep_id, active)
VALUES
  ('Crystal — too busy', 'not_interested', 'too_busy',
   E'Hey {{first_name}}, sorry about the bad timing earlier — that''s exactly why I was calling. We build affordable AI receptionists + auto-CRMs that filter calls and answer the phone for you so you can stay on the job. Got 30 seconds to look?',
   'ai_receptionist', NULL, true),
  ('Wrong timing — circle back', 'not_interested', 'wrong_timing',
   E'Hey {{first_name}}, totally understand timing wasn''t right today. Mind if I check back in 2-3 weeks once things settle?',
   'general_followup', NULL, true),
  ('Price objection — value angle', 'not_interested', 'price_objection',
   E'Hi {{first_name}}, fair point on price. Quick FYI: most {{niche}} owners we work with see ROI in 30-60 days from the leads we generate. Worth a 5-min look at numbers?',
   'general_followup', NULL, true),
  ('Voicemail — first touch', 'voicemail', 'first_touch',
   E'Hey {{first_name}}, just left you a voicemail — quick question about {{business_name}}''s online presence. When''s a good time to chat?',
   'general_followup', NULL, true),
  ('Voicemail — repeat', 'voicemail', 'repeat_attempt',
   E'Hi {{first_name}}, second time trying you. If a quick text is easier, happy to share what I had in mind in 2 lines — just reply YES.',
   'general_followup', NULL, true),
  ('Booked — confirm', 'booked_call', NULL,
   E'Hi {{first_name}}, confirmed our chat — looking forward to it. I''ll send a calendar invite shortly.',
   'general_followup', NULL, true)
ON CONFLICT DO NOTHING;
