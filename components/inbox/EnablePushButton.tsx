'use client';

// "Enable Notifications" button for the inbox. Idempotent — shows current
// state and lets the rep toggle on (or off if already on).
//
// iOS gotcha: requestPermission() must be called from a user-initiated event.
// We register the SW lazily inside the click handler, not on mount, so this
// component is safe to render server-side.

import React, { useCallback, useEffect, useState } from 'react';
import { enablePush, disablePush, isPushEnabled, pushSupported, isStandalone } from '@/lib/push-client';

type Props = {
  repId: string;
  setToast?: (t: { message: string; type: 'success' | 'error' }) => void;
};

export default function EnablePushButton({ repId, setToast }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [standalone, setStandalone] = useState<boolean>(false);

  useEffect(() => {
    setSupported(pushSupported());
    setStandalone(isStandalone());
    if (pushSupported()) isPushEnabled().then(setEnabled).catch(() => setEnabled(false));
  }, []);

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        setToast?.({ message: 'Push notifications disabled', type: 'success' });
      } else {
        const r: any = await enablePush(repId);
        if (r.ok === true) {
          setEnabled(true);
          setToast?.({ message: '✓ Notifications on — leads now buzz this device', type: 'success' });
          return;
        }
        const reasonMap: Record<string, string> = {
          'unsupported': 'This browser does not support push notifications.',
          'not-standalone-ios': 'On iOS, first tap Share → Add to Home Screen, then open the app icon and try again.',
          'permission-denied': 'You declined notifications. Enable in iOS Settings → Premmisus → Notifications.',
          'no-vapid': 'Push keys not configured — contact Elliott.',
          'subscribe-failed': `Subscribe failed: ${r.detail || 'unknown'}`,
          'server-failed': `Server error: ${r.detail || 'unknown'}`,
        };
        setToast?.({ message: reasonMap[r.reason] || 'Unknown push error', type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }, [enabled, repId, setToast]);

  if (supported === null) return null; // still detecting
  if (!supported) return null;

  const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const needsInstall = isIos && !standalone && !enabled;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        minHeight: '36px',
        borderRadius: '7px',
        cursor: busy ? 'wait' : 'pointer',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        fontFamily: 'Inter,sans-serif',
        background: enabled ? 'rgba(34,197,94,.10)' : needsInstall ? 'rgba(245,158,11,.10)' : 'var(--accent-glow-08)',
        border: `1px solid ${enabled ? 'rgba(34,197,94,.35)' : needsInstall ? 'rgba(245,158,11,.35)' : 'var(--accent-glow-30)'}`,
        color: enabled ? 'var(--green)' : needsInstall ? 'var(--amber)' : 'var(--accent-ink)',
        whiteSpace: 'nowrap',
      }}
      title={needsInstall ? 'On iPhone: Share → Add to Home Screen, open the icon, then tap this button' : undefined}
    >
      <span style={{ fontSize: '13px' }}>{enabled ? '🔔' : needsInstall ? '⚠' : '🔕'}</span>
      {enabled ? 'Notifications On' : needsInstall ? 'Install to Enable' : 'Enable Notifications'}
    </button>
  );
}
