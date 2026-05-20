-- Migration: Missed-call SMS auto-reply tracking.
--
-- When an outbound call from a rep doesn't connect (no_answer / busy / failed
-- via Twilio status OR voicemail_left / no_answer outcome logged manually by
-- the rep), we want to fire a single SMS within ~30s: "Hey, [Rep] from
-- Premmisus — just tried you about your business. Text or call back anytime."
--
-- These columns provide idempotency so retries don't double-text.
--
-- auto_reply_sent_at — set to now() when the SMS is dispatched (or skipped
--   intentionally — see auto_reply_status). NULL means "still eligible".
-- auto_reply_status — explains the disposition: 'sent', 'skipped_opted_out',
--   'skipped_recent', 'failed', 'no_phone'. Useful for analytics + debugging.

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS auto_reply_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS auto_reply_status text NULL;

CREATE INDEX IF NOT EXISTS call_logs_auto_reply_pending_idx
  ON public.call_logs (created_at DESC)
  WHERE auto_reply_sent_at IS NULL AND outcome IN ('no_answer', 'voicemail_left');
