// Sentry — Server-side initialization (Node runtime / Vercel Functions)
//
// Captures uncaught exceptions and unhandled rejections in /api/* routes.
// Complements lib/server-error.ts: our reportServerError() catches
// *expected* failure paths (Supabase errors, Twilio webhook issues, etc.);
// Sentry catches the *unexpected* ones (route handler crashes,
// dependency failures, OOM, etc.).
//
// DORMANT UNTIL ACTIVATED: if SENTRY_DSN is unset, the SDK initializes
// but no events are sent.
//
// Activation: see deploy/BUILD-JOURNAL.md entry #sentry-bootstrap.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Server-side DSN. If only NEXT_PUBLIC_SENTRY_DSN is set in Vercel, fall
  // back to it — the DSN is a public identifier, not a secret.
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0,

  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  initialScope: {
    tags: { surface: 'server' },
  },
});
