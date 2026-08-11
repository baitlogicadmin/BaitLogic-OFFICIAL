"use strict";

const CACHE_NAME="baitlogic-field-console-v9";
const APP_SHELL=[
  "/",
  "/site.css?v=1",
  "/site.js?v=2",
  "/manifest.webmanifest",
  "/barometer.html",
  "/nature-check.html",
  "/premium.css",
  "/launch.css",
  "/barometer/styles.css?v=5",
  "/barometer/premium-v4.css?v=7",
  "/barometer/app.js?v=8",
  "/barometer/water-evidence.js?v=1",
  "/barometer/manifest.webmanifest",
  "/barometer/icon.svg"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith("/api/"))return;

  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("/"))));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>{
    const network=fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>cached);
    return cached||network;
  }));
});
