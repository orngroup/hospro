/* Brandon Hall Spa member app — minimal service worker (makes it an installable PWA) */
const CACHE='hosspa-app-v1';
const ASSETS=['/hosspa-app.html','/hosspa-app.webmanifest'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{}))); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp).catch(()=>{})); return r; })
    .catch(()=>caches.match(e.request).then(m=>m||caches.match('/hosspa-app.html')))
  );
});
