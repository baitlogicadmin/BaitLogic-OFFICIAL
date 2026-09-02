"use strict";
const W$=s=>document.querySelector(s),Wset=(id,v)=>{const e=W$(id);if(e)e.textContent=v;};
const waterStyle=document.createElement("style");waterStyle.textContent=`.water-evidence-card{padding:22px}.water-evidence-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.water-evidence-grid article{padding:13px;border:1px solid var(--line);border-radius:15px;background:#fff}.water-evidence-grid span{display:block;color:var(--muted);font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.water-evidence-grid strong{display:block;margin-top:6px;color:var(--ink);font-size:.94rem;line-height:1.3}.water-source{display:block;margin-top:12px;color:var(--muted);font-size:.68rem;line-height:1.4}@media(max-width:620px){.water-evidence-grid{grid-template-columns:1fr 1fr}}`;document.head.appendChild(waterStyle);
const placeScript=document.createElement("script");placeScript.src="/barometer/place-label.js?v=1";placeScript.defer=true;document.head.appendChild(placeScript);
async function loadWaterEvidence(){
  const state=W$("#waterEvidenceState");if(!state)return;
  if(!navigator.geolocation){Wset("#waterEvidenceState","NO GPS");Wset("#waterEvidenceNote","Device location is unavailable, so BaitLogic will not guess which water station is relevant.");return;}
  Wset("#waterEvidenceState","LOCATING");
  navigator.geolocation.getCurrentPosition(async p=>{
    Wset("#waterEvidenceState","CHECKING");
    try{
      const r=await fetch(`/api/water-snapshot?lat=${encodeURIComponent(p.coords.latitude)}&lon=${encodeURIComponent(p.coords.longitude)}`,{cache:"no-store"});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"USGS lookup failed");const rows=Array.isArray(d.stations)?d.stations:[];
      if(!rows.length){Wset("#waterEvidenceState","NO STATION");Wset("#waterEvidenceNote","No active nearby USGS station returned measurements for this area. BaitLogic is leaving water values blank rather than estimating them.");return;}
      const s=rows.find(x=>x.temp!=null)||rows.find(x=>x.flow!=null||x.gage!=null)||rows[0];
      Wset("#waterEvidenceState","LIVE");Wset("#waterStation",s.name||s.site||"USGS station");Wset("#waterTemp",s.temp==null?"Not reported":`${s.temp} °F`);Wset("#waterFlow",s.flow==null?"Not reported":`${s.flow} cfs`);Wset("#waterGage",s.gage==null?"Not reported":`${s.gage} ft`);Wset("#waterEvidenceNote","Nearby public measurements are evidence, not assumptions. A station may represent a nearby stream or lake rather than your exact fishing spot.");Wset("#waterSource",`Source: ${d.source||"USGS Water Data for the Nation"} • checked ${new Date(d.timestamp||Date.now()).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`);
    }catch{Wset("#waterEvidenceState","UNAVAILABLE");Wset("#waterEvidenceNote","Nearby USGS data could not be verified right now. Water temperature, flow and level remain blank rather than guessed.");}
  },()=>{Wset("#waterEvidenceState","NO GPS");Wset("#waterEvidenceNote","Allow location to match nearby public water measurements. No substitute location will be used.");},{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
}
window.addEventListener("DOMContentLoaded",loadWaterEvidence);window.addEventListener("online",loadWaterEvidence);