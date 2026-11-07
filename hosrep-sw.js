/* HosREP service worker — makes the report form installable.
   Network-first, no stale caching of the form itself (always fresh). */
self.addEventListener('install',  function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(function(){ return caches.match(e.request); })
  );
});
