import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Ensure BUILD-JOURNAL.md is bundled with the /api/journal serverless
  // function so fs.readFileSync works on Vercel. Without this, the file is
  // tree-shaken out of the deployment and the route 500s on production.
  // Top-level in Next 15+, under `experimental` in Next 14.
  experimental: {
    outputFileTracingIncludes: {
      '/api/journal': ['./BUILD-JOURNAL.md'],
    },
  },
};

// Wrap with Sentry. When SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN are unset, the
// build still succeeds — withSentryConfig adds the source-map upload + edge
// runtime hooks but the runtime SDK is dormant. Source-map upload requires
// SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT; without them, source maps
// stay un-uploaded but the build still completes. See BUILD-JOURNAL
// #sentry-bootstrap for activation steps.
export default withSentryConfig(nextConfig, {
  // Suppress source-map upload errors when not configured — keeps builds
  // green when Elliott hasn't wired the auth token yet.
  silent: true,
  // Org + project are placeholders; replaced when env vars are set.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in CI / Vercel builds, not local dev.
  widenClientFileUpload: true,
  // Hide debug logging in production
  hideSourceMaps: true,
  disableLogger: true,
});
