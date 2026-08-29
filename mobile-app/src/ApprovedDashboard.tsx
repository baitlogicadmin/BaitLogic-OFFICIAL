import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ChevronRightIcon, Crosshair2Icon, EyeOpenIcon, GlobeIcon, HeartIcon } from "@radix-ui/react-icons";
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
  ["Why Barometric Pressure Matters","5 min read"],
  ["Reading Water Like a Pro","7 min read"],
  ["Campfire Cooking Made Simple","6 min read"],
  ["Fish IQ: What to Do Right Now","6 min read"],
];

export default function ApprovedDashboard(){
  const initial=readCache();
  const [online,setOnline]=useState(navigator.onLine);
  const [snapshot,setSnapshot]=useState<Snapshot|undefined>(initial);
  const [status,setStatus]=useState(initial?"cached":"loading");
  const [reports,setReports]=useState<FieldCheck[]>(()=>readFieldChecks());
  const [signupEmail,setSignupEmail]=useState("");
  const [signupState,setSignupState]=useState<"idle"|"submitting"|"success"|"error">("idle");
  const [signupMessage,setSignupMessage]=useState("");

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

  async function submitSignup(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const email=signupEmail.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){
      setSignupState("error");
      setSignupMessage("Enter a valid email address.");
      return;
    }
    if(!online){
      setSignupState("error");
      setSignupMessage("You’re offline. Reconnect to join the email list.");
      return;
    }
    setSignupState("submitting");
    setSignupMessage("Joining…");
    try{
      const response=await fetch("/api/signups",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data?.error || "Signup is temporarily unavailable.");
      setSignupState("success");
      setSignupMessage(data?.message || "You’re on the BaitLogic list.");
      setSignupEmail("");
    }catch(error){
      setSignupState("error");
      setSignupMessage(error instanceof Error ? error.message : "Signup is temporarily unavailable.");
    }
  }

  return <div className="approved-dashboard">
    <header className="bl-header">
      <a className="bl-brand" href="/" aria-label="BaitLogic Outdoors home">
        <img src="/assets/baitlogic-logo.png" alt="BaitLogic Outdoors" />
        <span className="brand-subline">Beyond the Bite. Powered by People and Purpose.</span>
      </a>
      <nav aria-label="Primary">
        <a className="active" href="/">HOME</a>
        <a href="/barometer.html">BAROMETER</a>
        <a href="#field-checks">CATCHES</a>
        <a href="/field-intel.html#field-check">FIELD CHECKS</a>
        <a href="#learn">LEARN</a>
        <a href="#more">MORE</a>
      </nav>
      <button className="location-chip" type="button" onClick={()=>location.reload()}>
        <Crosshair2Icon/><span><strong>{place}{region?", "+region:""}</strong><small>Change Location</small></span>
      </button>
    </header>

    <main>
      <section className="hero-zone">
        <div className="hero-copy-panel">
          <h1>BEYOND THE BITE.<br/><em>PROTECT WHAT MATTERS.</em></h1>
          <p>Real-time outdoor intelligence, community reports, and conservation in action.</p>
          <div className="hero-actions">
            <a className="action fishing-action" href="/barometer.html"><span className="action-icon">☀</span><span><strong>FISHING INTELLIGENCE</strong><small>Conditions, Patterns & Reports</small></span></a>
            <a className="action camping-action" href="#learn"><span className="action-icon">△</span><span><strong>CAMPING EDUCATION</strong><small>Skills, Gear & Know-How</small></span></a>
          </div>
          <div className="trust-row">
            <span>♡ <b>ALWAYS FREE</b><small>No paywalls. Ever.</small></span>
            <span>♧ <b>COMMUNITY FIRST</b><small>Real people. Real reports.</small></span>
            <span>♧ <b>CONSERVATION DRIVEN</b><small>Healthy waters. Stronger future.</small></span>
            <span>⌖ <b>LOCAL FOCUSED</b><small>{place}{region?", "+region:""} & surrounding areas.</small></span>
          </div>
        </div>

        <section className="conditions-card" aria-label="Local conditions">
          <div className="conditions-title">
            <strong>LOCAL CONDITIONS</strong>
            <span className={online && status==="live"?"live":"cached"}>{online&&status==="live"?"● LIVE":"● OFFLINE / CACHED"}</span>
          </div>
          <div className="conditions-metrics">
            <div className="pressure"><span>BAROMETRIC<br/>PRESSURE</span><strong>{w?w.pressureInHg.toFixed(2):"—"}</strong><small>inHg</small><b>↓ {pressureTrend}</b></div>
            <div><span>TEMPERATURE</span><strong>{w?Math.round(w.temperatureF):"—"}<small>°F</small></strong><small className="water-reading">💧 Water: {w?Math.round(w.temperatureF-2):"—"}°F</small></div>
            <div><span>WIND</span><strong>{w?Math.round(w.windMph):"—"}<small> mph</small></strong><small>{w?compass(w.windDirection):"—"}</small></div>
            <div><span>CLOUD COVER</span><strong>{w?Math.round(w.cloudCover):"—"}<small>%</small></strong><small>☁</small></div>
          </div>
          <a className="full-barometer" href="/barometer.html">VIEW FULL BAROMETER <ChevronRightIcon/></a>
        </section>
      </section>

      <section className="pillar-grid">
        <a className="pillar fishing" href="/barometer.html"><EyeOpenIcon/><h2>FISHING<br/>INTELLIGENCE</h2><p>Live conditions, patterns, forecasts & proven tactics.</p><span>CHECK THE INTEL →</span></a>
        <a className="pillar camping" href="#learn"><div className="camp-icon">△</div><h2>CAMPING<br/>EDUCATION</h2><p>Skills, gear guides, and backwoods know-how.</p><span>START LEARNING →</span></a>
        <a className="pillar water" href="/field-intel.html#water"><GlobeIcon/><h2>WATER &<br/>ENVIRONMENT</h2><p>Water levels, quality, habitat, wildlife & ecosystem health.</p><span>EXPLORE THE DATA →</span></a>
        <article className="pillar conservation" id="official-reporting"><HeartIcon/><h2>CONSERVATION<br/>ACTION</h2><p>Report issues directly to the appropriate state conservation agency.</p><div className="official-report-links"><a href="https://dnr.illinois.gov/lawenforcement/target-poachers.html" target="_blank" rel="noreferrer">ILLINOIS — IDNR REPORT →</a><a href="https://mdc12.mdc.mo.gov/Applications/FishKillsIntake/Intake" target="_blank" rel="noreferrer">MISSOURI — MDC REPORT →</a></div></article>
      </section>

      <section className="lower-grid">
        <section className="learn-strip" id="learn">
          <div className="learn-heading"><strong>▱ LEARN SOMETHING NEW</strong><a href="/field-intel.html#intelligence">VIEW ALL LESSONS →</a></div>
          <div className="lesson-grid">
            {lessons.map(([title,time],i)=><article key={title}>
              <img src={i===0?"/assets/app-icon-192.png":i===1?"/assets/water-pulse.png":i===2?"/assets/hero-observer.png":"/assets/habitat-restoration.png"} alt="" />
              <div><strong>{title}</strong><small>◷ {time}</small></div>
            </article>)}
          </div>
        </section>

        <article className="community-panel" id="field-checks">
          <header><strong>LATEST COMMUNITY REPORTS</strong><a href="/field-intel.html#field-check">VIEW ALL →</a></header>
          <div className="community-body">
            {latestReports.length?latestReports.map(r=><div className="report-row" key={r.id}><span>◉ {r.note}</span><small>{r.place}</small></div>):<div className="empty-community"><strong>No community reports yet.</strong><span>Be the first to add a local Field Check.</span></div>}
          </div>
          <a className="community-cta" href="/field-intel.html#field-check">ADD A FIELD CHECK ＋</a>
        </article>

        <article className="impact-card">
          <h3>♢ MAKE AN IMPACT</h3>
          <p>Small actions create big change. Report issues and help protect our waters.</p>
          <div className="impact-report-links"><a href="https://dnr.illinois.gov/lawenforcement/target-poachers.html" target="_blank" rel="noreferrer">ILLINOIS — IDNR →</a><a href="https://mdc12.mdc.mo.gov/Applications/FishKillsIntake/Intake" target="_blank" rel="noreferrer">MISSOURI — MDC →</a></div>
        </article>
      </section>

      <section className="connect-row" id="more">
        <article className="stay-connected">
          <div><strong>✉ STAY CONNECTED</strong><span>Get local updates, community highlights, and conservation calls to action.</span></div>
          <form onSubmit={submitSignup}>
            <input type="email" name="email" autoComplete="email" value={signupEmail} onChange={e=>setSignupEmail(e.target.value)} placeholder="Email address" aria-label="Email address" required/>
            <button type="submit" disabled={signupState==="submitting"}>{signupState==="submitting"?"JOINING…":"SIGN ME UP! →"}</button>
          </form>
          <small aria-live="polite">{signupMessage || "No spam. Unsubscribe anytime."}</small>
        </article>
        <article className="join-community">
          <strong>♧ JOIN THE COMMUNITY!</strong>
          <span>Connect, share, learn, and make a difference together.</span>
          <a href="https://www.facebook.com/baitlogic" target="_blank" rel="noreferrer">f</a>
        </article>
      </section>
    </main>

    <footer className="bl-footer">
      <img src="/assets/baitlogic-logo.png" alt="BaitLogic Outdoors"/>
      <div><strong>♡ ALWAYS FREE</strong><span>No catch.</span></div>
      <div><strong>♧ COMMUNITY FIRST</strong><span>People over profit.</span></div>
      <div><strong>⌖ LOCAL FOCUSED</strong><span>{place}{region?", "+region:""} & surrounding areas.</span></div>
      <div><strong>♧ CONSERVATION DRIVEN</strong><span>Healthy waters. Stronger future.</span></div>
    </footer>

    <nav className="mobile-nav" aria-label="Mobile navigation">
      <a href="/" aria-label="Home"><span>⌂</span><b>HOME</b></a>
      <a href="/barometer.html" aria-label="Barometer"><span>◉</span><b>BAROMETER</b></a>
      <a href="/field-intel.html#field-check" aria-label="Add a Field Check"><span>＋</span><b>FIELD CHECK</b></a>
      <a href="#learn" aria-label="Learn"><span>▱</span><b>LEARN</b></a>
      <a href="#official-reporting" aria-label="Official reporting"><span>♡</span><b>PROTECT</b></a>
    </nav>
  </div>
}
