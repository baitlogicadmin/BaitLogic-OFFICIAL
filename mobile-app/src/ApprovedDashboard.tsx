import { useEffect, useMemo, useState } from "react";
import { ChevronRightIcon, Crosshair2Icon, EyeOpenIcon, GlobeIcon, HeartIcon, PersonIcon } from "@radix-ui/react-icons";
import { readFieldChecks, type FieldCheck } from "./data/baitlogicData";

type Snapshot = {
  updatedAt: string;
  location: { name: string; locality?: string; region?: string } | null;
  weather: {
    temperatureF: number;
    pressureInHg: number;
    pressureDelta3h: number;
    windMph: number;
    windDirection: number;
    cloudCover: number;
  };
};

const CACHE_KEY = "baitlogic-approved-dashboard-conditions-v1";

function compass(deg:number){
  const p=["N","NE","E","SE","S","SW","W","NW"];
  return p[Math.round((((deg%360)+360)%360)/45)%8];
}
function trend(delta:number){
  if(delta<=-.06) return "FALLING FAST";
  if(delta<-.02) return "FALLING";
  if(delta>=.06) return "RISING FAST";
  if(delta>.02) return "RISING";
  return "STEADY";
}
function readCache():Snapshot|undefined{
  try{
    const value=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    return value?.weather && Number.isFinite(Number(value.weather.pressureInHg)) ? value : undefined;
  }catch{return undefined}
}

const lessons=[
  ["Why Barometric Pressure Matters","How pressure changes affect fish behavior and feeding.","5 min read"],
  ["Reading Water Like a Pro","Understand structure, seasonal movement, and how fish use habitat.","7 min read"],
  ["Streamflow 101","What flow means, why it changes, and how it impacts fishing.","6 min read"],
  ["Fish Kill: What to Do","How to recognize a fish kill, what to report, and what information helps.","4 min read"],
  ["Beginner’s Guide to Lure Selection","Simple tips to match conditions and catch more fish.","6 min read"],
];

export default function ApprovedDashboard(){
  const initial=readCache();
  const [online,setOnline]=useState(navigator.onLine);
  const [snapshot,setSnapshot]=useState<Snapshot|undefined>(initial);
  const [status,setStatus]=useState(initial?"cached":"loading");
  const [reports,setReports]=useState<FieldCheck[]>(()=>readFieldChecks());

  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)};
  },[]);

  useEffect(()=>{
    if(!online){setStatus(snapshot?"cached":"offline");return}
    if(!navigator.geolocation){setStatus(snapshot?"cached":"error");return}
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const url="/api/barometer-snapshot?lat="+encodeURIComponent(pos.coords.latitude)+"&lon="+encodeURIComponent(pos.coords.longitude);
        const r=await fetch(url,{cache:"no-store"});
        const d=await r.json();
        if(!r.ok || !d?.weather) throw new Error();
        localStorage.setItem(CACHE_KEY,JSON.stringify(d));
        setSnapshot(d); setStatus("live");
      }catch{setStatus(snapshot?"cached":"error")}
    },()=>setStatus(snapshot?"cached":"error"),{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  },[online]);

  useEffect(()=>{setReports(readFieldChecks())},[online]);

  const w=snapshot?.weather;
  const place=snapshot?.location?.locality || snapshot?.location?.name?.split(",")[0] || "Your Area";
  const region=(snapshot?.location?.region || "").replace("Illinois","IL").replace("Missouri","MO");
  const pressureTrend=trend(w?.pressureDelta3h ?? 0);
  const latestReports=useMemo(()=>reports.slice(0,3),[reports]);

  return <div className="approved-dashboard">
    <header className="bl-header">
      <a className="bl-brand" href="/" aria-label="BaitLogic Outdoors home">
        <img src="/assets/baitlogic-logo.png" alt="BaitLogic Outdoors" />
        <span>Beyond The Bite. Protect What Matters.</span>
      </a>
      <nav aria-label="Primary">
        <a className="active" href="/">HOME</a><a href="/barometer.html">BAROMETER</a><a href="#catches">CATCHES</a><a href="#field-checks">FIELD CHECKS</a><a href="#learn">LEARN</a><a href="#community">COMMUNITY</a><a href="#conservation">CONSERVATION</a>
      </nav>
      <button className="location-chip" type="button" onClick={()=>location.reload()}>
        <Crosshair2Icon/><span><strong>{place}{region?", "+region:""}</strong><small>Change Location</small></span>
      </button>
    </header>

    <main>
      <section className="hero-zone">
        <div className="hero-copy-panel">
          <h1>LOCAL INTELLIGENCE.<br/>REAL PEOPLE.<br/><em>STRONGER TOGETHER.</em></h1>
          <p>Real-time conditions, community knowledge, and conservation action—so we can enjoy the outdoors today and protect it for tomorrow.</p>
          <div className="hero-actions">
            <a className="action teal" href="/barometer.html">☀ <span><strong>CHECK CONDITIONS</strong><small>Live Weather & Water</small></span></a>
            <a className="action gold" href="#conservation">♢ <span><strong>REPORT A CONCERN</strong><small>See Something, Say Something</small></span></a>
          </div>
          <div className="trust-row"><span>♡ Always Free</span><span>♧ Community Powered</span><span>♧ Conservation Focused</span><span>◈ Woman-Owned</span></div>
        </div>

        <section className="conditions-card" aria-label="Local conditions">
          <div className="conditions-title">
            <div><strong>⌖ LOCAL CONDITIONS</strong><small>{place}{region?", "+region:""}</small></div>
            <span className={online && status==="live"?"live":"cached"}>{online&&status==="live"?"● LIVE":"● OFFLINE / CACHED"}</span>
          </div>
          <div className="conditions-metrics">
            <div className="pressure"><span>BAROMETRIC<br/>PRESSURE</span><strong>{w?w.pressureInHg.toFixed(2):"—"}</strong><small>inHg</small><b>{pressureTrend}</b></div>
            <div><span>TEMPERATURE</span><strong>{w?Math.round(w.temperatureF):"—"}<small>°F</small></strong></div>
            <div><span>WIND</span><strong>{w?Math.round(w.windMph):"—"}<small> mph</small></strong><small>{w?compass(w.windDirection):"—"}</small></div>
            <div><span>CLOUD COVER</span><strong>{w?Math.round(w.cloudCover):"—"}<small>%</small></strong></div>
          </div>
          <div className="why"><span>WHY THIS MATTERS</span><p>{w ? pressureTrend.toLowerCase()+" pressure is one signal anglers can combine with wind, temperature and water conditions before choosing a presentation." : "Verified local conditions will appear here when location data is available."}</p></div>
          <a className="full-barometer" href="/barometer.html">VIEW FULL BAROMETER <ChevronRightIcon/></a>
        </section>
      </section>

      <section className="pillar-grid">
        <a className="pillar fishing" href="/barometer.html"><EyeOpenIcon/><h2>FISHING<br/>INTELLIGENCE</h2><p>Conditions, patterns, forecasts & proven tactics.</p><span>Check the Intel →</span></a>
        <a className="pillar community" id="community" href="#community"><PersonIcon/><h2>COMMUNITY<br/>KNOWLEDGE</h2><p>Real reports, local insight, from people like you.</p><span>See What’s Happening →</span></a>
        <a className="pillar water" href="/field-intel.html#water"><GlobeIcon/><h2>WATER &<br/>ENVIRONMENT</h2><p>Water levels, quality, habitat, wildlife & ecosystem health.</p><span>Explore the Data →</span></a>
        <a className="pillar conservation" id="conservation" href="/field-intel.html#conservation"><HeartIcon/><h2>CONSERVATION<br/>ACTION</h2><p>Report issues, protect habitat and help keep our waters healthy.</p><span>Make a Difference →</span></a>
      </section>

      <section className="learn-strip" id="learn">
        <div className="learn-heading"><strong>🎓 LEARN SOMETHING NEW</strong><span>Knowledge today. Better tomorrow.</span><a href="/field-intel.html">VIEW ALL LESSONS →</a></div>
        <div className="lesson-grid">
          {lessons.map(([title,body,time],i)=><article key={title}><img src={i===1?"/assets/water-pulse.png":i===2?"/assets/habitat-restoration.png":"/assets/hero-observer.png"} alt="" /><div><strong>{title}</strong><p>{body}</p><small>◷ {time}</small></div></article>)}
          <a className="learn-cta" href="/field-intel.html"><strong>▤<br/>BAITLOGIC<br/>LEARN</strong><span>Your library for fishing, water, wildlife, habitat and conservation.</span><b>EXPLORE LEARN →</b></a>
        </div>
      </section>

      <section className="utility-grid">
        <article className="utility-card" id="field-checks"><header><strong>LATEST COMMUNITY REPORTS</strong><a href="#community">View All →</a></header>
          <div className="rows">{latestReports.length?latestReports.map(r=><div key={r.id}><span>◉ {r.note}</span><small>{r.place}</small></div>):<div><span>No verified community reports yet.</span><small>Be the first to add one.</small></div>}</div>
          <a className="utility-action" href="/field-intel.html#field-check">ADD A FIELD CHECK ＋</a>
        </article>

        <article className="utility-card" id="catches"><header><strong>RECENT CATCHES</strong><a href="/barometer.html">View All →</a></header>
          <div className="rows"><div><span>Verified catches appear here when available.</span><small>No sample catches are fabricated.</small></div></div>
          <a className="utility-action" href="/barometer.html">LOG YOUR CATCH 〰</a>
        </article>

        <article className="utility-card conservation-mini"><header><strong>CONSERVATION SPOTLIGHT</strong><a href="/field-intel.html#conservation">View All →</a></header>
          <h3>Keep Our Waters Clean</h3><p>Small actions make a big impact. Properly dispose of line, lead and litter.</p>
          <ul><li>Pick up trash</li><li>Dispose of line properly</li><li>Never dump chemicals</li><li>Report pollution</li></ul>
          <a className="utility-action" href="/field-intel.html#conservation">REPORT A CONCERN ♢</a>
        </article>

        <article className="utility-card connect"><h3>Stay Connected!</h3><p>Get local conditions, community highlights, and conservation updates that matter—straight to your inbox.</p><form onSubmit={e=>e.preventDefault()}><input type="email" placeholder="Email address"/><button>SIGN ME UP!</button></form><small>No spam. Unsubscribe anytime.</small></article>

        <article className="utility-card join"><h3>JOIN THE COMMUNITY!</h3><p>Follow BaitLogic on Facebook and Instagram.</p><a href="https://www.facebook.com/share/1C3i4dL3vk/" target="_blank" rel="noreferrer">Open Facebook →</a><a href="https://www.instagram.com/baitlogicadmin?igsh=MTVuOHV2dDljaTd3Yg==" target="_blank" rel="noreferrer">Open Instagram →</a></article>
      </section>
    </main>

    <footer className="bl-footer">
      <img src="/assets/baitlogic-logo.png" alt="BaitLogic Outdoors"/>
      <div><strong>♡ Always Free</strong><span>No paywalls. Ever.</span></div>
      <div><strong>♧ Community First</strong><span>Built by people like you.</span></div>
      <div><strong>⌖ Local Focused</strong><span>Southern Illinois & St. Louis Metro East</span></div>
      <div><strong>♧ Conservation Driven</strong><span>Protect what we all love to enjoy.</span></div>
      <div className="footer-links"><a href="https://www.facebook.com/share/1C3i4dL3vk/" target="_blank" rel="noreferrer">f</a><a href="https://www.instagram.com/baitlogicadmin?igsh=MTVuOHV2dDljaTd3Yg==" target="_blank" rel="noreferrer">◎</a></div>
    </footer>
    <div className="copyright">© 2026 BaitLogic Outdoors · About · Contact · Privacy · Terms</div>
  </div>
