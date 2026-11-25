/* THE CLARENDON CLUB — service worker: offer alerts (Firebase Cloud Messaging) + offline card shell */
self.window = self; // lets club-config.js set CLUB_CONFIG inside the worker
importScripts('club-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const VERSION = 'cc-2026-11-25a';
const SHELL = ['./', 'index.html', 'club.css', 'club-config.js', 'club-service.js', 'club-api.js', 'vendor/qrcode.js', 'bh-logo.svg', 'club-icon-180.png',
  'fonts/italiana-latin-400-normal.woff2', 'fonts/lato-latin-400-normal.woff2', 'fonts/lato-latin-700-normal.woff2'];

try {
  firebase.initializeApp(self.CLUB_CONFIG.firebase);
  const messaging = firebase.messaging();
  // Messages carry a "notification" block, so they are shown automatically; this covers data-only messages.
  messaging.onBackgroundMessage(p => {
    if (p.notification) return;
    const d = p.data || {};
    self.registration.showNotification(d.title || 'The Clarendon Club', { body: d.body || '', icon: 'club-icon-180.png', badge: 'club-icon-180.png', data: { url: d.url || './#offers' } });
  });
} catch (e) { /* alerts unavailable; the card still works */ }

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.includes('/club/')) return;
  // network first so members always see the latest; fall back to the saved copy when offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './#offers';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.includes('/club/')) { c.focus(); return c.navigate ? c.navigate(c.url.split('#')[0] + '#offers') : null; }
    return self.clients.openWindow(url);
  }));
});
