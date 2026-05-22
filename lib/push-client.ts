'use client';

// Client-side helpers for Web Push subscription. Used by the "Enable
// Notifications" button in the inbox + by ServiceWorkerRegistrar to register
// the worker on app load.
//
// iOS-specific notes:
//   - Web Push only works in installed PWAs (display-mode: standalone).
//     Calling Notification.requestPermission() in Safari does nothing on iOS.
//   - User must Add to Home Screen, open the icon, THEN tap "Enable".

const SW_URL = '/sw.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

// True if we're running as an installed PWA. iOS web push REQUIRES this.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari uses navigator.standalone (non-standard); other UAs use display-mode.
  const iosStandalone = (window.navigator as any).standalone === true;
  const dmStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || dmStandalone;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    // Wait for the worker to be ready before returning so subscribe() calls have an active worker.
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[push-client] SW register failed', err);
    return null;
  }
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not-standalone-ios' | 'permission-denied' | 'no-vapid' | 'subscribe-failed' | 'server-failed'; detail?: string };

export async function enablePush(repId: string): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  // iOS-specific: if Notification.permission is 'default' AND we're in Safari
  // (not standalone), requestPermission() silently returns 'denied' on iOS.
  // Surface a useful error so the UI can tell the user to install first.
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (isIos && !isStandalone()) return { ok: false, reason: 'not-standalone-ios' };

  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPub) return { ok: false, reason: 'no-vapid' };

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };

  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: PushManager's BufferSource type wants ArrayBuffer-backed but Uint8Array
      // works at runtime in every browser. TS strictness vs DOM spec mismatch.
      applicationServerKey: urlBase64ToUint8Array(vapidPub) as unknown as BufferSource,
    });
  } catch (err: any) {
    return { ok: false, reason: 'subscribe-failed', detail: err?.message || String(err) };
  }

  // POST subscription to server so /api/inbound-sms can find it later.
  const sub = subscription.toJSON() as any;
  const body = {
    rep_id: repId,
    endpoint: subscription.endpoint,
    p256dh: sub.keys?.p256dh,
    auth: sub.keys?.auth,
    user_agent: navigator.userAgent,
  };

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, reason: 'server-failed', detail };
  }
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' });
  } catch {}
  await sub.unsubscribe();
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub && Notification.permission === 'granted';
}
