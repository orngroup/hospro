/* HosBIZ service worker — app-shell cache, network-first for data. */
const CACHE = 'hosbiz-v1';
const SHELL = [
  '/biz/',
  '/biz/index.html',
  '/biz/app.js',
  '/biz/styles.css',
  '/biz/manifest.webmanifest',
  '/biz/icon-192.png',
  '/biz/icon-512.png',
  '/biz/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache API calls or any cross-origin — always network
  if (url.hostname !== location.hostname) return;
  // App shell: cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('/biz/')))
  );
});
