/* HosHouse service worker — network-first, lets the PWA install to the home screen. */
const CACHE='hoshouse-v1';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>self.clients.claim());
self.addEventListener('fetch',e=>{
  e.respondWith(fetch(e.request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c)); return r; })
    .catch(()=>caches.match(e.request)));
});
