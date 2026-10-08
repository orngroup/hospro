// HosPRO Pocket service worker — keeps the app shell available offline; data is always fetched fresh.
const CACHE = 'hospro-pocket-v1';
const SHELL = ['mobile.html', 'mobile-manifest.json', 'assets/icon-192.png', 'assets/hospro/login-bg.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hospro-pocket') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// Network first (so figures and bookings are always current), cache as fallback when offline
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
