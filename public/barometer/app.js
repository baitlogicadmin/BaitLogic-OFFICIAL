"use strict";

const PRESSURE_FUNCTION_URL = "https://khhishscjirjxhsulniq.supabase.co/functions/v1/quick-processor";
const FALLBACK_LOCATION = { latitude: 38.6189, longitude: -89.3529, label: "Carlyle Lake (default)" };

const state = {
  latitude: null,
  longitude: null,
  loading: false,
  locationMessage: "Getting current conditions",
  deferredInstallPrompt: null,
  pressureController: null
};
const $ = (selector) => document.querySelector(selector);
const elements = {
  airTemperature: $("#airTemperature"), weatherCondition: $("#weatherCondition"), locationName: $("#locationName"),
  pressureValue: $("#pressureValue"), pressureTrend: $("#pressureTrend"), pressureNeedle: $("#pressureNeedle"),
  biteStatus: $("#biteStatus"), lastUpdated: $("#lastUpdated"), locationStatus: $("#locationStatus"),
  locationStatusDot: $("#locationStatusDot"), pressureTrendLine: $("#pressureTrendLine"), refreshConditions: $("#refreshConditions"),
  pressureDialButton: $("#pressureDialButton"), recentCatches: $("#recentCatches"), connectionStatus: $("#connectionStatus"),
  installButton: $("#installButton"), catchLoggerModal: $("#catchLoggerModal"), openCatchLogger: $("#openCatchLogger"),
  closeCatchLogger: $("#closeCatchLogger"), bottomLogButton: $("#bottomLogButton"), bottomRefreshButton: $("#bottomRefreshButton"),
  cancelCatch: $("#cancelCatch"), catchForm: $("#catchForm"), speciesSelector: $("#speciesSelector"), catchWeight: $("#catchWeight"),
  increaseWeight: $("#increaseWeight"), decreaseWeight: $("#decreaseWeight"), catchLocation: $("#catchLocation"),
  useCatchLocation: $("#useCatchLocation"), catchNotes: $("#catchNotes")
};

const weatherDescriptions = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Storms",99:"Severe storms"};
const trendMeta = {
  falling_fast:{badge:"PRIME BITE",cls:"good",angle:-80}, falling:{badge:"GOOD",cls:"good",angle:-35},
  steady:{badge:"STEADY",cls:"",angle:0}, rising:{badge:"FAIR",cls:"",angle:35}, rising_fast:{badge:"TOUGH",cls:"bad",angle:80}
};

function setConnectionStatus(){ if(elements.connectionStatus) elements.connectionStatus.textContent = navigator.onLine ? "Online" : "Offline mode"; }
function setLocationMessage(message, className=""){
  state.locationMessage=message;
  elements.locationStatus.textContent=message;
  elements.locationStatusDot.classList.remove("locked","error");
  if(className) elements.locationStatusDot.classList.add(className);
}
function setLoading(on){
  state.loading=on;
  if(elements.refreshConditions) elements.refreshConditions.disabled=on;
  if(on){
    elements.weatherCondition.textContent="Updating";
    elements.locationStatus.textContent="Getting current conditions";
  }else{
    elements.locationStatus.textContent=state.locationMessage;
  }
}
function useLocation(latitude, longitude, label){
  state.latitude=latitude;
  state.longitude=longitude;
  elements.locationName.textContent=label;
  elements.catchLocation.value=`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  loadConditions();
}
function getLocation(){
  setLoading(true);
  if(!navigator.geolocation){
    setLocationMessage("Location unavailable — showing Carlyle Lake","error");
    useLocation(FALLBACK_LOCATION.latitude,FALLBACK_LOCATION.longitude,FALLBACK_LOCATION.label);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    p=>{
      setLocationMessage("Location connected","locked");
      useLocation(p.coords.latitude,p.coords.longitude,"Current location");
    },
    ()=>{
      setLocationMessage("Location unavailable — showing Carlyle Lake","error");
      useLocation(FALLBACK_LOCATION.latitude,FALLBACK_LOCATION.longitude,FALLBACK_LOCATION.label);
    },
    {timeout:10000,maximumAge:300000}
  );
}

async function loadConditions(){
  if(state.loading && state.latitude===null) return;
  if(state.latitude===null) return getLocation();
  setLoading(true);
  const [pressureResult] = await Promise.allSettled([loadPressure(),loadWeather()]);
  if(pressureResult.status === "fulfilled" && pressureResult.value === true){
    elements.lastUpdated.textContent=`Updated ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
  }else{
    elements.lastUpdated.textContent="Update failed — showing last known data";
  }
  setLoading(false);
}

async function loadPressure(){
  if(state.pressureController) state.pressureController.abort();
  state.pressureController=new AbortController();
  try{
    const response=await fetch(`${PRESSURE_FUNCTION_URL}?lat=${encodeURIComponent(state.latitude)}&lon=${encodeURIComponent(state.longitude)}`,{signal:state.pressureController.signal});
    const data=await response.json();
    if(!response.ok || !data.latest) throw new Error(data.error || "Pressure data unavailable");
    const pressure=Number(data.latest.pressureInHg);
    elements.pressureValue.textContent=Number.isFinite(pressure)?pressure.toFixed(2):"--.--";
    elements.locationName.textContent=data.station?.name || elements.locationName.textContent;
    elements.pressureTrend.textContent=data.guidance || "Current pressure loaded";
    const meta=trendMeta[data.trend] || trendMeta.steady;
    elements.biteStatus.textContent=meta.badge;
    elements.biteStatus.className=`status-pill ${meta.cls}`.trim();
    elements.pressureNeedle.style.transform=`translateX(-50%) rotate(${meta.angle}deg)`;
    if(Array.isArray(data.series)&&data.series.length>1) drawTrendLine(data.series);
    return true;
  }catch(error){
    if(error.name==="AbortError") return false;
    elements.pressureTrend.textContent="Pressure data unavailable — last reading may be stale";
    elements.biteStatus.textContent="STALE";
    elements.biteStatus.className="status-pill bad";
    return false;
  }
}

function drawTrendLine(series){ const values=series.map(p=>Number(p.pressureInHg)).filter(Number.isFinite); if(values.length<2)return; const min=Math.min(...values),max=Math.max(...values),range=max-min||0.01; const points=values.map((v,i)=>`${((i/(values.length-1))*720).toFixed(1)},${(60-((v-min)/range)*50).toFixed(1)}`).join(" "); elements.pressureTrendLine.setAttribute("points",points); }

async function loadWeather(){
  try{
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`);
    const data=await response.json();
    if(!response.ok||!data.current) throw new Error();
    elements.airTemperature.textContent=`${Math.round(data.current.temperature_2m)}°`;
    elements.weatherCondition.textContent=weatherDescriptions[data.current.weather_code]||"Current conditions";
    return true;
  }catch{
    elements.airTemperature.textContent="--°";
    elements.weatherCondition.textContent="Weather unavailable";
    return false;
  }
}

function escapeHtml(value){ return String(value||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function loadRecentCatches(){ try{ const response=await fetch("/api/catches"); if(!response.ok)throw new Error(); const data=await response.json(); const catches=Array.isArray(data.catches)?data.catches:[]; elements.recentCatches.innerHTML=catches.length?catches.slice(0,8).map(c=>`<li><strong>${escapeHtml(c.species)}</strong>${c.weight?` — ${escapeHtml(c.weight)} lb`:""}${c.location?` · ${escapeHtml(c.location)}`:""}${c.notes?`<br><span>${escapeHtml(c.notes)}</span>`:""}</li>`).join(""):'<li class="catches-empty">No catches logged yet — be the first.</li>'; }catch{ elements.recentCatches.innerHTML='<li class="catches-empty">Catch logging is temporarily unavailable.</li>'; } }

function setupCatchLogger(){
  const open=()=>{elements.catchLoggerModal.hidden=false;}; const close=()=>{elements.catchLoggerModal.hidden=true;};
  elements.openCatchLogger.addEventListener("click",open); elements.bottomLogButton.addEventListener("click",open); elements.closeCatchLogger.addEventListener("click",close); elements.cancelCatch.addEventListener("click",close);
  elements.increaseWeight.addEventListener("click",()=>elements.catchWeight.value=(Number(elements.catchWeight.value||0)+0.5).toFixed(1));
  elements.decreaseWeight.addEventListener("click",()=>elements.catchWeight.value=Math.max(0,Number(elements.catchWeight.value||0)-0.5).toFixed(1));
  elements.useCatchLocation.addEventListener("click",()=>{ if(state.latitude!==null) elements.catchLocation.value=`${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}`; });
  elements.catchForm.addEventListener("submit",async event=>{ event.preventDefault(); const submit=elements.catchForm.querySelector("button[type='submit']"); submit.disabled=true; submit.textContent="Saving..."; try{ const response=await fetch("/api/catches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({species:elements.speciesSelector.value,weight:elements.catchWeight.value,location:elements.catchLocation.value,notes:elements.catchNotes.value})}); const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||"Could not save catch"); elements.catchForm.reset(); close(); await loadRecentCatches(); }catch(error){ alert(error.message); }finally{ submit.disabled=false; submit.textContent="Save Catch"; } });
}

function setupInstall(){ window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();state.deferredInstallPrompt=event;elements.installButton.hidden=false;}); elements.installButton.addEventListener("click",async()=>{if(!state.deferredInstallPrompt)return;state.deferredInstallPrompt.prompt();await state.deferredInstallPrompt.userChoice;state.deferredInstallPrompt=null;elements.installButton.hidden=true;}); }
function registerServiceWorker(){ if("serviceWorker" in navigator) navigator.serviceWorker.register("/barometer/sw.js",{scope:"/"}).catch(console.warn); }

document.addEventListener("DOMContentLoaded",()=>{
  setConnectionStatus(); window.addEventListener("online",setConnectionStatus); window.addEventListener("offline",setConnectionStatus);
  elements.pressureDialButton.addEventListener("click",loadConditions); elements.refreshConditions.addEventListener("click",loadConditions); elements.bottomRefreshButton.addEventListener("click",loadConditions);
  setupCatchLogger(); setupInstall(); registerServiceWorker(); loadRecentCatches(); getLocation(); setInterval(loadConditions,10*60*1000);
});
