/* Night Walk service worker — network-first for the app shell, offline fallback */
var CACHE='nightwalk-v1';
var SHELL=['nightwalk.html','nightwalk.webmanifest'];
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'){ return; }
  var url=new URL(req.url);
  /* never cache firestore / google api calls */
  if(/firestore|googleapis|gstatic|firebaseio/.test(url.host)){ return; }
  e.respondWith(
    fetch(req).then(function(resp){
      if(resp && resp.status===200 && url.origin===location.origin){
        var copy=resp.clone(); caches.open(CACHE).then(function(c){ c.put(req,copy); });
      }
      return resp;
    }).catch(function(){ return caches.match(req).then(function(m){ return m || caches.match('nightwalk.html'); }); })
  );
});
