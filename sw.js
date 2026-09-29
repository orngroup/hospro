/* HOSPRO service worker
   Network first: always load the latest files from the server, and only
   fall back to the saved copy when offline. Only this site's own files are
   cached (never Firebase, the IP lookup or other services).
   Bump CACHE when you want every device to drop its old saved copies. */
const CACHE="hospro-brandon-v2";
const ASSETS=["./","./index.html","./app.js","./data.js","./manifest.json","./assets/bh-logo.svg"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=="GET" || url.origin!==self.location.origin) return;   // leave everything else alone
  e.respondWith(
    fetch(req).then(res=>{
      if(res.ok){ const cp=res.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); }
      return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match("./index.html")))
  );
});
