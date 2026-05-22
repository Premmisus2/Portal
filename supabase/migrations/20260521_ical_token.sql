-- reps.ical_token — Slice 4 calendar sync.
--
-- Per 2026-05-20 audit verdict: per-rep .ics WebCal feed at
-- /api/ical/<rep_id>/<token>.ics. Token is generated client-side via
-- crypto.randomBytes(32) → base64url, hashed with SHA-256 server-side,
-- stored as the hash here. Compared at request time as
-- sha256(provided_token) === reps.ical_token.
--
-- Reps see the unhashed token ONCE at regenerate time (the resulting URL
-- is copied to their clipboard). Subsequent visits show only the URL with
-- the existing hash; rep can rotate to invalidate stale URLs.

ALTER TABLE public.reps
  ADD COLUMN IF NOT EXISTS ical_token text NULL,
  ADD COLUMN IF NOT EXISTS ical_token_rotated_at timestamptz NULL;

COMMENT ON COLUMN public.reps.ical_token IS
  'SHA-256 hash of the iCal feed token. Compared against hash(provided_token) at /api/ical/[rep_id]/[token]. Unguessable.';

COMMENT ON COLUMN public.reps.ical_token_rotated_at IS
  'When the iCal token was last rotated. Used to invalidate stale URLs.';
