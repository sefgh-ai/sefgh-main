/**
 * SEFGH service worker — static assets only.
 *
 * The previous version cached every same-origin GET that returned 200, which
 * included authenticated HTML (/home, /profile, /settings) and Next.js RSC
 * payloads. After sign-out — or for the next person on a shared device — those
 * cached pages were served straight back from the cache. It also pinned stale
 * HTML against freshly deployed JS chunks, producing hydration mismatches.
 *
 * Rules now:
 *   - Never cache HTML or RSC payloads. Navigations always hit the network.
 *   - Only cache immutable build output and static image assets.
 *   - CACHE_VERSION must change per deploy so old entries are evicted.
 */

const CACHE_VERSION = "sefgh-static-v3";
const OFFLINE_URL = "/offline.html";

// Safe to precache: neither is user-specific.
const PRECACHE = [OFFLINE_URL, "/manifest.json", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // Don't fail the whole install if one entry 404s.
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  // Immutable build output.
  if (url.pathname.startsWith("/_next/static/")) return true;
  // Static files we ship ourselves.
  return /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf|eot)$/i.test(
    url.pathname
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Never touch auth or API traffic.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  // Navigations: always network. Fall back to the offline page, never to a
  // cached copy of somebody's account.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ||
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        )
      )
    );
    return;
  }

  if (!isCacheableAsset(url)) return;

  // Cache-first for immutable assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "SEFGH", {
      body: data.body || "New notification from SEFGH",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});
