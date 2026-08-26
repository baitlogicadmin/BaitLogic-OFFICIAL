const CACHE = "baitlogic-field-kit-v8";
const CORE = [
  "/manifest.webmanifest",
  "/assets/baitlogic-logo.png",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/hero-observer.png",
  "/assets/water-pulse.png",
  "/assets/habitat-restoration.png",
  "/field-intel.html",
  "/barometer.html",
  "/conservation-prairie.html",
  "/nature-check.html",
  "/outdoor.html",
  "/site.css?v=3",
  "/site.js?v=3",
  "/premium.css",
  "/launch.css",
  "/barometer/base-v2.css?v=1",
  "/barometer/components-v2.css?v=1",
  "/barometer/details-v2.css?v=1",
  "/barometer/water-v2.css?v=1",
  "/barometer/mobile-v2.css?v=1",
  "/barometer/mobile-details-v2.css?v=1",
  "/barometer/loading-v1.css",
  "/barometer/app.js?v=11",
  "/barometer/water-evidence.js?v=1",
  "/barometer/trend-ui.js?v=1",
  "/barometer/connection-ui.js?v=3",
  "/barometer/auto-refresh.js?v=1",
  "/barometer/manifest.webmanifest",
  "/barometer/icon.svg"
];

async function cacheFresh(cache, request) {
  const response = await fetch(request, { cache: "no-cache" });
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch("/", { cache: "no-cache" });
  const html = await response.clone().text();
  await cache.put("/", response);
  const linkedAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith("/") && !path.startsWith("//"));
  const paths = [...new Set([...CORE, ...linkedAssets])];
  await Promise.allSettled(paths.map(async (path) => {
    const resource = await fetch(path, { cache: "no-cache" });
    if (resource.ok) await cache.put(path, resource.clone());
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request, { cache: "no-cache" });
        if (response.ok) {
          await cache.put(event.request, response.clone());
          if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
            await cache.put("/", response.clone());
          }
        }
        return response;
      } catch {
        return (await cache.match(event.request))
          || (await cache.match(requestUrl.pathname))
          || (await cache.match("/"));
      }
    })());
    return;
  }

  if (["/api/barometer-snapshot", "/api/water-snapshot"].includes(requestUrl.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (!cached) return new Response(JSON.stringify({ error: "No saved verified data are available offline." }), {
          status: 503,
          headers: { "Content-Type": "application/json", "X-BaitLogic-Source": "offline-miss" },
        });
        const headers = new Headers(cached.headers);
        headers.set("X-BaitLogic-Source", "offline-cache");
        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
      }
    })());
    return;
  }

  if (["script", "style", "worker"].includes(event.request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        return await cacheFresh(cache, event.request);
      } catch {
        return (await cache.match(event.request)) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    })),
  );
});
