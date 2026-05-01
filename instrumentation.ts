// Next.js instrumentation hook
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Loaded once when the Next.js server boots. Used here to wire up Sentry's
// server SDK for the Node runtime. Without this file, server-side errors
// in /api/* routes would not reach Sentry.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  // Edge runtime not used in this project (no edge functions). Skip.
}

// Captures errors thrown by Next.js itself before they reach our route
// handlers (e.g. middleware crashes, framework-level rejections).
export const onRequestError = Sentry.captureRequestError;
