/* ARIA service worker: makes ARIA installable and opens instantly. Only the app shell is cached;
   answers always come live from ARIA (POST requests are never cached). Bump VERSION on each release. */
const VERSION = 'aria-v3-2';
const SHELL = ['./', 'index.html', 'aria-core.js', 'manifest.webmanifest', 'icons/aria-logo.svg', 'icons/mascot.png', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // network first, cache as fallback (so a new release shows at once when online)
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)).catch(() => {}); return r; }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
