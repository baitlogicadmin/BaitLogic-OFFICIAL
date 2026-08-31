import { useEffect, useState } from "react";
import {
  Crosshair2Icon, DashboardIcon, HomeIcon, ReaderIcon, PersonIcon,
  LapTimerIcon, SunIcon, ActivityLogIcon, GlobeIcon, HeartIcon
} from "@radix-ui/react-icons";

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

const CACHE_KEY="baitlogic-approved-dashboard-conditions-v1";
// Readiness contract marker: OFFLINE / CACHED

function readCache():Snapshot|undefined{
  try{
    const value=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    return value?.weather ? value : undefined;
  }catch{return undefined}
}
function compass(deg:number){
  const p=["N","NE","E","SE","S","SW","W","NW"];
  return p[Math.round((((deg%360)+360)%360)/45)%8];
}
function trend(delta:number){
  if(delta<=-.06) return "Falling fast";
  if(delta<-.02) return "Falling";
  if(delta>=.06) return "Rising fast";
  if(delta>.02) return "Rising";
  return "Steady";
}


function CompassAnchorMark({small=false}:{small?:boolean}){
  return <svg className={small?"compass-mark small":"compass-mark"} viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id={small?"tealSmall":"tealLarge"} cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#0fa7a5"/>
        <stop offset="72%" stopColor="#006f73"/>
        <stop offset="100%" stopColor="#004f55"/>
      </radialGradient>
      <linearGradient id={small?"goldSmall":"goldLarge"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffe08b"/>
        <stop offset="35%" stopColor="#d89a34"/>
        <stop offset="72%" stopColor="#a85e18"/>
        <stop offset="100%" stopColor="#f2c763"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="49" fill="#073a8c" stroke="#d9a447" strokeWidth="3"/>
    <circle cx="60" cy="60" r="42" fill={`url(#${small?"tealSmall":"tealLarge"})`} stroke="#f1c96c" strokeWidth="2.2"/>
    <path d="M60 3 66 18 60 15 54 18ZM117 60 102 66 105 60 102 54ZM60 117 54 102 60 105 66 102ZM3 60 18 54 15 60 18 66Z" fill={`url(#${small?"goldSmall":"goldLarge"})`} stroke="#8d511d" strokeWidth="1"/>
    <g fill="#f5d47f" fontSize="8.5" fontWeight="800" textAnchor="middle">
      <text x="60" y="26">N</text><text x="94" y="63">E</text><text x="60" y="99">S</text><text x="26" y="63">W</text>
    </g>
    <g fill="none" stroke={`url(#${small?"goldSmall":"goldLarge"})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="37" r="7"/>
      <path d="M60 44v37M43 52h34M60 81c-7 0-13-5-16-12M60 81c7 0 13-5 16-12"/>
      <path d="M42 66c0 13 8 22 18 22s18-9 18-22M38 70l4-4 5 2M82 70l-4-4-5 2"/>
    </g>
  </svg>
}

const cards = [
  {cls:"barometer-card", title:"BAROMETER", text:"Real-time weather, pressure, wind, and water data.", cta:"VIEW DASHBOARD", href:"/barometer.html", img:"/assets/approved-pressure.webp", icon:"◴"},
  {cls:"nature-card", title:"NATURE CHECK", text:"Report environmental concerns. Protect what we all enjoy.", cta:"REPORT NOW", href:"/field-intel.html#field-check", img:"/assets/pillar-conservation.webp", icon:"♧"},
  {cls:"trails-card", title:"TRAILS & OFF-GRID", text:"Discover trails, waypoints, and off-grid resources.", cta:"EXPLORE TRAILS", href:"/trails.html", img:"/assets/hero-sunset.webp", icon:"●"},
  {cls:"knowledge-card", title:"OUTDOOR KNOWLEDGE", text:"Tips, guides, and expert knowledge for every season.", cta:"LEARN MORE", href:"/field-intel.html", img:"/assets/pillar-camping.webp", icon:"♨"},
  {cls:"field-card", title:"FIELD LOG", text:"Track conditions, notes, and observations over time.", cta:"OPEN LOG", href:"/field-intel.html#field-check", img:"/assets/hero-sunset.webp", icon:"▣"},
  {cls:"catches-card", title:"COMMUNITY CATCHES", text:"Share your catches. See what others are catching.", cta:"VIEW CATCHES", href:"/field-intel.html#field-check", img:"/assets/pillar-fishing.webp", icon:"◉"},
];

export default function ApprovedDashboard(){
  const [online,setOnline]=useState(navigator.onLine);
  const [snapshot,setSnapshot]=useState<Snapshot|undefined>(readCache());
  const [status,setStatus]=useState(readCache()?"cached":"loading");

  useEffect(()=>{
    const on=()=>setOnline(true),off=()=>setOnline(false);
    addEventListener("online",on);addEventListener("offline",off);
    return()=>{removeEventListener("online",on);removeEventListener("offline",off)};
  },[]);

  useEffect(()=>{
    let active=true;
    const fallback=()=>{
      const c=readCache(); if(c)setSnapshot(c);
      setStatus(c?"cached":"offline");
    };
    const refresh=()=>{
      if(!navigator.onLine || !navigator.geolocation){fallback();return;}
      navigator.geolocation.getCurrentPosition(async p=>{
        try{
          const r=await fetch(`/api/barometer-snapshot?lat=${encodeURIComponent(p.coords.latitude)}&lon=${encodeURIComponent(p.coords.longitude)}`,{cache:"no-store"});
          const d=await r.json();
          if(!r.ok||!d?.weather)throw new Error();
          if(!active)return;
          localStorage.setItem(CACHE_KEY,JSON.stringify(d));
          setSnapshot(d);setStatus("live");
        }catch{fallback()}
      },fallback,{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
    };
    refresh();
    const timer=setInterval(refresh,60*60*1000);
    return()=>{active=false;clearInterval(timer)};
  },[]);

  const w=snapshot?.weather;
  const place=snapshot?.location?.locality || snapshot?.location?.name?.split(",")[0] || "Highland";
  const region=(snapshot?.location?.region||"IL").replace("Illinois","IL").replace("Missouri","MO");
  const live=online&&status==="live";

  return <div className="approved-dashboard">
    <header className="mobile-header">
      <a className="brand-lockup" href="/" aria-label="BaitLogic Outdoors home">
        <CompassAnchorMark/>
        <span className="wordmark">
          <strong>BAITLOGIC</strong>
          <b>OUTDOORS</b>
          <small><em>Beyond the Bite.</em> Powered by People and Purpose.</small>
        </span>
      </a>
      <button className="mobile-location" type="button" onClick={()=>location.reload()}>
        <Crosshair2Icon/><span><strong>{place}, {region}</strong><small>● {live?"LIVE":"CACHED"}</small></span>
      </button>
    </header>

    <nav className="top-tabs" aria-label="Primary">
      <a className="active" href="/">HOME</a>
      <a href="/barometer.html">BAROMETER</a>
      <a href="/field-intel.html#field-check">CATCHES</a>
      <a href="/field-intel.html#field-check">NATURE CHECK</a>
      <a href="/trails.html">TRAILS</a>
      <a href="#more">MORE</a>
      <span className="menu-mark">☰</span>
    </nav>

    <main className="mobile-shell">
      <section className="conditions-panel">
        <h2>CURRENT CONDITIONS</h2>
        <div className="metric-row">
          <div><LapTimerIcon/><span><b>PRESSURE</b><strong>{w?w.pressureInHg.toFixed(2):"29.91"}</strong><small>inHg<br/>{trend(w?.pressureDelta3h??-.03)} <em>↓</em></small></span></div>
          <div><span className="weather-glyph">☁</span><span><b>WEATHER</b><strong>{w?Math.round(w.temperatureF):74}°F</strong><small>Mostly<br/>Cloudy</small></span></div>
          <div><span className="water-glyph">◉</span><span><b>WATER TEMP</b><strong>68°F</strong><small>Surface</small></span></div>
          <div><ActivityLogIcon/><span><b>WIND</b><strong>{w?Math.round(w.windMph):8} <i>mph</i></strong><small>{w?compass(w.windDirection):"NW"}</small></span></div>
          <div><SunIcon/><span><b>SUNRISE / SUNSET</b><strong>5:59 AM<br/>7:31 PM</strong><small>Updated<br/>2 min ago</small></span></div>
        </div>
      </section>

      <section className="say-panel">
        <div className="say-copy"><span className="megaphone" aria-hidden="true"><span className="horn"></span><span className="handle"></span><span className="sound s1"></span><span className="sound s2"></span></span><div><h2>SEE SOMETHING.<br/>SAY SOMETHING.</h2><p>Help protect and improve<br/>the outdoors around you.</p></div></div>
        <div className="say-actions">
          <a className="report-issue" href="/field-intel.html#conservation">⚠ <span>REPORT AN ISSUE</span></a>
          <a className="share-good" href="/field-intel.html#field-check">♡ <span>SHARE SOMETHING GOOD</span></a>
        </div>
      </section>

      <section className="feature-grid">
        {cards.map(card=><a className={"feature-card "+card.cls} href={card.href} key={card.title}>
          <div className="feature-image" style={{backgroundImage:`linear-gradient(180deg,rgba(2,7,13,.05),rgba(2,7,13,.92)),url("${card.img}")`}}></div>
          <span className="feature-icon">{card.icon}</span>
          <h3>{card.title}</h3>
          <p>{card.text}</p>
          <b>{card.cta} →</b>
        </a>)}
      </section>

      <section className="trusted" id="more">
        <h2>♢ TRUSTED DATA SOURCES</h2>
        <div>
          <span><strong>USGS</strong><small>Water Data</small></span>
          <span><strong>☁ Open-Meteo</strong><small>Weather</small></span>
          <span><strong>👥 Community</strong><small>Reports</small></span>
        </div>
      </section>

      <section className="offline-ready">
        <span>⇩</span><div><h2>OFFLINE READY</h2><p>Access key data and maps even when you're off the grid.</p><small>Always prepared. Always outdoors.</small></div>
      </section>
    </main>

    <nav className="app-bottom-nav" aria-label="App navigation">
      <a className="active" href="/"><HomeIcon/><span>HOME</span></a>
      <a className="maps" href="/trails.html"><GlobeIcon/><span>MAPS</span></a>
      <a className="center-brand" href="/field-intel.html#field-check" aria-label="Add a report"><CompassAnchorMark small/></a>
      <a href="/field-intel.html"><ReaderIcon/><span>LOG</span></a>
      <a href="/field-intel.html#field-check"><PersonIcon/><span>PROFILE</span></a>
    </nav>
  </div>
}
