"use strict";
(function(){
  const HIGHLAND={lat:38.7395,lon:-89.6712};
  const $=s=>document.querySelector(s);
  const text=(s,v)=>{const el=$(s);if(el)el.textContent=v};
  let running=false;
  async function recover(){
    if(running)return;
    const pressure=$("#pressureValue");
    if(!pressure || pressure.textContent.trim()!=="--.--")return;
    const lat=Number(window.S?.lat),lon=Number(window.S?.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    running=true;
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),12000);
      const response=await fetch(`/api/barometer-snapshot?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,{cache:"no-store",signal:controller.signal});
      clearTimeout(timer);
      const data=await response.json();
      if(!response.ok||!data?.weather?.pressureInHg)throw new Error(data?.error||"Live pressure unavailable");
      if(typeof window.render==="function"){
        window.render(data);
      }else{
        const w=data.weather;
        text("#pressureValue",Number(w.pressureInHg).toFixed(2));
        text("#pressureShort",`${Number(w.pressureDelta3h)>=0?"rising":"falling"} • ${Number(w.pressureDelta3h)>=0?"+":""}${Number(w.pressureDelta3h).toFixed(2)} inHg / 3h`);
        text("#pressureTrend",Number(w.pressureDelta3h)>=0?"Pressure is rising.":"Pressure is falling.");
        text("#connectionStatus","Live");
        text("#dataState","Live conditions loaded");
        text("#lastUpdated",new Date(data.updatedAt||Date.now()).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));
      }
    }catch(error){
      console.warn("BaitLogic live-data recovery failed",error);
    }finally{running=false}
  }
  function schedule(){setTimeout(recover,1500)}
  $("#useHighland")?.addEventListener("click",schedule,{passive:true});
  $("#beginLocation")?.addEventListener("click",schedule,{passive:true});
  $("#refreshConditions")?.addEventListener("click",schedule,{passive:true});
  $("#retryLocation")?.addEventListener("click",schedule,{passive:true});
  setTimeout(recover,3500);
})();
