"use strict";

const FALLBACK={latitude:38.6189,longitude:-89.3529,label:"Carlyle Lake (default)"};
const $=(s)=>document.querySelector(s);
const el={airTemperature:$("#airTemperature"),weatherCondition:$("#weatherCondition"),locationName:$("#locationName"),pressureValue:$("#pressureValue"),pressureTrend:$("#pressureTrend"),biteStatus:$("#biteStatus"),lastUpdated:$("#lastUpdated"),locationStatus:$("#locationStatus"),locationStatusDot:$("#locationStatusDot"),pressureTrendLine:$("#pressureTrendLine"),refreshConditions:$("#refreshConditions"),connectionStatus:$("#connectionStatus"),recentCatches:$("#recentCatches"),openCatchLogger:$("#openCatchLogger"),bottomLogButton:$("#bottomLogButton"),bottomRefreshButton:$("#bottomRefreshButton"),catchLoggerModal:$("#catchLoggerModal"),closeCatchLogger:$("#closeCatchLogger"),cancelCatch:$("#cancelCatch"),catchForm:$("#catchForm"),catchWeight:$("#catchWeight"),increaseWeight:$("#increaseWeight"),decreaseWeight:$("#decreaseWeight"),catchLocation:$("#catchLocation"),useCatchLocation:$("#useCatchLocation"),fishActivity:$("#fishActivity"),fishMood:$("#fishMood"),tacticAdvice:$("#tacticAdvice"),activityReason:$("#activityReason"),lureFamily:$("#lureFamily"),lureReason:$("#lureReason"),targetZone:$("#targetZone"),habitatShift:$("#habitatShift"),biteWindows:$("#biteWindows"),speciesMatch:$("#speciesMatch"),speciesReason:$("#speciesReason"),confidenceScore:$("#confidenceScore"),confidenceText:$("#confidenceText"),patternAlert:$("#patternAlert"),patternReason:$("#patternReason"),primaryDecision:$("#primaryDecision"),decisionReason:$("#decisionReason")};

const state={lat:null,lon:null,pressure:null,trend:"steady",temp:null,wind:0,code:0,isDay:1,cloud:0,sunrise:null,sunset:null};
const weather={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Storms",99:"Severe storms"};
const inHg=(hpa)=>Number(hpa)*0.0295299830714;
const time=(d)=>d?d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"--";

function setStatus(text,kind=""){
  if(el.locationStatus) el.locationStatus.textContent=text;
  if(el.locationStatusDot){el.locationStatusDot.classList.remove("locked","error");if(kind)el.locationStatusDot.classList.add(kind);}
}
function setOnline(){if(el.connectionStatus)el.connectionStatus.textContent=navigator.onLine?"Online":"Offline";}
function useLocation(lat,lon,label){state.lat=lat;state.lon=lon;if(el.locationName)el.locationName.textContent=label;if(el.catchLocation)el.catchLocation.value=`${lat.toFixed(4)}, ${lon.toFixed(4)}`;loadConditions();}
function getLocation(){setStatus("Getting current location");if(!navigator.geolocation)return useLocation(FALLBACK.latitude,FALLBACK.longitude,FALLBACK.label);navigator.geolocation.getCurrentPosition(p=>{setStatus("Location connected","locked");useLocation(p.coords.latitude,p.coords.longitude,"Current location");},()=>{setStatus("GPS unavailable — using Carlyle Lake default","error");useLocation(FALLBACK.latitude,FALLBACK.longitude,FALLBACK.label);},{timeout:9000,maximumAge:300000});}

function draw(values){if(!el.pressureTrendLine||values.length<2)return;const min=Math.min(...values),max=Math.max(...values),range=max-min||0.01;const points=values.map((v,i)=>`${(i/(values.length-1)*720).toFixed(1)},${(60-(v-min)/range*50).toFixed(1)}`).join(" ");el.pressureTrendLine.setAttribute("points",points);}

function insights(){
  let score=55;
  if(state.trend==="falling_fast")score+=24;else if(state.trend==="falling")score+=16;else if(state.trend==="steady")score+=7;else if(state.trend==="rising")score-=6;else if(state.trend==="rising_fast")score-=14;
  if([2,3,51,53,55,61,63,80,81].includes(state.code))score+=7;
  if([95,96,99].includes(state.code))score-=20;
  if(state.wind>=4&&state.wind<=14)score+=6;else if(state.wind>22)score-=10;
  if(state.cloud>=35&&state.cloud<=85)score+=4;
  score=Math.max(20,Math.min(95,Math.round(score)));
  const mood=score>=80?"Feeding":score>=65?"Active":score<45?"Holding":"Neutral";
  const decision=score>=76?"GO":score>=58?"GO • ADJUST":"SELECTIVE";
  const reason=score>=76?"Conditions support an active search pattern right now.":score>=58?"Fishable window, but presentation and location matter.":"Expect a narrower bite. Fish high-percentage water deliberately.";
  let move="Repeat productive depth and cover until the pattern changes.",lure="Confidence bait + finesse",lureReason="Mixed conditions favor controlled presentations.",zone="Transitions + proven cover",habitat="Start where shallow cover meets the first meaningful depth change.",alert="HOLD PATTERN",alertReason="No major pressure shift detected.";
  if(state.trend.includes("falling")){move="Cover water first, then slow down where you contact fish.";lure="Moving bait → follow-up bait";lureReason="Falling pressure can increase roaming and feeding.";zone="Wind-blown edges + feeding lanes";habitat="Check points, flats near deeper water, shade lines, and active shoreline edges.";alert="EXPAND SEARCH";alertReason="Fish may roam farther from cover while pressure falls.";}
  if(state.trend.includes("rising")){move="Slow down and make repeated casts to tight cover and structure.";lure="Jig / worm / compact profile";lureReason="Rising pressure often rewards slower, precise presentations.";zone="Tight cover + first break";habitat="Prioritize docks, wood, vegetation edges, shade, drops, and isolated structure.";alert="TIGHTEN UP";alertReason="Fish may reposition tighter to secure cover.";}
  if(state.trend==="falling_fast"){alert="WINDOW OPENING";alertReason="Pressure is falling quickly. Test active fish before the trend changes.";}
  if(state.trend==="rising_fast"){alert="PATTERN SHIFT";alertReason="Pressure is rising quickly. Expect a meaningful repositioning.";}
  if(state.wind>15){zone="Protected structure";habitat="Use wind where manageable, but keep presentation control.";}
  if(state.isDay===0){lure="Dark silhouette / vibration";lureReason="Low light increases the value of contrast and vibration.";}
  const species=score>=70?(state.wind>=5?"Bass • Crappie":"Bass • Catfish"):(state.trend.includes("rising")?"Crappie • Bluegill":"Bass • Panfish");
  const am=state.sunrise?`${time(new Date(state.sunrise.getTime()-30*60000))}–${time(new Date(state.sunrise.getTime()+90*60000))}`:"--";
  const pm=state.sunset?`${time(new Date(state.sunset.getTime()-90*60000))}–${time(new Date(state.sunset.getTime()+30*60000))}`:"--";
  const windows=(state.trend.includes("falling")&&score>=70?"NOW • ":"")+`AM ${am} • PM ${pm}`;
  const set=(node,val)=>{if(node)node.textContent=val;};
  set(el.fishActivity,score);set(el.fishMood,mood);set(el.primaryDecision,decision);set(el.decisionReason,reason);set(el.tacticAdvice,move);set(el.activityReason,`${state.pressure?.toFixed(2)||"--"} inHg • ${state.trend.replace("_"," ")} • ${Math.round(state.wind)} mph wind`);set(el.lureFamily,lure);set(el.lureReason,lureReason);set(el.targetZone,zone);set(el.habitatShift,habitat);set(el.biteWindows,windows);set(el.speciesMatch,species);set(el.speciesReason,"Condition-based starting point, not a guarantee.");set(el.confidenceScore,90);set(el.confidenceText,"Based on live weather, pressure trend, wind, daylight, and location.");set(el.patternAlert,alert);set(el.patternReason,alertReason);
}

async function loadConditions(){
  if(state.lat===null)return getLocation();
  if(el.refreshConditions)el.refreshConditions.disabled=true;
  setStatus("Reading live conditions");
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(state.lat)}&longitude=${encodeURIComponent(state.lon)}&current=temperature_2m,weather_code,pressure_msl,wind_speed_10m,is_day,cloud_cover&hourly=pressure_msl&daily=sunrise,sunset&past_days=1&forecast_days=1&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const r=await fetch(url,{cache:"no-store"});const d=await r.json();if(!r.ok||!d.current)throw new Error("Live data unavailable");
    state.temp=Number(d.current.temperature_2m);state.code=Number(d.current.weather_code);state.wind=Number(d.current.wind_speed_10m||0);state.isDay=Number(d.current.is_day??1);state.cloud=Number(d.current.cloud_cover||0);state.pressure=inHg(d.current.pressure_msl);state.sunrise=d.daily?.sunrise?.[0]?new Date(d.daily.sunrise[0]):null;state.sunset=d.daily?.sunset?.[0]?new Date(d.daily.sunset[0]):null;
    if(el.airTemperature)el.airTemperature.textContent=`${Math.round(state.temp)}°`;if(el.weatherCondition)el.weatherCondition.textContent=weather[state.code]||"Current conditions";if(el.pressureValue)el.pressureValue.textContent=state.pressure.toFixed(2);
    const times=d.hourly?.time||[],vals=d.hourly?.pressure_msl||[];let idx=0,dist=Infinity;times.forEach((x,i)=>{const q=Math.abs(new Date(x).getTime()-Date.now());if(q<dist){dist=q;idx=i;}});const previous=inHg(vals[Math.max(0,idx-3)]),delta=state.pressure-previous;state.trend=delta<=-.12?"falling_fast":delta<=-.03?"falling":delta>=.12?"rising_fast":delta>=.03?"rising":"steady";
    const story={falling_fast:"Falling quickly — fish may become more willing to roam and feed.",falling:"Falling — often favorable for active fish.",steady:"Stable — pattern repetition matters more than chasing changes.",rising:"Rising — fish may tighten to cover or a narrower depth band.",rising_fast:"Rising quickly — expect meaningful repositioning."}[state.trend];if(el.pressureTrend)el.pressureTrend.textContent=story;
    if(el.biteStatus){el.biteStatus.textContent=state.trend.includes("falling")?"FAVORABLE":state.trend.includes("rising")?"ADJUST":"STABLE";}
    const series=[];for(let i=Math.max(0,idx-6);i<=idx&&i<vals.length;i++){const v=Number(vals[i]);if(Number.isFinite(v))series.push(inHg(v));}draw(series);insights();if(el.lastUpdated)el.lastUpdated.textContent=`Updated ${time(new Date())}`;setStatus("Live conditions connected","locked");
  }catch(err){console.error(err);if(el.pressureTrend)el.pressureTrend.textContent="Live conditions could not load. Check your connection and tap Refresh.";if(el.primaryDecision)el.primaryDecision.textContent="RETRY";if(el.decisionReason)el.decisionReason.textContent="Live data did not complete.";setStatus("Live data unavailable","error");}
  finally{if(el.refreshConditions)el.refreshConditions.disabled=false;}
}

const STORE="baitlogic-local-catches";
function catches(){try{return JSON.parse(localStorage.getItem(STORE)||"[]");}catch{return[];}}
function renderCatches(){const list=catches();if(!el.recentCatches)return;el.recentCatches.innerHTML=list.length?list.slice(0,8).map(c=>`<li><strong>${c.species}</strong>${c.weight?` — ${c.weight} lb`:""}${c.location?` · ${c.location}`:""}${c.notes?`<br><span>${c.notes}</span>`:""}</li>`).join(""):'<li class="catches-empty">No catches saved on this device yet.</li>';}
function logger(){const open=()=>{if(el.catchLoggerModal)el.catchLoggerModal.hidden=false;},close=()=>{if(el.catchLoggerModal)el.catchLoggerModal.hidden=true;};el.openCatchLogger?.addEventListener("click",open);el.bottomLogButton?.addEventListener("click",open);el.closeCatchLogger?.addEventListener("click",close);el.cancelCatch?.addEventListener("click",close);el.increaseWeight?.addEventListener("click",()=>el.catchWeight.value=(Number(el.catchWeight.value||0)+.5).toFixed(1));el.decreaseWeight?.addEventListener("click",()=>el.catchWeight.value=Math.max(0,Number(el.catchWeight.value||0)-.5).toFixed(1));el.useCatchLocation?.addEventListener("click",()=>{if(state.lat!==null)el.catchLocation.value=`${state.lat.toFixed(4)}, ${state.lon.toFixed(4)}`;});el.catchForm?.addEventListener("submit",e=>{e.preventDefault();const data=Object.fromEntries(new FormData(el.catchForm).entries());const list=catches();list.unshift({species:data.species||"Catch",weight:data.weight||"",location:data.location||"",notes:data.notes||"",saved:new Date().toISOString()});localStorage.setItem(STORE,JSON.stringify(list.slice(0,50)));el.catchForm.reset();renderCatches();close();});}

el.refreshConditions?.addEventListener("click",loadConditions);el.bottomRefreshButton?.addEventListener("click",loadConditions);window.addEventListener("online",setOnline);window.addEventListener("offline",setOnline);setOnline();logger();renderCatches();getLocation();
