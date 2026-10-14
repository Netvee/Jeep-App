/* Shetach service worker.
 * - Precaches the /offline page (and the scripts it references) so saved data is reachable offline.
 * - Caches immutable Next.js static assets (cache-first).
 * - Navigations are network-first; when offline they fall back to /offline.
 * - Does NOT cache map tiles (OpenStreetMap tile policy forbids bulk/offline use) or private API responses.
 */
const VERSION = "shetach-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;

async function precacheOffline() {
  const cache = await caches.open(PAGES);
  const res = await fetch("/offline", { cache: "reload" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put("/offline", res);
  const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  const s = await caches.open(STATIC);
  await Promise.all(
    [...new Set(assets), "/icon.svg", "/icon-192.png", "/manifest.webmanifest"].map((u) => s.add(u).catch(() => undefined)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheOffline().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch tiles or third parties
  if (url.pathname.startsWith("/api/")) return; // private data is never cached by the SW

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(PAGES);
        return (await cache.match("/offline")) || new Response("אין חיבור לרשת", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "refresh-offline") event.waitUntil(precacheOffline());
});
