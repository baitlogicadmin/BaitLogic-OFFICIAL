"use strict";

const CACHE_NAME="baitlogic-offline-v11";
const DATA_CACHE="baitlogic-data-v11";
const QUEUE_DB="baitlogic-offline-queue-v1";
const QUEUE_STORE="requests";

const APP_SHELL=[
  "/",
  "/index.html",
  "/outdoor.html",
  "/barometer.html",
  "/nature-check.html",
  "/conservation-prairie.html",
  "/site.css?v=1",
  "/site.js?v=2",
  "/premium.css",
  "/launch.css",
  "/manifest.webmanifest",
  "/barometer/styles.css?v=5",
  "/barometer/premium-v4.css?v=7",
  "/barometer/app.js?v=8",
  "/barometer/water-evidence.js?v=1",
  "/barometer/manifest.webmanifest",
  "/barometer/icon.svg"
];

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(QUEUE_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE,{keyPath:"id",autoIncrement:true});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function queueRequest(request){
  const clone=request.clone();
  const headers={};
  clone.headers.forEach((v,k)=>headers[k]=v);
  const body=await clone.text();
  const item={url:clone.url,method:clone.method,headers,body,createdAt:Date.now()};
  const db=await openDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(QUEUE_STORE,"readwrite");
    tx.objectStore(QUEUE_STORE).add(item);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

async function flushQueue(){
  const db=await openDb();
  const items=await new Promise((resolve,reject)=>{
    const tx=db.transaction(QUEUE_STORE,"readonly");
    const req=tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
  for(const item of items){
    try{
      const r=await fetch(item.url,{method:item.method,headers:item.headers,body:item.body,credentials:"same-origin"});
      if(!r.ok) continue;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(QUEUE_STORE,"readwrite");
        tx.objectStore(QUEUE_STORE).delete(item.id);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
    }catch{}
  }
  db.close();
}

function offlineQueuedResponse(){
  return new Response(JSON.stringify({ok:true,queued:true,offline:true,message:"Saved on this device and queued to sync when connection returns."}),{
    status:202,
    headers:{"Content-Type":"application/json","X-BaitLogic-Offline":"queued"}
  });
}

async function markOffline(response){
  try{
    const blob=await response.clone().blob();
    const headers=new Headers(response.headers);
    headers.set("X-BaitLogic-Offline","cached");
    headers.set("X-BaitLogic-Stale","true");
    return new Response(blob,{status:200,statusText:"OK",headers});
  }catch{return response;}
}

function latestKeyFor(url){
  return new Request(`${self.location.origin}/__offline_latest${url.pathname}`);
}

async function networkFirst(request,{cacheName=DATA_CACHE,latest=false}={}){
  const cache=await caches.open(cacheName);
  const url=new URL(request.url);
  try{
    const response=await fetch(request);
    if(response && (response.ok || response.type==="opaque")){
      cache.put(request,response.clone()).catch(()=>{});
      if(latest && response.ok) cache.put(latestKeyFor(url),response.clone()).catch(()=>{});
    }
    return response;
  }catch{
    let cached=await cache.match(request);
    if(!cached && latest) cached=await cache.match(latestKeyFor(url));
    if(cached) return latest?markOffline(cached):cached;
    throw new Error("offline-no-cache");
  }
}

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>![CACHE_NAME,DATA_CACHE].includes(k)).map(k=>caches.delete(k)))),
    self.clients.claim(),
    flushQueue().catch(()=>{})
  ]));
});

self.addEventListener("sync",event=>{
  if(event.tag==="baitlogic-sync") event.waitUntil(flushQueue());
});

self.addEventListener("message",event=>{
  if(event.data?.type==="BAITLOGIC_FLUSH_QUEUE") event.waitUntil?.(flushQueue());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);

  if(request.method!=="GET"){
    if(url.origin===self.location.origin && url.pathname.startsWith("/api/") && request.method==="POST" && !url.pathname.endsWith("/events")){
      event.respondWith((async()=>{
        try{
          const response=await fetch(request.clone());
          if(response.ok) return response;
          if(response.status<500) return response;
          await queueRequest(request);
          self.registration.sync?.register("baitlogic-sync").catch(()=>{});
          return offlineQueuedResponse();
        }catch{
          await queueRequest(request);
          self.registration.sync?.register("baitlogic-sync").catch(()=>{});
          return offlineQueuedResponse();
        }
      })());
    }
    return;
  }

  if(url.origin===self.location.origin && url.pathname.startsWith("/api/")){
    event.respondWith(networkFirst(request,{latest:true}));
    return;
  }

  if(url.origin!==self.location.origin){
    if(["api.open-meteo.com","air-quality-api.open-meteo.com","api.weather.gov","api.bigdatacloud.net","nominatim.openstreetmap.org"].includes(url.hostname)){
      event.respondWith(networkFirst(request));
    }
    return;
  }

  if(request.mode==="navigate"){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request);
        if(response.ok) cache.put(request,response.clone()).catch(()=>{});
        flushQueue().catch(()=>{});
        return response;
      }catch{
        return (await cache.match(request)) || (await cache.match(url.pathname)) || (await cache.match("/"));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    if(cached){
      fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());}).catch(()=>{});
      return cached;
    }
    try{
      const response=await fetch(request);
      if(response.ok) cache.put(request,response.clone()).catch(()=>{});
      return response;
    }catch{
      return new Response("Offline",{status:503,statusText:"Offline"});
    }
  })());
});
