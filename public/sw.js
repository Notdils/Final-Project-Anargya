/* Anargya Corp service worker.
   - Static assets and the E21 model: cache-first.
   - Pages: network-first, falling back to cache, then /offline.
   - Only public pages are cached (allowlist, with or without the /ja prefix). Account, receipts,
     checkout, bookings, admin, auth and API responses never are (offline they get /offline). Logging out clears the page cache. */
const VERSION = "anargya-v5"; // bump when precached files or icons change
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PRECACHE = ["/offline", "/ja/offline", "/models/e21.glb", "/icons/icon-192.png", "/icons/icon-512.png"];
const PUBLIC_PAGE = /^\/(|about|consulting|marketplace(\/[a-z0-9-]+)?|cart|offline)$/;
const stripLocale = (p) => p.replace(/^\/ja(?=\/|$)/, "") || "/";

// The offline pages also need their JS/CSS, or Next.js shows "Application error" when it hydrates offline.
async function precache() {
  const c = await caches.open(STATIC);
  await c.addAll(PRECACHE);
  const assets = new Set();
  for (const page of ["/offline", "/ja/offline"]) {
    const html = await (await c.match(page)).text();
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
  }
  await Promise.all([...assets].map((a) => c.add(a).catch(() => {})));
}

self.addEventListener("install", (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname === "/api/auth/logout") { e.waitUntil(caches.delete(PAGES)); return; }
  if (req.method !== "GET") return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/models/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    const offline = () => caches.match(/^\/ja(\/|$)/.test(url.pathname) ? "/ja/offline" : "/offline");
    // Private or unknown pages (account, checkout, admin, ...) are never cached: network only,
    // with the offline page when there is no connection.
    if (!PUBLIC_PAGE.test(stripLocale(url.pathname).replace(/\/$/, "") || "/")) {
      e.respondWith(fetch(req).catch(offline));
      return;
    }
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || offline())),
    );
  }
});
