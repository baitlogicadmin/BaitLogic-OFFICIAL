"use strict";

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],safe=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

async function api(url,opts={}){
  const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});
  let d={};
  try{d=await r.json()}catch{}
  if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);
  d._offline=r.headers.get("X-BaitLogic-Offline")||null;
  d._stale=r.headers.get("X-BaitLogic-Stale")==="true";
  return d;
}

function msg(id,text,ok=false){const e=$(id);if(!e)return;e.textContent=text;e.style.color=ok?"#126642":""}
function visitorId(){let id=localStorage.getItem("bl_visitor");if(!id){id=(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`);localStorage.setItem("bl_visitor",id)}return id}
function track(eventName){if(!navigator.onLine)return;const id=visitorId();fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({event_name:eventName,path:location.pathname,session_id:id,visitor_id:id,referrer:document.referrer||null})}).catch(()=>{})}
function menu(){const b=$("#menuBtn"),n=$("#mainNav");b?.addEventListener("click",()=>n.classList.toggle("open"));n?.addEventListener("click",()=>n.classList.remove("open"))}

async function health(){
  try{const d=await api("/api/health");$("#systemStatus").textContent=d._offline?"Offline · saved data available":d.ok?"Systems online":"Limited"}
  catch{$("#systemStatus").textContent=navigator.onLine?"Limited connectivity":"Offline mode"}
}

async function loadReports(){
  const feed=$("#reportsFeed");if(!feed)return;
  feed.innerHTML='<div class="feed-item">Loading Field Checks…</div>';
  try{
    const d=await api("/api/reports"),rows=d.reports||[];
    feed.innerHTML=(d._offline?'<div class="feed-item"><strong>Offline mode</strong><p>Showing the last approved Field Checks saved on this device.</p></div>':'')+
      (rows.length?rows.slice(0,8).map(r=>`<article class="feed-item"><strong>${safe(r.category||"Field Check")} · ${safe(r.water||"Local area")}</strong><small>${safe(r.name||"Community member")} · ${r.created_at?new Date(r.created_at).toLocaleString():"recent"}</small><p>${safe(r.report)}</p></article>`).join(""):'<div class="feed-item">No approved Field Checks are published here yet.</div>');
  }catch(e){feed.innerHTML=`<div class="feed-item">${navigator.onLine?`Field Checks unavailable: ${safe(e.message)}`:"Offline and no saved approved Field Checks are available yet."}</div>`}
}

function cleanRegion(v){return String(v||"").replace(/^State of\s+/i,"").trim()}
function humanPlace(place,region){place=String(place||"").trim();region=cleanRegion(region);return place&&region&&!place.toLowerCase().includes(region.toLowerCase())?`${place}, ${region}`:(place||region||"")}

async function reversePlace(lat,lon){
  try{
    const r=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,{cache:"no-store"});
    if(!r.ok)throw new Error("place lookup failed");
    const d=await r.json();
    const place=d.locality||d.city||d.localityInfo?.administrative?.find(x=>["city","town","village"].includes(String(x.description||"").toLowerCase()))?.name;
    const label=humanPlace(place,d.principalSubdivision);
    if(label)return label;
  }catch{}
  return "";
}

function applyPrivacy(){
  const selected=$("input[name='privacy']:checked")?.value||"local_picture";
  const field=$("#publicNameField"),name=$("#name");
  const isPublic=selected==="public";
  if(field)field.hidden=!isPublic;
  if(name){name.required=isPublic;if(!isPublic)name.value=""}
}

function reportForm(){
  const f=$("#reportForm");
  if(!f)return;

  $$("input[name='privacy']").forEach(r=>r.addEventListener("change",applyPrivacy));
  applyPrivacy();

  f.addEventListener("submit",async e=>{
    e.preventDefault();
    const fd=new FormData(f),payload=Object.fromEntries(fd.entries());
    const privacy=payload.privacy||"local_picture";
    delete payload.privacy;

    if(privacy==="anonymous")payload.name="Anonymous";
    else if(privacy==="local_picture")payload.name="Community member";
    else payload.name=String(payload.name||"").trim();

    payload.water=String(payload.water||"").trim();
    payload.report=String(payload.report||"").trim();
    payload.gps=""; // Exact coordinates are deliberately not published or stored by Field Check.

    if(!payload.name)return msg("#reportMsg","Add a display name or choose Anonymous / Add to the local picture.");
    if(!payload.water)return msg("#reportMsg","Add the town, park, lake, trail or general area where you noticed it.");
    if(!payload.report)return msg("#reportMsg","Tell us what caught your attention.");

    msg("#reportMsg",navigator.onLine?"Submitting your Field Check…":"Saving your Field Check offline…");
    try{
      const d=await api("/api/reports",{method:"POST",body:JSON.stringify(payload)});
      f.reset();applyPrivacy();
      if(d.queued||d._offline==="queued"){
        msg("#reportMsg","Saved on this device. It will be submitted for review automatically when connection returns.",true);
      }else if(d.moderation==="pending_review"){
        track("field_check_submitted");
        msg("#reportMsg","Submitted for review. It will appear in the local picture after approval.",true);
      }else{
        track("field_check_success");
        msg("#reportMsg",d.message||"Field Check received.",true);
        loadReports();
      }
    }catch(err){msg("#reportMsg",err.message)}
  });

  $("#reportGps")?.addEventListener("click",()=>{
    track("field_check_location_click");
    if(!navigator.geolocation)return msg("#reportMsg","Location is not available on this device. Type the town or area instead.");
    msg("#reportMsg","Finding your town or area…");
    navigator.geolocation.getCurrentPosition(async p=>{
      const label=await reversePlace(p.coords.latitude,p.coords.longitude);
      if(!label){
        msg("#reportMsg","Your device location was confirmed, but the town name could not be resolved. Type the place or area instead—no coordinates were added.");
        return;
      }
      $("#waterName").value=label;
      $("#gps").value="";
      msg("#reportMsg",`Location set to ${label}. Exact coordinates are not shared.`,true);
    },()=>msg("#reportMsg","Location permission was not granted. Type the town, park, lake or general area instead."),{enableHighAccuracy:true,timeout:10000,maximumAge:120000});
  });
}

function signup(){
  const f=$("#signupForm");
  f?.addEventListener("submit",async e=>{
    e.preventDefault();msg("#signupMsg",navigator.onLine?"Joining…":"Saving signup offline…");
    try{const d=await api("/api/signups",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(f).entries()))});f.reset();if(d.queued||d._offline==="queued")msg("#signupMsg","Saved on this device. Your signup will sync automatically when connection returns.",true);else{track("signup_success");msg("#signupMsg","You’re in. We’ll only send useful BaitLogic field and conservation updates.",true)}}catch(err){msg("#signupMsg",err.message)}
  });
}

async function waterAt(lat,lon){
  const out=$("#waterResults");out.innerHTML='<div class="feed-item">Finding nearby USGS monitoring stations…</div>';
  try{
    const d=await api(`/api/water-snapshot?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),rows=d.stations||[];
    if(!d._offline)track("water_lookup_success");
    out.innerHTML=(d._offline?'<div class="feed-item"><strong>Offline · last saved water data</strong><p>This may be stale or from the last location checked. Reconnect before making a live-condition decision.</p></div>':'')+(rows.length?rows.map(s=>`<div class="water-row"><span><strong>${safe(s.name)}</strong>${safe(s.site)}</span><span><strong>${safe(s.flow??"—")}</strong>Flow cfs</span><span><strong>${safe(s.gage??"—")}</strong>Gage ft</span><span><strong>${safe(s.temp??"—")}</strong>Water °F</span></div>`).join(""):'<div class="feed-item">No saved nearby USGS station data is available for this area.</div>');
    $("#waterMeta").textContent=d._offline?"OFFLINE · last saved USGS response · reconnect to refresh":`Updated ${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})} · Source: USGS Water Data for the Nation`;
  }catch(e){out.innerHTML=`<div class="feed-item">${navigator.onLine?`Live USGS data could not load right now. (${safe(e.message)})`:"Offline and no saved water reading is available yet."}</div>`}
}

function water(){
  $("#findWater")?.addEventListener("click",()=>{
    track("water_lookup_click");msg("#waterMsg","Requesting location…");
    if(!navigator.geolocation)return msg("#waterMsg","Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(p=>{msg("#waterMsg",navigator.onLine?"Location connected.":"Location connected · offline mode",true);waterAt(p.coords.latitude,p.coords.longitude)},()=>msg("#waterMsg","Allow location to find nearby monitoring stations."),{timeout:9000});
  });
}

function liveEntry(){
  const c=$("#primaryCta");if(c){c.href="/outdoor.html";c.textContent="Get Live Outdoor Results"}
  const nav=$("#mainNav");if(nav&&!nav.querySelector('a[href="/outdoor.html"]')){const a=document.createElement("a");a.href="/outdoor.html";a.textContent="Outdoors Now";nav.prepend(a)}
}

function nav(){
  const links=$$(".bottom-nav a");links.forEach(a=>a.addEventListener("click",()=>{links.forEach(x=>x.classList.remove("active"));a.classList.add("active")}));
  $("#primaryCta")?.addEventListener("click",()=>track("primary_cta_click"));
  $("#reportCta")?.addEventListener("click",()=>track("report_cta_click"));
  $("#fieldCheckCta")?.addEventListener("click",()=>track("field_check_cta_click"));
}

function registerPwa(){
  if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").then(()=>{window.addEventListener("online",()=>navigator.serviceWorker.controller?.postMessage({type:"BAITLOGIC_FLUSH_QUEUE"}))}).catch(()=>{})}
}

document.addEventListener("DOMContentLoaded",()=>{track("page_view");menu();liveEntry();health();loadReports();reportForm();signup();water();nav();registerPwa()});
window.addEventListener("online",()=>{health();loadReports()});
window.addEventListener("offline",health);
