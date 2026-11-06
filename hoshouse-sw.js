/* HosHouse service worker — Brandon Hall Hotel and Spa
   Firebase Cloud Messaging background handler + network-first caching (v2026-11-06) */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDnPWrPGInDRTCF1Go710XC_8_77l_72i0",
  authDomain: "brandonhall-7bdef.firebaseapp.com",
  projectId: "brandonhall-7bdef",
  storageBucket: "brandonhall-7bdef.firebasestorage.app",
  messagingSenderId: "391317900568",
  appId: "1:391317900568:web:643c9d6691f7f16d65226d"
});

const HH_ICON = '/assets/icon-192.png';

try {
  const messaging = firebase.messaging();
  // Pushes arrive as data-only messages so this worker controls how they look.
  messaging.onBackgroundMessage(payload => {
    const d     = payload.data || {};
    const title = d.title || 'HosHouse';
    const kind  = d.kind  || 'info';
    const jobId = d.jobId || '';
    const loud  = kind === 'assigned' || kind === 'urgent' || kind === 'test' || d.urgent === 'true';
    return self.registration.showNotification(title, {
      body:               d.body || '',
      icon:               HH_ICON,
      badge:              HH_ICON,
      tag:                kind + '-' + (jobId || Date.now()),
      renotify:           true,
      requireInteraction: loud,
      silent:             false,
      vibrate:            loud ? [600, 200, 600, 200, 900] : [300, 150, 300],
      timestamp:          Date.now(),
      data:               { url: d.url || '/hoshouse.html', jobId }
    });
  });
} catch (e) { /* messaging unavailable — caching below still works */ }

// Tap a notification — open / focus HosHouse
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/hoshouse.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('hoshouse'));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ---- network-first caching so the PWA still installs / works offline ----
const CACHE = 'hoshouse-v2';
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request))
  );
});
