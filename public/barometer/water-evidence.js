"use strict";
const W$=s=>document.querySelector(s),Wset=(id,v)=>{const e=W$(id);if(e)e.textContent=v;};
async function loadWaterEvidence(){
  const state=W$("#waterEvidenceState");
  if(!state)return;
  if(!navigator.geolocation){Wset("#waterEvidenceState","NO GPS");Wset("#waterEvidenceNote","Device location is unavailable, so BaitLogic will not guess which water station is relevant.");return;}
  Wset("#waterEvidenceState","LOCATING");
  navigator.geolocation.getCurrentPosition(async p=>{
    Wset("#waterEvidenceState","CHECKING");
    try{
      const r=await fetch(`/api/water-snapshot?lat=${encodeURIComponent(p.coords.latitude)}&lon=${encodeURIComponent(p.coords.longitude)}`,{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"USGS lookup failed");
      const rows=Array.isArray(d.stations)?d.stations:[];
      if(!rows.length){Wset("#waterEvidenceState","NO STATION");Wset("#waterEvidenceNote","No active nearby USGS station returned measurements for this area. BaitLogic is leaving water values blank rather than estimating them.");return;}
      const s=rows.find(x=>x.temp!=null)||rows.find(x=>x.flow!=null||x.gage!=null)||rows[0];
      Wset("#waterEvidenceState","LIVE");Wset("#waterStation",s.name||s.site||"USGS station");Wset("#waterTemp",s.temp==null?"Not reported":`${s.temp} °F`);Wset("#waterFlow",s.flow==null?"Not reported":`${s.flow} cfs`);Wset("#waterGage",s.gage==null?"Not reported":`${s.gage} ft`);Wset("#waterEvidenceNote","Nearby public measurements are evidence, not assumptions. A station may represent a nearby stream or lake rather than your exact fishing spot.");Wset("#waterSource",`Source: ${d.source||"USGS Water Data for the Nation"} • checked ${new Date(d.timestamp||Date.now()).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`);
    }catch(err){Wset("#waterEvidenceState","UNAVAILABLE");Wset("#waterEvidenceNote","Nearby USGS data could not be verified right now. Water temperature, flow and level remain blank rather than guessed.");}
  },()=>{Wset("#waterEvidenceState","NO GPS");Wset("#waterEvidenceNote","Allow location to match nearby public water measurements. No substitute location will be used.");},{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
}
window.addEventListener("DOMContentLoaded",loadWaterEvidence);window.addEventListener("online",loadWaterEvidence);