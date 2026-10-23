/* HosFIRE Mobile service worker — network first, so the app always loads the
   latest version, with a saved copy for when the signal drops. Scope is limited
   to /hosfire-mobile so it never touches the HosPRO portal's own worker. */
const CACHE = "hosfire-mobile-v1";
const SHELL = ["hosfire-mobile.html", "hosfire-defs.js", "firebase-config.js", "hosfire-mobile-manifest.json", "assets/hosfire-mobile-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x.startsWith("hosfire-mobile") && x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
