// HosCOM Compliance Service Worker — Brandon Hall Hotel and Spa
const CACHE = 'hoscom-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'HosCOM Compliance';
  const options = {
    body: data.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'hoscom',
    data: { url: data.url || '/tasks.html' },
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/tasks.html';
  e.waitUntil(clients.matchAll({type:'window'}).then(list => {
    const existing = list.find(c => c.url.includes('tasks'));
    if(existing) return existing.focus();
    return clients.openWindow(url);
  }));
});
