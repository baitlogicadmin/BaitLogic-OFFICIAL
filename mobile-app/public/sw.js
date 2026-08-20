const CACHE = "baitlogic-field-kit-v3";
const CORE = [
  "/manifest.webmanifest",
  "/assets/baitlogic-logo.png",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/hero-observer.png",
  "/assets/water-pulse.png",
  "/assets/habitat-restoration.png",
];

async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch("/");
  const html = await response.clone().text();
  await cache.put("/", response);
  const linkedAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith("/") && !path.startsWith("//"));
  await cache.addAll([...new Set([...CORE, ...linkedAssets])]);
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
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put("/", response.clone()));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    })),
  );
});
