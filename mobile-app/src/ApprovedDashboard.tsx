import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ActivityLogIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Crosshair2Icon,
  DashboardIcon,
  EnvelopeClosedIcon,
  EyeOpenIcon,
  GlobeIcon,
  HeartIcon,
  HomeIcon,
  LapTimerIcon,
  PersonIcon,
  ReaderIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { readFieldChecks, type FieldCheck } from "./data/baitlogicData";
import TurnstileWidget from "./TurnstileWidget";

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
const LAST_LOCATION_KEY = "baitlogic-last-location-v1";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || "";
const FACEBOOK_URL = "https://www.facebook.com/share/1C3i4dL3vk/";
const IDNR_REPORT_URL = "https://dnr2.illinois.gov/OLETIPHotline/";
const MDC_REPORT_URL = "https://mdc12.mdc.mo.gov/Applications/FishKillsIntake/Intake";

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
  ["Camping Weather Safety","5 min read"],
  ["Hiking Preparedness Checklist","6 min read"],
  ["Fish Kill: What to Document","4 min read"],
  ["Leave No Trace Near Water","5 min read"],
  ["Trail Navigation Without Service","7 min read"],
  ["Wildlife Encounters: Stay Safe","6 min read"],
];
const lessonImages=[
  "/assets/approved-pressure.webp",
  "/assets/hero-sunset.webp",
  "/assets/pillar-camping.webp",
  "/assets/pillar-fishing.webp",
  "/assets/approved-fish-kill.webp",
  "/assets/pillar-conservation.webp",
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
  const [captchaToken,setCaptchaToken]=useState("");
  const [captchaReset,setCaptchaReset]=useState(0);
  const receiveCaptchaToken=useCallback((token:string)=>setCaptchaToken(token),[]);

  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)};
  },[]);

  useEffect(()=>{
    let active=true;
    function useFallback(failure:"offline"|"error"){
      if(!active)return;
      const cached=readCache();
      if(cached)setSnapshot(cached);
      setStatus(cached?"cached":failure);
    }
    function refresh(){
      if(!online){useFallback("offline");return}
      if(!navigator.geolocation){useFallback("error");return}
      setStatus("loading");
      navigator.geolocation.getCurrentPosition(async pos=>{
        try{
          const url="/api/barometer-snapshot?lat="+encodeURIComponent(pos.coords.latitude)+"&lon="+encodeURIComponent(pos.coords.longitude);
          const r=await fetch(url,{cache:"no-store"});
          const d=await r.json();
          if(!r.ok || !d?.weather)throw new Error();
          if(!active)return;
          localStorage.setItem(CACHE_KEY,JSON.stringify(d));
          localStorage.setItem(LAST_LOCATION_KEY,JSON.stringify({
            savedAt:Date.now(),
            lat:pos.coords.latitude,
            lon:pos.coords.longitude,
            accuracy:pos.coords.accuracy,
          }));
          setSnapshot(d);setStatus("live");
        }catch{useFallback("error")}
      },()=>useFallback("error"),{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
    }
    refresh();
    const hourly=window.setInterval(refresh,60*60*1000);
    return()=>{active=false;window.clearInterval(hourly)};
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
    if(!TURNSTILE_SITE_KEY){
      setSignupState("error");
      setSignupMessage("Signup verification is temporarily unavailable.");
      return;
    }
    if(!captchaToken){
      setSignupState("error");
      setSignupMessage("Complete the security check and try again.");
      return;
    }
    setSignupState("submitting");
    setSignupMessage("Joining…");
    try{
      const response=await fetch("/api/signups",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,captcha_token:captchaToken}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data?.error || "Signup is temporarily unavailable.");
      setSignupState("success");
      setSignupMessage(data?.message || "You’re on the BaitLogic list.");
      setSignupEmail("");
      setCaptchaToken("");setCaptchaReset(value=>value+1);
    }catch(error){
      setSignupState("error");
      setSignupMessage(error instanceof Error ? error.message : "Signup is temporarily unavailable.");
      setCaptchaToken("");setCaptchaReset(value=>value+1);
    }
  }

  return <div className="approved-dashboard">
    <header className="bl-header">
      <a className="bl-brand" href="/" aria-label="BaitLogic Outdoors home">
        <img src="/assets/baitlogic-lockup.webp" alt="BaitLogic Outdoors" />
        <span className="brand-subline">Beyond the Bite. Protect What Matters.</span>
      </a>
      <nav aria-label="Primary">
        <a className="active" href="/">HOME</a>
        <a href="/barometer.html">BAROMETER</a>
        <a href="#field-checks">CATCHES</a>
        <a href="#field-checks">FIELD CHECKS</a>
        <a href="#learn">LEARN</a>
        <a href="#more">MORE</a>
      </nav>
      <button className="location-chip" type="button" onClick={()=>location.reload()}>
        <Crosshair2Icon/><span><strong>{place}{region?", "+region:""}</strong><small>Change Location</small></span><ChevronDownIcon/>
      </button>
    </header>

    <main>
      <section className="hero-zone">
        <div className="hero-copy-panel">
          <h1>BEYOND THE BITE.<br/><em>PROTECT WHAT MATTERS.</em></h1>
          <p>Real-time outdoor intelligence, community reports, and conservation in action.</p>
          <div className="hero-actions">
            <a className="action fishing-action" href="/barometer.html"><SunIcon/><span><strong>FISHING INTELLIGENCE</strong><small>Conditions, Patterns & Reports</small></span></a>
            <a className="action camping-action" href="#learn"><HomeIcon/><span><strong>CAMPING EDUCATION</strong><small>Skills, Gear & Know-How</small></span></a>
          </div>
          <div className="trust-row">
            <span><HeartIcon/><b>ALWAYS FREE</b><small>No paywalls. Ever.</small></span>
            <span><PersonIcon/><b>COMMUNITY FIRST</b><small>Real people. Real impact.</small></span>
            <span><HeartIcon/><b>CONSERVATION DRIVEN</b><small>Stronger habitats. Stronger future.</small></span>
            <span><Crosshair2Icon/><b>LOCAL FOCUSED</b><small>{place}{region?", "+region:""} & surrounding areas.</small></span>
          </div>
        </div>

        <section className="conditions-card" aria-label="Local conditions">
          <div className="conditions-title">
            <strong>LOCAL CONDITIONS</strong>
            <span className={online && status==="live"?"live":"cached"}>{online&&status==="live"?"● LIVE":"● OFFLINE / CACHED"}</span>
          </div>
          <div className="conditions-metrics">
            <div className="pressure"><LapTimerIcon/><span>BAROMETRIC PRESSURE</span><strong>{w?w.pressureInHg.toFixed(2):"—"}<small> inHg</small></strong><b>{w?.pressureDelta3h && w.pressureDelta3h<0?"↓":"↑"} {pressureTrend}</b></div>
            <div><SunIcon/><span>TEMPERATURE</span><strong>{w?Math.round(w.temperatureF):"—"}<small>°F</small></strong><small className="water-reading">Water: official reading unavailable</small></div>
            <div><ActivityLogIcon/><span>WIND</span><strong>{w?Math.round(w.windMph):"—"}<small> mph</small></strong><small>{w?compass(w.windDirection):"—"}</small></div>
            <div><DashboardIcon/><span>CLOUD COVER</span><strong>{w?Math.round(w.cloudCover):"—"}<small>%</small></strong><small>{w?"Observed atmosphere":"Unavailable"}</small></div>
          </div>
          <a className="full-barometer" href="/barometer.html">VIEW FULL BAROMETER <ChevronRightIcon/></a>
        </section>
      </section>

      <section className="pillar-grid">
        <a className="pillar fishing" href="/barometer.html"><EyeOpenIcon/><h2>FISHING<br/>INTELLIGENCE</h2><p>Live conditions, patterns, forecasts & proven tactics.</p><span>CHECK THE INTEL <ChevronRightIcon/></span></a>
        <a className="pillar camping" href="#learn"><HomeIcon/><h2>CAMPING<br/>EDUCATION</h2><p>Skills, gear guides, and backwoods know-how.</p><span>START LEARNING <ChevronRightIcon/></span></a>
        <a className="pillar water" href="/field-intel.html#water"><GlobeIcon/><h2>WATER &<br/>ENVIRONMENT</h2><p>Water levels, quality, habitat health & risk updates.</p><span>EXPLORE THE DATA <ChevronRightIcon/></span></a>
        <a className="pillar conservation" href="/field-intel.html#conservation"><HeartIcon/><h2>CONSERVATION<br/>ACTION</h2><p>Smart actions protect habitats and keep our outdoors strong.</p><span>MAKE A DIFFERENCE <ChevronRightIcon/></span></a>
      </section>

      <section className="lower-grid">
        <section className="learn-strip" id="learn">
          <div className="learn-heading"><strong><ReaderIcon/> LEARN SOMETHING NEW</strong><a href="/field-intel.html">VIEW ALL LESSONS <ChevronRightIcon/></a></div>
          <div className="lesson-grid">
            {lessons.map(([title,time],i)=><article key={title}>
              <img src={lessonImages[i%lessonImages.length]} alt="" />
              <div><strong>{title}</strong><small>{time}</small></div>
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
          <h3><HeartIcon/> MAKE AN IMPACT</h3>
          <p>Small actions create big change. Report issues and help protect our waters.</p>
          <div className="official-report-links">
            <a href={IDNR_REPORT_URL} target="_blank" rel="noreferrer">ILLINOIS REPORT FORM ↗</a>
            <a href={MDC_REPORT_URL} target="_blank" rel="noreferrer">MISSOURI WATER REPORT ↗</a>
          </div>
        </article>
      </section>

      <section className="connect-row" id="more">
        <article className="stay-connected">
          <div><strong><EnvelopeClosedIcon/> STAY CONNECTED</strong><span>Get local updates, community highlights, and conservation calls to action.</span></div>
          <form onSubmit={submitSignup}>
            <input type="email" name="email" autoComplete="email" value={signupEmail} onChange={e=>setSignupEmail(e.target.value)} placeholder="Email address" aria-label="Email address" required/>
            <button type="submit" disabled={signupState==="submitting"}>{signupState==="submitting"?"JOINING…":"SIGN ME UP! →"}</button>
          </form>
          {TURNSTILE_SITE_KEY?<TurnstileWidget key={captchaReset} siteKey={TURNSTILE_SITE_KEY} onToken={receiveCaptchaToken}/>:null}
          <small aria-live="polite">{signupMessage || "No spam. Unsubscribe anytime."}</small>
        </article>
        <article className="join-community">
          <strong><PersonIcon/> JOIN THE COMMUNITY!</strong>
          <span>Connect, share, learn, and make a difference together.</span>
          <a className="facebook-link" href={FACEBOOK_URL} target="_blank" rel="noreferrer">f</a>
          <a className="facebook-qr" href={FACEBOOK_URL} target="_blank" rel="noreferrer" aria-label="Open BaitLogic Facebook page">
            <img src="/assets/baitlogic-facebook-qr.png" alt="QR code for the BaitLogic Facebook page"/>
          </a>
          <a className="contact-link" href="mailto:baitlogicadmin@gmail.com">Email</a>
        </article>
      </section>
    </main>

    <footer className="bl-footer">
      <img src="/assets/baitlogic-lockup.webp" alt="BaitLogic Outdoors"/>
      <div><strong><HeartIcon/> ALWAYS FREE</strong><span>No paywalls. Ever.</span></div>
      <div><strong><PersonIcon/> COMMUNITY FIRST</strong><span>Together we grow.</span></div>
      <div><strong><Crosshair2Icon/> LOCAL FOCUSED</strong><span>{place}{region?", "+region:""} & surrounding areas.</span></div>
      <div><strong><HeartIcon/> CONSERVATION DRIVEN</strong><span>Healthy habitats. Stronger future.</span></div>
    </footer>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <a href="/"><HomeIcon/><span>Home</span></a>
      <a href="/barometer.html"><DashboardIcon/><span>Explore</span></a>
      <a className="mobile-report" href="/field-intel.html#field-check"><EnvelopeClosedIcon/><span>Report</span></a>
      <a href="#field-checks"><PersonIcon/><span>Community</span></a>
      <a href="#learn"><ReaderIcon/><span>Learn</span></a>
    </nav>
  </div>
}
