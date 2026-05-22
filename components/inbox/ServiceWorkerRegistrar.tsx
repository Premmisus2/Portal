'use client';

// Registers /sw.js on app load. Tiny client-only component — mount once in
// the root render so the worker is installed whether or not the rep visits
// the inbox first. (Without this, notifications wouldn't fire for a rep who
// only ever uses Call Center.)

import { useEffect } from 'react';
import { ensureServiceWorker, pushSupported } from '@/lib/push-client';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!pushSupported()) return;
    ensureServiceWorker().catch(() => {});
  }, []);
  return null;
}
