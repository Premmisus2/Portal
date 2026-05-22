// Premmisus Sales Portal — Service Worker
//
// Handles Web Push notifications for inbound SMS replies. Required so iOS
// shows native notifications when a lead texts back while the app is closed.
//
// Payload shape (sent from /api/inbound-sms via lib/push/send.ts):
//   { title: string, body: string, url: string, tag?: string }

self.addEventListener('install', (event) => {
  // Activate immediately on first install so the user doesn't have to refresh.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients so notifications start firing without reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Premmisus', body: 'New message', url: '/?view=inbox' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    // Body wasn't JSON (e.g. test push from Chrome devtools) — fall back to defaults.
    if (event.data) data.body = event.data.text();
  }

  const tag = data.tag || 'premmisus-sms';
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      data: { url: data.url },
      // Renotify so a second SMS from the same lead while the first is still
      // visible re-buzzes the phone instead of silently merging.
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      // If the portal is already open in a tab/PWA window, focus it and navigate.
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      // Otherwise open a new window.
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
