/* HosPRO Mobile service worker — network-first so updates show on the next reload;
   cached copy used only when offline. */
const CACHE='hospro-app-v20261102c';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('hospro-app-')&&k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;           // let Firebase / fonts go straight through
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c)); } return r; })
    .catch(()=>caches.match(e.request)));
});
