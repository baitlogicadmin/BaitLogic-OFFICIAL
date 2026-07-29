"use strict";

// Bump this on any deploy that changes cached files, to force clients to
// pick up the new versions instead of serving stale ones forever.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `baitlogic-barometer-shell-${CACHE_VERSION}`;
const DATA_CACHE = `baitlogic-barometer-data-${CACHE_VERSION}`;

const SHELL_FILES = [
  "/barometer.html",
  "/barometer/styles.css",
  "/barometer/app.js",
  "/barometer/manifest.webmanifest",
  "/barometer/icons/icon-192.png",
  "/barometer/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isDataRequest(url) {
  return (
    url.hostname === "khhishscjirjxhsulniq.supabase.co" ||
    url.hostname === "api.open-meteo.com" ||
    url.pathname === "/api/catches"
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET — POSTs (catch logging) always need the real network
  // and should fail loudly if there's no connection, not be intercepted.
  if (event.request.method !== "GET") return;

  if (isDataRequest(url)) {
    // Network-first: always try for a fresh reading, but stash the last
    // good response so the dial still shows real numbers offline instead
    // of an error state.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (SHELL_FILES.includes(url.pathname)) {
    // Cache-first for the app shell — these only change on deploy, so
    // serving from cache is both instant and correct between deploys.
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
