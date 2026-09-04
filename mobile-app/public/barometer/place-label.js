"use strict";
(()=>{
  const nameEl=document.querySelector('#locationName');
  const detailEl=document.querySelector('#locationDetail');
  if(!nameEl||!detailEl)return;
  const coord=/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/;
  const generic=/^(locating|current area|location unavailable|your current area)/i;
  let resolving=false,lastCoords='';
  const cleanRegion=v=>String(v||'').replace(/^State of\s+/i,'').trim();
  const human=(place,region)=>{place=String(place||'').trim();region=cleanRegion(region);return place&&region&&!place.toLowerCase().includes(region.toLowerCase())?`${place}, ${region}`:(place||region||'Your current area');};
  async function resolve(lat,lon){
    if(resolving)return;const key=`${lat.toFixed(4)},${lon.toFixed(4)}`;if(key===lastCoords)return;resolving=true;lastCoords=key;
    try{
      const r=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,{cache:'no-store'});
      if(r.ok){const d=await r.json();const place=d.locality||d.city||d.localityInfo?.administrative?.find(x=>['city','town','village'].includes(String(x.description||'').toLowerCase()))?.name;const region=d.principalSubdivision;if(place){nameEl.textContent=human(place,region);return;}}
      const n=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`,{cache:'no-store'});
      if(n.ok){const d=await n.json(),a=d.address||{};const place=a.city||a.town||a.village||a.municipality||a.county;const region=a.state;if(place)nameEl.textContent=human(place,region);}
    }catch(_){}finally{resolving=false;render();}
  }
  function render(){
    const name=(nameEl.textContent||'').trim();
    const m=(detailEl.textContent||'').match(coord);
    if(m&&(!name||generic.test(name)||coord.test(name)))resolve(Number(m[1]),Number(m[2]));
    const current=(nameEl.textContent||'').trim();
    if(current&&!generic.test(current)&&!coord.test(current))detailEl.textContent=`Live conditions for ${current} • location confirmed by your device`;
    else if(m)detailEl.textContent='Location confirmed • resolving your nearest city or town';
  }
  new MutationObserver(render).observe(nameEl,{childList:true,subtree:true,characterData:true});
  new MutationObserver(render).observe(detailEl,{childList:true,subtree:true,characterData:true});
  render();
})();