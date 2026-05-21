// /floor/settings — minimal settings surface for Slice 4.
//
// Two cards in v1:
//   1. Calendar Sync — generate / rotate iCal token, copy subscribe URL.
//   2. Notifications — toggle reps.cc_director_on_callbacks.
//
// Wrapped in Suspense at the route boundary so useSearchParams pattern is
// safe to extend later if needed.

import { Suspense } from 'react';
import SettingsContent from '@/components/floor/SettingsContent';
import FloorPageSkeleton from '@/components/floor/FloorPageSkeleton';

export default function FloorSettingsPage() {
  return (
    <Suspense fallback={<FloorPageSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
