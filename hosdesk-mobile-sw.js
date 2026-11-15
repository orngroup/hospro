/* HosDesk Mobile service worker */
var CACHE='hosdesk-mobile-v1';
var SHELL=['hosdesk-mobile.html','hosdesk-mobile.webmanifest'];
self.addEventListener('install',function(e){ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ if(k!==CACHE) return caches.delete(k); })); })); self.clients.claim(); });
self.addEventListener('fetch',function(e){
  var url=e.request.url;
  // never cache Firebase / Google traffic — always live
  if(url.indexOf('firestore')>-1 || url.indexOf('googleapis')>-1 || url.indexOf('gstatic')>-1 || url.indexOf('firebase')>-1){ return; }
  if(e.request.method!=='GET'){ return; }
  e.respondWith(
    fetch(e.request).then(function(resp){
      try{ var cp=resp.clone(); caches.open(CACHE).then(function(c){ c.put(e.request,cp); }); }catch(_){}
      return resp;
    }).catch(function(){ return caches.match(e.request).then(function(m){ return m || caches.match('hosdesk-mobile.html'); }); })
  );
});
