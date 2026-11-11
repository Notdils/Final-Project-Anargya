/* Anargya Corp service worker.
   - Static assets and the E21 model: cache-first.
   - Pages: network-first, falling back to cache, then /offline.
   - Only public pages are cached (allowlist, with or without the /ja prefix). Account, receipts,
     checkout, bookings, admin, auth and API responses never are. Logging out clears the page cache. */
const VERSION = "anargya-v2";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PRECACHE = ["/offline", "/models/e21.glb", "/icons/icon-192.png", "/icons/icon-512.png"];
const PUBLIC_PAGE = /^\/(|about|consulting|marketplace(\/[a-z0-9-]+)?|cart|offline)$/;
const stripLocale = (p) => p.replace(/^\/ja(?=\/|$)/, "") || "/";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
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
    if (!PUBLIC_PAGE.test(stripLocale(url.pathname).replace(/\/$/, "") || "/")) return; // private or unknown: network only
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline"))),
    );
  }
});
