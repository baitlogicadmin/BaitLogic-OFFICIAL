(() => {
  const CACHE_KEY = 'baitlogic-trails-ui-v1';
  const DEFAULT_BBOX = [-89.78, 38.68, -89.55, 38.83];
  const $ = (sel) => document.querySelector(sel);
  const state = { collection: null, selected: null, bbox: DEFAULT_BBOX, source: 'live' };

  const els = {
    map: $('#trail-map-svg'), mapStatus: $('#map-status'), list: $('#trail-list'),
    name: $('#trail-name'), location: $('#trail-location'), distance: $('#trail-distance'),
    surface: $('#trail-surface'), use: $('#trail-use'), source: $('#trail-source'),
    details: $('#trail-description'), directions: $('#trail-directions'), gpx: $('#trail-gpx'),
    save: $('#trail-save'), offline: $('#offline-state'), count: $('#trail-count'),
    trailheadCount: $('#trailhead-count'), official: $('#official-source-link'),
  };

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }
  function getCache(){ try{const p=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return p?.type==='FeatureCollection'?p:null}catch{return null} }
  function saveCache(c){ try{localStorage.setItem(CACHE_KEY,JSON.stringify(c))}catch{} }
  function formatUse(p){const u=[];if(p.foot!=='no')u.push('Hiking');if(['yes','designated','permissive'].includes(p.bicycle))u.push('Biking');if(['yes','designated','permissive'].includes(p.horse))u.push('Horseback');return u.length?u.join(' · '):'Check posted uses'}
  function mapOfficialLink(p){if(p.website)return p.website;if((p.name||'').toLowerCase().includes('silver lake'))return 'https://www.highlandil.gov/departments/parks_and_recreation/parks_and_silver_lake/silver_lake/index.php';return 'https://www.meprd.org/community-maps.html'}

  function selectTrail(trail){
    state.selected=trail;
    document.querySelectorAll('[data-trail-id]').forEach(el=>el.classList.toggle('selected',el.dataset.trailId===trail.properties.id));
    document.querySelectorAll('[data-route-id]').forEach(el=>el.classList.toggle('selected-route',el.dataset.routeId===trail.properties.id));
    const p=trail.properties;
    els.name.textContent=p.name||'Mapped trail'; els.location.textContent=p.operator||'Highland / Metro East, Illinois';
    els.distance.textContent=`${Number(p.distanceMiles||0).toFixed(2)} mi`; els.surface.textContent=p.surface||p.highway||'Mapped path';
    els.use.textContent=formatUse(p); els.source.textContent=p.official?'Official operator identified':'Community-mapped geometry';
    els.details.textContent=`${p.name||'This route'} is drawn from mapped trail geometry. Check posted signs and official closure information before entering.`;
    const [lon,lat]=p.routePoint||trail.geometry.coordinates[0]||[0,0];
    els.directions.href=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}&travelmode=walking`;
    els.official.href=mapOfficialLink(p);
  }
  function toSvgPoint(lon,lat,b){const[w,s,e,n]=b;const x=((lon-w)/Math.max(e-w,.00001))*1000;const y=((n-lat)/Math.max(n-s,.00001))*680;return[Math.max(0,Math.min(1000,x)),Math.max(0,Math.min(680,y))]}
  function renderMap(c){
    const f=c.features||[],h=c.trailheads||[],b=c.bbox||state.bbox;
    const routes=f.map(t=>{const pts=t.geometry.coordinates.map(([lon,lat])=>toSvgPoint(lon,lat,b).join(',')).join(' ');const p=t.properties;return `<polyline data-route-id="${escapeHtml(p.id)}" tabindex="0" role="button" aria-label="${escapeHtml(p.name)}" class="route ${p.official?'official':'community'}" points="${pts}" />`}).join('');
    const heads=h.map(x=>{const[p,q]=toSvgPoint(x.geometry.coordinates[0],x.geometry.coordinates[1],b);return `<g class="trailhead" transform="translate(${p} ${q})"><circle r="9"/><circle r="4"/></g>`}).join('');
    els.map.innerHTML=`<defs><pattern id="grid" width="58" height="58" patternUnits="userSpaceOnUse"><path d="M58 0H0V58" fill="none" stroke="rgba(216,0,246,.12)" stroke-width="1"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="1000" height="680" fill="#210812"/><rect width="1000" height="680" fill="url(#grid)"/><g opacity=".35" stroke="#630436" fill="none"><path d="M0 150 C170 120 240 190 410 150 S760 80 1000 120"/><path d="M0 420 C220 360 360 450 540 400 S790 300 1000 345"/><path d="M120 0 C170 130 120 230 190 350 S260 520 230 680"/></g><g id="routes">${routes}</g>${heads}<text x="28" y="650" class="map-attribution">BaitLogic route canvas · geometry from mapped trail data</text>`;
    els.map.querySelectorAll('[data-route-id]').forEach(node=>{const activate=()=>{const t=f.find(x=>x.properties.id===node.dataset.routeId);if(t)selectTrail(t)};node.addEventListener('click',activate);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')activate()})});
  }
  function renderList(c){
    const f=[...(c.features||[])].sort((a,b)=>(b.properties.official===true)-(a.properties.official===true)||(b.properties.distanceMiles||0)-(a.properties.distanceMiles||0)).slice(0,18);
    els.list.innerHTML=f.length?f.map((t,i)=>{const p=t.properties;return `<button class="trail-card" data-trail-id="${escapeHtml(p.id)}" type="button"><span class="trail-thumb"><span>${i+1}</span></span><span class="trail-card-main"><strong>${escapeHtml(p.name||'Mapped trail')}</strong><small>${escapeHtml(p.operator||(p.official?'Official operator':'Community mapped'))}</small><em>${escapeHtml(formatUse(p))}</em></span><b>${Number(p.distanceMiles||0).toFixed(2)} mi</b></button>`}).join(''):'<div class="empty-state">No mapped trail segments were returned for this area. Try My Location or refresh when online.</div>';
    els.list.querySelectorAll('[data-trail-id]').forEach(btn=>btn.addEventListener('click',()=>{const t=f.find(x=>x.properties.id===btn.dataset.trailId);if(t)selectTrail(t)})); if(!state.selected&&f[0])selectTrail(f[0]);
  }
  function render(c,source='live'){state.collection=c;state.source=source;state.bbox=c.bbox||state.bbox;els.count.textContent=String(c.features?.length||0);els.trailheadCount.textContent=String(c.trailheads?.length||0);els.offline.textContent=source==='live'?'LIVE · SAVED OFFLINE':'OFFLINE · SAVED COPY';els.offline.dataset.mode=source;renderMap(c);renderList(c)}
  async function loadTrails(bbox=state.bbox){
    els.mapStatus.textContent='Loading mapped trails…';const cached=getCache();
    if(!navigator.onLine){if(cached){render(cached,'offline');els.mapStatus.textContent='Offline copy loaded.'}else els.mapStatus.textContent='Offline and no saved trail area is available yet.';return}
    try{const query=bbox.map(v=>Number(v).toFixed(5)).join(',');const response=await fetch(`/api/trails?bbox=${encodeURIComponent(query)}`,{headers:{Accept:'application/json'},cache:'no-store'});const data=await response.json();if(!response.ok||data.type!=='FeatureCollection')throw new Error(data.error||'Trail data unavailable');saveCache(data);render(data,'live');els.mapStatus.textContent=`${data.features.length} mapped trail segments loaded.`}catch(error){if(cached){render(cached,'offline');els.mapStatus.textContent='Live lookup failed; showing saved trail geometry.'}else els.mapStatus.textContent=error?.message||'Mapped trails could not be loaded.'}
  }
  function downloadSelectedGpx(){const t=state.selected;if(!t)return;const name=t.properties.name||'BaitLogic Trail';const points=t.geometry.coordinates.map(([lon,lat])=>`<trkpt lat="${lat}" lon="${lon}"></trkpt>`).join('');const xml=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="BaitLogic" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escapeHtml(name)}</name><trkseg>${points}</trkseg></trk></gpx>`;const blob=new Blob([xml],{type:'application/gpx+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'baitlogic-trail'}.gpx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const refresh=()=>loadTrails(state.bbox);
  const locate=()=>{if(!navigator.geolocation){els.mapStatus.textContent='Location is unavailable on this device.';return}els.mapStatus.textContent='Finding your location…';navigator.geolocation.getCurrentPosition(pos=>{const lat=pos.coords.latitude,lon=pos.coords.longitude;state.selected=null;loadTrails([lon-.11,lat-.08,lon+.11,lat+.08])},()=>{els.mapStatus.textContent='Location permission is blocked or unavailable.'},{enableHighAccuracy:false,timeout:9000,maximumAge:300000})};
  document.querySelectorAll('#trail-refresh').forEach(button=>button.addEventListener('click',refresh));
  document.querySelectorAll('#trail-locate').forEach(button=>button.addEventListener('click',locate));
  els.save?.addEventListener('click',()=>{if(state.collection){saveCache(state.collection);els.mapStatus.textContent='This trail area is saved on this device for offline use.'}});
  els.gpx?.addEventListener('click',downloadSelectedGpx);
  window.addEventListener('online',()=>loadTrails(state.bbox));window.addEventListener('offline',()=>{const cached=getCache();if(cached)render(cached,'offline')});
  loadTrails(DEFAULT_BBOX);
})();