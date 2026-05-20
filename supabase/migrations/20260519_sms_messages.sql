-- Migration: SMS messages table + lead-level opt-out flag.
--
-- A2P 10DLC is approved on the Twilio number — we're starting outbound SMS
-- sequences and need an inbox surface where inbound replies land.
--
-- Design:
--   * Each Twilio message (in OR out) is one row, deduped by twilio_sid.
--   * lead_id nullable so inbound from an unknown sender still gets logged
--     (goes into the director's "Unknown" bucket).
--   * rep_id nullable so STOP/HELP keyword replies (auto-generated, no rep)
--     can be stored without a fake attribution.
--   * keyword column records detected STOP/START/HELP for compliance reporting.
--   * is_read flips per-message so the inbox shows unread badges per thread.
--   * RLS: matches existing convention — service_role full, authenticated read.
--     Reps already see all leads via the anon key + session auth, so showing
--     all SMS is consistent with how the portal already works.

CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  rep_id uuid REFERENCES public.reps(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  twilio_sid text UNIQUE,
  from_phone text NOT NULL,
  to_phone text NOT NULL,
  body text NOT NULL,
  status text,
  error_code text,
  is_read boolean NOT NULL DEFAULT false,
  keyword text CHECK (keyword IS NULL OR keyword IN ('STOP', 'START', 'HELP', 'YES', 'UNSTOP', 'CANCEL', 'END', 'QUIT')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_messages_lead_id_created_at_idx
  ON public.sms_messages (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sms_messages_rep_unread_idx
  ON public.sms_messages (rep_id, created_at DESC)
  WHERE direction = 'inbound' AND is_read = false;

CREATE INDEX IF NOT EXISTS sms_messages_from_phone_idx
  ON public.sms_messages (from_phone);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.sms_messages
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read" ON public.sms_messages
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_update_read_flag" ON public.sms_messages
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Lead-level opt-out: set when STOP keyword received OR rep marks DNC
-- on inbound disposition modal. Outbound SMS sender MUST check this column
-- before sending and skip if non-null. Legally required for TCPA / CTIA.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sms_opted_out_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS leads_sms_opted_out_idx
  ON public.leads (sms_opted_out_at)
  WHERE sms_opted_out_at IS NOT NULL;
