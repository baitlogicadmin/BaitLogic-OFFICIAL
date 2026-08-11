"use strict";

const $ = s => document.querySelector(s);
const set = (el, value) => { if (el) el.textContent = value; };
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toInHg = hpa => Number(hpa) * 0.0295299830714;
const clock = value => value ? new Date(value).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}) : "--";

const E = {
  air: $("#airTemperature"), weather: $("#weatherCondition"), loc: $("#locationName"), locDetail: $("#locationDetail"),
  gpsState: $("#gpsState"), gpsAccuracy: $("#gpsAccuracy"), dataState: $("#dataState"), sourceState: $("#sourceState"),
  pressure: $("#pressureValue"), pressureShort: $("#pressureShort"), trend: $("#pressureTrend"), delta: $("#pressureDelta"), bite: $("#biteStatus"),
  updated: $("#lastUpdated"), locStatus: $("#locationStatus"), dot: $("#locationStatusDot"), line: $("#pressureTrendLine"),
  refresh: $("#refreshConditions"), retry: $("#retryLocation"), connection: $("#connectionStatus"), wind: $("#windValue"), windDir: $("#windDirection"),
  cloud: $("#cloudValue"), light: $("#lightState"), catches: $("#recentCatches"), open: $("#openCatchLogger"), bottomLog: $("#bottomLogButton"),
  bottomRefresh: $("#bottomRefreshButton"), modal: $("#catchLoggerModal"), close: $("#closeCatchLogger"), cancel: $("#cancelCatch"), form: $("#catchForm"),
  weight: $("#catchWeight"), plus: $("#increaseWeight"), minus: $("#decreaseWeight"), catchLoc: $("#catchLocation"), useLoc: $("#useCatchLocation"),
  activity: $("#fishActivity"), mood: $("#fishMood"), tactic: $("#tacticAdvice"), activityReason: $("#activityReason"), lure: $("#lureFamily"),
  lureReason: $("#lureReason"), zone: $("#targetZone"), habitat: $("#habitatShift"), windows: $("#biteWindows"), windowReason: $("#windowReason"),
  species: $("#speciesMatch"), speciesReason: $("#speciesReason"), confidence: $("#confidenceScore"), confidenceText: $("#confidenceText"),
  alert: $("#patternAlert"), alertReason: $("#patternReason"), decision: $("#primaryDecision"), decisionReason: $("#decisionReason"),
  sigPressure: $("#signalPressure"), sigWind: $("#signalWind"), sigSky: $("#signalSky"), sigLocation: $("#signalLocation"), install: $("#installButton")
};

const S = {lat:null, lon:null, accuracy:null, place:null, weather:null, installPrompt:null};
const WEATHER = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Thunderstorms / hail",99:"Severe thunderstorms / hail"};

function online(){ set(E.connection, navigator.onLine ? "Online" : "Offline"); }
function status(text, kind=""){
  set(E.locStatus, text);
  if(E.dot){ E.dot.classList.remove("locked","error"); if(kind) E.dot.classList.add(kind); }
}
function compass(deg){
  if(!Number.isFinite(deg)) return "Direction --";
  const dirs=["N","NE","E","SE","S","SW","W","NW"];
  return `${dirs[Math.round(deg/45)%8]} • ${Math.round(deg)}°`;
}
function classifyTrend(d3,d6){
  if(d3<=-0.12 || d6<=-0.20) return "falling_fast";
  if(d3<=-0.03 || d6<=-0.08) return "falling";
  if(d3>=0.12 || d6>=0.20) return "rising_fast";
  if(d3>=0.03 || d6>=0.08) return "rising";
  return "steady";
}
function trendStory(trend){
  return ({
    falling_fast:"Pressure is dropping quickly. Treat this as a changing window and verify fish activity fast.",
    falling:"Pressure is falling. Search range may expand, but local fish behavior still decides the pattern.",
    steady:"Pressure is stable. Cover, depth, light and local water evidence matter more than chasing pressure.",
    rising:"Pressure is rising. Tighten presentation and prioritize high-percentage cover/depth intersections.",
    rising_fast:"Pressure is rising quickly. Expect the previous pattern to become less reliable."
  })[trend];
}

function fail(message){
  set(E.dataState,"Live data unavailable");
  set(E.updated,"Tap Refresh to retry");
  set(E.decision,"RETRY");
  set(E.decisionReason,message);
  set(E.bite,"NO LIVE DATA");
  set(E.confidence,"0");
  set(E.confidenceText,"BaitLogic withholds the recommendation when current data cannot be verified.");
  status("Live conditions unavailable","error");
  if(E.refresh) E.refresh.disabled=false;
}

async function fetchWithTimeout(url, ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    const r=await fetch(url,{cache:"no-store",signal:controller.signal});
    let d={}; try{ d=await r.json(); }catch{}
    if(!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
    return d;
  } finally { clearTimeout(timer); }
}

function reverseGeocode(lat,lon){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,{cache:"no-store",signal:controller.signal})
    .then(r=>r.ok?r.json():Promise.reject())
    .then(d=>{
      const locality=d.locality||d.city||d.principalSubdivision||"Current area";
      const region=d.principalSubdivision||"";
      S.place=region&&locality!==region?`${locality}, ${region}`:locality;
      set(E.loc,S.place);
      set(E.locDetail,`${lat.toFixed(4)}, ${lon.toFixed(4)} • live device location`);
      if(E.catchLoc) E.catchLoc.value=S.place;
    })
    .catch(()=>{})
    .finally(()=>clearTimeout(timer));
}

function safetyDecision(w, alerts){
  const severeAlert=(alerts||[]).find(a=>["Extreme","Severe"].includes(a.severity) || /warning/i.test(a.event||""));
  const thunder=[95,96,99].includes(w.code);
  if(thunder) return {word:"STOP • SEEK SHELTER", reason:"Thunderstorm conditions are present. Do not use a fishing score to override lightning safety.", score:15, mood:"Unsafe"};
  if(severeAlert) return {word:"CHECK OFFICIAL WARNING", reason:`Active NWS alert: ${severeAlert.event}. Review the official warning before heading out.`, score:25, mood:"Alert"};

  let score=58, reasons=[];
  const trend=classifyTrend(w.pressureDelta3h,w.pressureDelta6h);
  if(trend==="falling_fast"){score+=17;reasons.push("fast-falling pressure");}
  else if(trend==="falling"){score+=10;reasons.push("falling pressure");}
  else if(trend==="steady"){score+=4;reasons.push("stable pressure");}
  else if(trend==="rising"){score-=5;reasons.push("rising pressure");}
  else {score-=10;reasons.push("fast-rising pressure");}

  if(w.windMph>=4&&w.windMph<=13) score+=6;
  else if(w.windMph>22){score-=10;reasons.push("strong wind");}
  if(w.gustMph>30){score-=8;reasons.push("high gusts");}
  if(w.cloudCover>=35&&w.cloudCover<=90) score+=5;
  if(w.precipitationIn>0.15){score-=6;reasons.push("active precipitation");}
  if(w.apparentTemperatureF>=100){score-=18;reasons.push("dangerous heat stress");}
  else if(w.apparentTemperatureF>=90){score-=8;reasons.push("high heat");}

  score=Math.max(20,Math.min(92,Math.round(score)));
  return {
    word:score>=76?"FAVORABLE":score>=58?"FISHABLE • ADAPT":"SELECTIVE",
    reason:reasons.length?`Main live signals: ${reasons.join(", ")}. Verify the pattern with actual fish behavior and local water conditions.`:"Current signals are workable. Verify depth, cover and presentation before assuming a pattern.",
    score,
    mood:score>=76?"Active":score>=58?"Mixed":"Holding"
  };
}

function render(d){
  const w=d.weather;
  S.weather=w;
  const trend=classifyTrend(w.pressureDelta3h,w.pressureDelta6h);
  const decision=safetyDecision(w,d.alerts||[]);

  set(E.air,`${Math.round(w.temperatureF)}°`);
  set(E.weather,`${WEATHER[w.code]||"Current conditions"} • feels ${Math.round(w.apparentTemperatureF)}°`);
  set(E.wind,`${Math.round(w.windMph)} mph`);
  set(E.windDir,`${compass(w.windDirection)} • gusts ${Math.round(w.gustMph||0)} mph`);
  set(E.cloud,`${Math.round(w.cloudCover)}%`);
  set(E.light,w.isDay?"Daylight":"Low light / night");
  set(E.pressure,Number(w.pressureInHg).toFixed(2));
  set(E.pressureShort,`${trend.replace("_"," ")} • ${w.pressureDelta3h>=0?"+":""}${Number(w.pressureDelta3h).toFixed(2)} inHg / 3h`);
  set(E.trend,trendStory(trend));
  set(E.delta,`3h ${w.pressureDelta3h>=0?"+":""}${Number(w.pressureDelta3h).toFixed(2)} • 6h ${w.pressureDelta6h>=0?"+":""}${Number(w.pressureDelta6h).toFixed(2)} inHg`);
  set(E.bite,decision.word);
  set(E.activity,decision.score);
  set(E.mood,decision.mood);
  set(E.decision,decision.word);
  set(E.decisionReason,decision.reason);

  let tactic="Fish a proven depth/cover combination first, then let bites, follows and bait activity decide the next move.";
  let lure="Confidence bait + finesse follow-up";
  let zone="Cover beside a depth transition";
  let alert="PATTERN NEEDS PROOF";
  let alertReason="Conditions are only inputs. Local fish response is the deciding evidence.";
  if(trend.includes("falling")){tactic="Search efficiently with a moving bait, then follow contacts with a slower presentation.";lure="Moving bait → precision follow-up";zone="Wind-contact edges + travel lanes";alert="WINDOW MAY BE OPENING";alertReason="Falling pressure can support broader movement, but it is not a guarantee of feeding activity.";}
  if(trend.includes("rising")){tactic="Reduce water coverage and make precise casts where cover intersects the first useful depth change.";lure="Compact jig / worm / subtle profile";zone="Tight cover + first break";alert="POSITION MAY TIGHTEN";alertReason="Rising pressure can compress the pattern; verify before committing.";}
  if(w.windMph>20) zone="Protected structure + controllable wind";
  if([95,96,99].includes(w.code)){tactic="Stop fishing and seek appropriate shelter.";lure="—";zone="Safe shelter";}

  set(E.tactic,tactic);
  set(E.activityReason,`Pressure ${trend.replace("_"," ")} • ${Math.round(w.windMph)} mph wind • ${Math.round(w.cloudCover)}% clouds • feels ${Math.round(w.apparentTemperatureF)}°F`);
  set(E.lure,lure);
  set(E.lureReason,"A starting presentation based on current conditions, not a promise of fish activity.");
  set(E.zone,zone);
  set(E.habitat,"Use local structure, cover, water clarity and depth to refine this starting zone.");
  const am=w.sunrise?`${clock(new Date(new Date(w.sunrise).getTime()-1800000))}–${clock(new Date(new Date(w.sunrise).getTime()+5400000))}`:"--";
  const pm=w.sunset?`${clock(new Date(new Date(w.sunset).getTime()-5400000))}–${clock(new Date(new Date(w.sunset).getTime()+1800000))}`:"--";
  set(E.windows,`AM ${am} • PM ${pm}`);
  set(E.windowReason,"Daylight windows are timing context only; live weather, water and actual fish response matter more.");
  set(E.species,"Bass • Crappie • Panfish");
  set(E.speciesReason,"General condition-fit starting group. Seasonal biology and the actual waterbody must refine this.");
  const confidence=Math.max(35,Math.min(95,Math.round(94-(S.accuracy||250)/15-((d.alerts||[]).length?5:0))));
  set(E.confidence,confidence);
  set(E.confidenceText,`Verified BaitLogic server response + live GPS ±${Math.round(S.accuracy||0)} m. Recommendation remains guidance, not a safety guarantee.`);
  set(E.alert,alert);
  set(E.alertReason,alertReason);
  set(E.sigPressure,`${trend.replace("_"," ")} • ${w.pressureDelta3h>=0?"+":""}${Number(w.pressureDelta3h).toFixed(2)} inHg / 3h`);
  set(E.sigWind,`${Math.round(w.windMph)} mph ${compass(w.windDirection).split(" • ")[0]} • gusts ${Math.round(w.gustMph||0)}`);
  set(E.sigSky,`${WEATHER[w.code]||"Current sky"} • ${Math.round(w.cloudCover)}% clouds`);
  set(E.dataState,"Live conditions loaded");
  set(E.sourceState,d.source?.alerts==="National Weather Service"?"Open-Meteo + NWS":"Open-Meteo");
  set(E.updated,new Date(d.updatedAt||Date.now()).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));
  status("Live intelligence ready","locked");
  if(E.refresh) E.refresh.disabled=false;
}

async function load(){
  if(S.lat===null || S.lon===null) return locate();
  if(E.refresh) E.refresh.disabled=true;
  set(E.dataState,"Fetching live conditions");
  set(E.updated,"Working…");
  status("Reading BaitLogic live data");
  try{
    const d=await fetchWithTimeout(`/api/barometer-snapshot?lat=${encodeURIComponent(S.lat)}&lon=${encodeURIComponent(S.lon)}`,12000);
    render(d);
  }catch(error){
    fail(error.name==="AbortError"?"Live conditions timed out. Tap Refresh to try again.":error.message||"Live conditions could not be loaded.");
  }
}

function locate(){
  if(!navigator.geolocation){ fail("This browser does not provide location access."); return; }
  set(E.gpsState,"Requesting GPS");
  set(E.dataState,"Waiting for GPS");
  set(E.decision,"LOCATING");
  status("Requesting your current location");
  navigator.geolocation.getCurrentPosition(p=>{
    S.lat=p.coords.latitude; S.lon=p.coords.longitude; S.accuracy=p.coords.accuracy;
    set(E.gpsState,"GPS locked");
    set(E.gpsAccuracy,`±${Math.round(S.accuracy)} m accuracy`);
    set(E.sigLocation,S.accuracy<=50?`Strong GPS • ±${Math.round(S.accuracy)} m`:S.accuracy<=150?`Usable GPS • ±${Math.round(S.accuracy)} m`:`Broad GPS • ±${Math.round(S.accuracy)} m`);
    set(E.loc,`${S.lat.toFixed(4)}, ${S.lon.toFixed(4)}`);
    set(E.locDetail,"GPS locked • resolving place name in the background");
    if(E.catchLoc) E.catchLoc.value=`${S.lat.toFixed(4)}, ${S.lon.toFixed(4)}`;
    status("GPS locked — loading conditions","locked");
    reverseGeocode(S.lat,S.lon);
    load();
  },err=>{
    set(E.gpsState,"GPS unavailable");
    set(E.gpsAccuracy,"No coordinates used");
    fail(err.code===1?"Location permission was denied. Allow location for bait-logic.com and tap Refresh.":"A reliable GPS position could not be obtained. Try again outdoors or with location services enabled.");
  },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}

async function loadCatches(){
  if(!E.catches) return;
  try{
    const d=await fetchWithTimeout("/api/catches",8000);
    const rows=(d.catches||[]).slice(0,6);
    E.catches.innerHTML=rows.length?rows.map(c=>`<li><strong>${esc(c.species)}</strong><span>${c.weight!=null?`${Number(c.weight).toFixed(1)} lb • `:""}${esc(c.location||"Location not shared")}</span></li>`).join(""):'<li class="catches-empty">No catches logged yet.</li>';
  }catch{ E.catches.innerHTML='<li class="catches-empty">Catch feed unavailable right now.</li>'; }
}

function openModal(){ if(E.modal) E.modal.hidden=false; }
function closeModal(){ if(E.modal) E.modal.hidden=true; }
function wireCatchLogger(){
  E.open?.addEventListener("click",openModal); E.bottomLog?.addEventListener("click",openModal); E.close?.addEventListener("click",closeModal); E.cancel?.addEventListener("click",closeModal);
  E.plus?.addEventListener("click",()=>{E.weight.value=(Number(E.weight.value||0)+0.1).toFixed(1);});
  E.minus?.addEventListener("click",()=>{E.weight.value=Math.max(0,Number(E.weight.value||0)-0.1).toFixed(1);});
  E.useLoc?.addEventListener("click",()=>{if(E.catchLoc)E.catchLoc.value=S.place||((S.lat!=null)?`${S.lat.toFixed(4)}, ${S.lon.toFixed(4)}`:"");});
  E.form?.addEventListener("submit",async e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(E.form).entries());
    try{
      const r=await fetch("/api/catches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"Could not save catch");
      closeModal(); E.form.reset(); if(E.weight)E.weight.value="1"; loadCatches();
    }catch(err){ alert(err.message); }
  });
}

let installPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;if(E.install)E.install.hidden=false;});
E.install?.addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;E.install.hidden=true;});
E.refresh?.addEventListener("click",locate); E.retry?.addEventListener("click",locate); E.bottomRefresh?.addEventListener("click",locate);
window.addEventListener("online",()=>{online(); if(S.lat!=null)load();}); window.addEventListener("offline",online);

online(); wireCatchLogger(); loadCatches(); locate();
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
