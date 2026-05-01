// Sentry — Client-side initialization
//
// Captures uncaught exceptions and unhandled promise rejections in the
// browser. Complements lib/error-reporting.ts: our reportClientError()
// catches *expected* failure paths (Supabase errors, fetch failures);
// Sentry catches the *unexpected* ones (React render crashes, third-party
// script errors, anything that bypasses our wrappers).
//
// DORMANT UNTIL ACTIVATED: if NEXT_PUBLIC_SENTRY_DSN is unset, the SDK
// initializes but no events are sent. Bundle cost ~35KB regardless, but
// the safety net is in place the moment the DSN is added.
//
// Activation: see deploy/BUILD-JOURNAL.md entry #sentry-bootstrap.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring disabled by default — Elliott asked for bug
  // catching, not perf tracing. Bumping above 0 burns Sentry quota.
  tracesSampleRate: 0,

  // No session replay — adds significant bundle size and we don't need
  // it for this use case. Re-enable if reps complain about reproducing
  // bugs.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Suppress dev-mode noise. Enable for staging if useful.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Distinguish client errors from server errors in the Sentry UI.
  initialScope: {
    tags: { surface: 'browser' },
  },
});
