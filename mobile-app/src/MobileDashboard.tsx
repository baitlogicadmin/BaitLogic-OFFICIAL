import {
  Crosshair2Icon, HomeIcon, ReaderIcon, GlobeIcon,
  LapTimerIcon, SunIcon, ActivityLogIcon
} from "@radix-ui/react-icons";
import { compass, formatClock, pressureTrend, relativeUpdated, useBaitLogicConditions, WEATHER_LABELS } from "./useBaitLogicConditions";
import "./mobile-dashboard.css";

function CompassAnchorMark({small=false}:{small?:boolean}) {
  return <svg className={small?"mobile-compass small":"mobile-compass"} viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id={small?"mTealSmall":"mTealLarge"} cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#10a7a3"/><stop offset="72%" stopColor="#006f73"/><stop offset="100%" stopColor="#003e48"/>
      </radialGradient>
      <linearGradient id={small?"mGoldSmall":"mGoldLarge"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffe9a6"/><stop offset="32%" stopColor="#d9a047"/><stop offset="70%" stopColor="#9b571d"/><stop offset="100%" stopColor="#efc968"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="50" fill="#14090f" stroke="#c48633" strokeWidth="2.5"/>
    <circle cx="60" cy="60" r="43" fill={`url(#${small?"mTealSmall":"mTealLarge"})`} stroke="#d9a447" strokeWidth="2"/>
    <circle cx="60" cy="60" r="35" fill="none" stroke="#103e5b" strokeWidth="2"/>
    <path d="M60 4 66 18 60 15 54 18ZM116 60 102 66 105 60 102 54ZM60 116 54 102 60 105 66 102ZM4 60 18 54 15 60 18 66Z" fill={`url(#${small?"mGoldSmall":"mGoldLarge"})`}/>
    <g fill="#efd27d" fontSize="8" fontWeight="800" textAnchor="middle">
      <text x="60" y="25">N</text><text x="95" y="63">E</text><text x="60" y="99">S</text><text x="25" y="63">W</text>
    </g>
    <g fill="none" stroke={`url(#${small?"mGoldSmall":"mGoldLarge"})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="37" r="7"/><path d="M60 44v37M43 52h34"/>
      <path d="M42 66c0 13 8 22 18 22s18-9 18-22M38 70l4-4 5 2M82 70l-4-4-5 2"/>
    </g>
  </svg>;
}

const cards = [
  {cls:"conservation",title:"CONSERVATION REPORTING · LOCAL",text:"If you see something, say something.",cta:"REPORT / RESOURCES",href:"/field-intel.html#conservation",img:"/assets/pillar-conservation.webp",icon:"♧"},
  {cls:"trails",title:"TRAILS & OFF-GRID",text:"Nearby trails, maps, and off-grid resources.",cta:"EXPLORE TRAILS",href:"/trails.html",img:"",icon:"⌁"},
  {cls:"barometer",title:"BAROMETER",text:"Real-time weather, pressure, wind and water data.",cta:"VIEW DASHBOARD",href:"/barometer.html",img:"/assets/approved-pressure.webp",icon:"◴"},
  {cls:"knowledge",title:"OUTDOOR KNOWLEDGE",text:"Camping, hiking, safety, wildlife and more.",cta:"LEARN MORE",href:"/outdoor.html",img:"/assets/pillar-camping.webp",icon:"▤"},
  {cls:"field",title:"FIELD LOG",text:"Track conditions, notes, and observations over time.",cta:"OPEN LOG",href:"/field-intel.html#field-check",img:"/assets/hero-sunset.webp",icon:"▣"},
  {cls:"catches",title:"COMMUNITY CATCHES",text:"Share your catches. See what others are catching.",cta:"VIEW CATCHES",href:"/catches.html",img:"/assets/pillar-fishing.webp",icon:"◉"}
];

export default function MobileDashboard(){
  const {snapshot,waterTemp,waterStatus,online,status,refreshLocation}=useBaitLogicConditions();
  const w=snapshot?.weather;
  const place=snapshot?.location?.locality || snapshot?.location?.name || "Location unavailable";
  const region=snapshot?.location?.region?.replace("Illinois","IL").replace("Missouri","MO");
  const locationLabel=region && !place.includes(region) ? `${place}, ${region}` : place;
  const live=online&&status==="live";

  return <div className="mobile-dashboard">
    <header className="mobile-app-header">
      <a className="mobile-brand" href="/" aria-label="BaitLogic Outdoors home">
        <CompassAnchorMark/>
        <span className="mobile-wordmark">
          <strong>BAITLOGIC</strong>
          <b><i/>OUTDOORS<i/></b>
          <small><em>Beyond the Bite.</em> Powered by People and Purpose.</small>
        </span>
      </a>
      <button type="button" className="mobile-location-chip" onClick={refreshLocation} aria-label="Refresh current location and conditions">
        <Crosshair2Icon/>
        <span><strong>{locationLabel}</strong><small>● {live?"LIVE":status==="cached"?"CACHED":"CHECK LOCATION"}</small></span>
      </button>
    </header>

    <main className="mobile-content">
      <section className="mobile-conditions" aria-label="Verified local weather conditions">
        <div className="mobile-section-title"><h2>CURRENT CONDITIONS</h2><span>›</span></div>
        <div className="mobile-metrics">
          <div><LapTimerIcon/><span><strong>{w?w.pressureInHg.toFixed(2):"—"} <small>inHg</small></strong><small>{w?pressureTrend(w.pressureDelta3h):"Unavailable"}</small></span></div>
          <div><span className="metric-glyph weather">☁</span><span><strong>{w?`${Math.round(w.temperatureF)}°F`:"—"}</strong><small>{w?WEATHER_LABELS[w.code]||"Current conditions":"Unavailable"}</small></span></div>
          <div><span className="metric-glyph water">◉</span><span><strong>{waterTemp!=null?`${waterTemp.toFixed(1)}°F`:"—"}</strong><small>{waterTemp!=null?(waterStatus==="cached"?"Cached water":"Water Temp"):"No verified reading"}</small></span></div>
          <div><ActivityLogIcon/><span><strong>{w?`${Math.round(w.windMph)} mph`:"—"}</strong><small>{w?compass(w.windDirection):"Unavailable"}</small></span></div>
          <div><SunIcon/><span><strong>{formatClock(w?.sunrise)}</strong><small>{formatClock(w?.sunset)}</small></span></div>
          <div><span className="metric-glyph updated">◷</span><span><strong>Updated</strong><small>{relativeUpdated(snapshot?.updatedAt)}</small></span></div>
        </div>
      </section>

      <section className="mobile-card-grid">
        {cards.map(card=><a key={card.title} className={`mobile-card ${card.cls}`} href={card.href}>
          <div className="mobile-card-image" style={card.img?{backgroundImage:`linear-gradient(180deg,rgba(18,7,14,.05),rgba(18,7,14,.9)),url("${card.img}")`}:undefined}/>
          <span className="mobile-card-icon">{card.icon}</span>
          <h3>{card.title}</h3>
          <p>{card.text}</p>
          <b>{card.cta} <span>→</span></b>
        </a>)}
      </section>

      <section className="mobile-trusted">
        <h2>♢ TRUSTED DATA SOURCES</h2>
        <div>
          <span><strong>USGS</strong><small>Water Data</small></span>
          <span><strong>☁</strong><small>Open-Meteo</small></span>
          <span><strong>♟♟</strong><small>Community Reports</small></span>
        </div>
      </section>

      <section className="mobile-offline">
        <span className="offline-icon">⇩</span>
        <div><h2>OFFLINE READY</h2><p>Access key data and maps even when you're off the grid.</p><small>Always prepared. Always outdoors.</small></div>
        <span className="offline-arrow">›</span>
      </section>

      <section className="mobile-conservation-strip">
        <span className="conservation-heart">♥</span>
        <div><strong>CONSERVATION FIRST</strong><span>If you see something, say something.</span></div>
        <a href="/field-intel.html#conservation">MAKE A DIFFERENCE →</a>
      </section>
    </main>

    <nav className="mobile-bottom-nav" aria-label="App navigation">
      <a className="active" href="/"><HomeIcon/><span>HOME</span></a>
      <a href="/trails.html"><GlobeIcon/><span>MAPS</span></a>
      <a className="center" href="/field-intel.html#field-check" aria-label="Field Check"><CompassAnchorMark small/></a>
      <a href="/field-intel.html"><ReaderIcon/><span>LOG</span></a>
      <a href="/profile.html"><span className="profile-glyph">◎</span><span>PROFILE</span></a>
    </nav>
  </div>;
}
