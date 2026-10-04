// HosFIX Service Worker — Brandon Hall Hotel and Spa
// Firebase Cloud Messaging background handler  (v2026-10-03b)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDnPWrPGInDRTCF1Go710XC_8_77l_72i0",
  authDomain: "brandonhall-7bdef.firebaseapp.com",
  projectId: "brandonhall-7bdef",
  storageBucket: "brandonhall-7bdef.firebasestorage.app",
  messagingSenderId: "391317900568",
  appId: "1:391317900568:web:643c9d6691f7f16d65226d"
});

const messaging = firebase.messaging();
const ICON  = '/assets/icon-192.png';

// Pushes arrive as data-only messages so this worker controls how they look:
// each job gets its own tag (so a second alert never silently replaces the first),
// renotify forces sound/vibration, and assignments stay on screen until tapped.
messaging.onBackgroundMessage(payload => {
  const d       = payload.data || {};
  const title   = d.title || 'HosFIX';
  const kind    = d.kind  || 'info';
  const jobId   = d.jobId || '';
  const loud    = kind === 'assigned' || kind === 'urgent' || kind === 'test' || d.urgent === 'true';
  return self.registration.showNotification(title, {
    body:               d.body || '',
    icon:               ICON,
    badge:              ICON,
    tag:                kind + '-' + (jobId || Date.now()),
    renotify:           true,
    requireInteraction: loud,
    silent:             false,
    vibrate:            loud ? [600, 200, 600, 200, 900] : [300, 150, 300],
    timestamp:          Date.now(),
    data:               { url: d.url || '/hosmain.html', jobId }
  });
});

// Tap on a notification — open the job in the person's own HosFIX
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url   = (e.notification.data && e.notification.data.url) || '/hosmain.html';
  const jobId = (e.notification.data && e.notification.data.jobId) || '';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('hosmain'));
      if (existing) {
        existing.postMessage({ type: 'hf-open-job', jobId });
        return existing.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
