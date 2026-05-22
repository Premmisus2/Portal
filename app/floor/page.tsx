// /floor — Sales Floor route entry.
//
// Thin shell that wraps FloorContent in a Suspense boundary. Required by
// Next.js 14 App Router: useSearchParams() inside FloorContent bails out of
// static prerendering, and Next requires a Suspense boundary to handle the
// dynamic-bail gracefully. Without this wrapper the build fails with
// "useSearchParams() should be wrapped in a suspense boundary".
//
// Caught by Vercel build 2026-05-21 — neither type-check nor local dev
// surface this; only `next build` does.

import { Suspense } from 'react';
import FloorContent from '@/components/floor/FloorContent';
import FloorPageSkeleton from '@/components/floor/FloorPageSkeleton';

export default function FloorPage() {
  return (
    <Suspense fallback={<FloorPageSkeleton />}>
      <FloorContent />
    </Suspense>
  );
}
