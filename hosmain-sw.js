// HosFIX Service Worker — Brandon Hall Hotel and Spa
const CACHE = 'hosmain-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'HosFIX';
  const options = {
    body: data.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'hosfix',
    data: { url: data.url || '/hosmain.html' },
    requireInteraction: data.urgent || false,
    vibrate: [200, 100, 200]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/hosmain.html';
  e.waitUntil(clients.matchAll({type:'window'}).then(list => {
    const existing = list.find(c => c.url.includes('hosfix'));
    if(existing) return existing.focus();
    return clients.openWindow(url);
  }));
});

// Background sync for offline job saves (future)
self.addEventListener('sync', e => {
  if(e.tag === 'sync-jobs') {
    // Future: sync localStorage jobs to server
  }
});
