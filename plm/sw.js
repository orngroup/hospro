/* Brandon Hall Financial Summary — service worker.
   Shell cached; management-account data is network-first so new months show. */
const CACHE = "bh-finance-v2";
const SHELL = ["./", "./index.html", "./manifest.json"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  // network-first for the data JSON and everything else; fall back to cache offline
  e.respondWith(
    fetch(req).then((res) => { if (res && res.ok && req.method === "GET") { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
