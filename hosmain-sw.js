// HosFIX Service Worker — Brandon Hall Hotel and Spa
// Firebase Cloud Messaging background handler

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

const CACHE = 'hosmain-v2';
const ICON  = '/assets/icon-192.png';

// Background FCM messages (app closed / backgrounded)
messaging.onBackgroundMessage(payload => {
  const data    = payload.data || payload.notification || {};
  const title   = data.title || 'HosFIX';
  const options = {
    body:              data.body  || '',
    icon:              ICON,
    badge:             ICON,
    tag:               data.tag   || 'hosfix-' + Date.now(),
    data:            { url: data.url || '/hosmain.html' },
    requireInteraction: data.urgent === 'true',
    vibrate:         [200, 100, 200, 100, 200],
    sound:           'default'
  };
  return self.registration.showNotification(title, options);
});

// Notification tap — open/focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/hosmain.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('hosmain'));
      if (existing) { existing.focus(); return; }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
