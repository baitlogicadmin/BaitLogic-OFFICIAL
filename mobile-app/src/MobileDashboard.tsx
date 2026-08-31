import {
  Crosshair2Icon, HomeIcon, ReaderIcon, PersonIcon, GlobeIcon,
  LapTimerIcon, SunIcon, ActivityLogIcon
} from "@radix-ui/react-icons";
import { compass, formatClock, pressureTrend, relativeUpdated, useBaitLogicConditions, WEATHER_LABELS } from "./useBaitLogicConditions";
import "./mobile-dashboard.css";

function CompassAnchorMark({small=false}:{small?:boolean}) {
  return <svg className={small?"mobile-compass small":"mobile-compass"} viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id={small?"mTealSmall":"mTealLarge"} cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#0fa7a5"/><stop offset="72%" stopColor="#006f73"/><stop offset="100%" stopColor="#004f55"/>
      </radialGradient>
      <linearGradient id={small?"mGoldSmall":"mGoldLarge"} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffe08b"/><stop offset="35%" stopColor="#d89a34"/><stop offset="72%" stopColor="#a85e18"/><stop offset="100%" stopColor="#f2c763"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="49" fill="#073a8c" stroke="#d9a447" strokeWidth="3"/>
    <circle cx="60" cy="60" r="42" fill={`url(#${small?"mTealSmall":"mTealLarge"})`} stroke="#f1c96c" strokeWidth="2.2"/>
    <path d="M60 3 66 18 60 15 54 18ZM117 60 102 66 105 60 102 54ZM60 117 54 102 60 105 66 102ZM3 60 18 54 15 60 18 66Z" fill={`url(#${small?"mGoldSmall":"mGoldLarge"})`}/>
    <g fill="none" stroke={`url(#${small?"mGoldSmall":"mGoldLarge"})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="37" r="7"/><path d="M60 44v37M43 52h34M60 81c-7 0-13-5-16-12M60 81c7 0 13-5 16-12"/>
      <path d="M42 66c0 13 8 22 18 22s18-9 18-22M38 70l4-4 5 2M82 70l-4-4-5 2"/>
    </g>
  </svg>
}

const cards = [
  {cls:"reporting",title:"CONSERVATION REPORTING · LOCAL",text:"If you see something, say something.",cta:"REPORT / RESOURCES",href:"/field-intel.html#conservation",img:"/assets/pillar-conservation.webp",icon:"⚑"},
  {cls:"trails",title:"TRAILS & OFF-GRID",text:"Nearby trails, maps, and off-grid resources.",cta:"EXPLORE TRAILS",href:"/trails.html",img:"/assets/hero-sunset.webp",icon:"⌖"},
  {cls:"barometer",title:"BAROMETER",text:"Real-time weather, pressure, wind and water data.",cta:"VIEW DASHBOARD",href:"/barometer.html",img:"/assets/approved-pressure.webp",icon:"◴"},
  {cls:"knowledge",title:"OUTDOOR KNOWLEDGE",text:"Camping, hiking, safety, wildlife and more.",cta:"LEARN MORE",href:"/outdoor.html",img:"/assets/pillar-camping.webp",icon:"▤"},
  {cls:"field",title:"FIELD LOG",text:"Track conditions, notes, and observations over time.",cta:"OPEN LOG",href:"/field-intel.html#field-check",img:"/assets/hero-sunset.webp",icon:"▣"},
  {cls:"catches",title:"COMMUNITY CATCHES",text:"See catches shared through BaitLogic.",cta:"VIEW CATCHES",href:"/catches.html",img:"/assets/pillar-fishing.webp",icon:"◉"}
];

export default function MobileDashboard(){
  const {snapshot,waterTemp,online,status,accuracy,refreshLocation}=useBaitLogicConditions();
  const w=snapshot?.weather;
  const place=snapshot?.location?.locality || snapshot?.location?.name || "Location not loaded";
  const region=snapshot?.location?.region?.replace("Illinois","IL").replace("Missouri","MO");
  const locationLabel=region && !place.includes(region) ? `${place}, ${region}` : place;
  const live=online&&status==="live";

  return <div className="mobile-dashboard">
    <header className="mobile-app-header">
      <a className="mobile-brand" href="/" aria-label="BaitLogic Outdoors home">
        <CompassAnchorMark/>
        <span>
          <strong>BAITLOGIC</strong><b>OUTDOORS</b>
          <small>Beyond the Bite. Powered by People and Purpose.</small>
        </span>
      </a>
      <button type="button" className="mobile-location-chip" onClick={refreshLocation}>
        <Crosshair2Icon/><span><strong>{locationLabel}</strong><small>● {live?"LIVE":status==="cached"?"CACHED":"CHECK LOCATION"}</small></span>
      </button>
    </header>

    <main className="mobile-content">
      <section className="mobile-conditions">
        <h2>CURRENT CONDITIONS</h2>
        <div className="mobile-metrics">
          <div><LapTimerIcon/><span><b>PRESSURE</b><strong>{w?`${w.pressureInHg.toFixed(2)} inHg`:"—"}</strong><small>{w?pressureTrend(w.pressureDelta3h):"Not loaded"}</small></span></div>
          <div><span className="metric-glyph">☁</span><span><b>WEATHER</b><strong>{w?`${Math.round(w.temperatureF)}°F`:"—"}</strong><small>{w?WEATHER_LABELS[w.code]||"Current conditions":"Not loaded"}</small></span></div>
          <div><span className="metric-glyph">◉</span><span><b>WATER TEMP</b><strong>{waterTemp!=null?`${waterTemp.toFixed(1)}°F`:"—"}</strong><small>{waterTemp!=null?"Verified USGS station":"No verified reading"}</small></span></div>
          <div><ActivityLogIcon/><span><b>WIND</b><strong>{w?`${Math.round(w.windMph)} mph`:"—"}</strong><small>{w?compass(w.windDirection):"—"}</small></span></div>
          <div><SunIcon/><span><b>SUNRISE / SUNSET</b><strong>{formatClock(w?.sunrise)} / {formatClock(w?.sunset)}</strong><small>{relativeUpdated(snapshot?.updatedAt)}</small></span></div>
        </div>
        {accuracy!=null && <p className="mobile-accuracy">Device location accuracy ±{Math.round(accuracy)} m</p>}
      </section>

      <section className="mobile-card-grid">
        {cards.map(card=><a key={card.title} className={`mobile-card ${card.cls}`} href={card.href}>
          <div className="mobile-card-image" style={{backgroundImage:`linear-gradient(180deg,rgba(2,7,13,.12),rgba(2,7,13,.92)),url("${card.img}")`}}/>
          <span className="mobile-card-icon">{card.icon}</span>
          <h3>{card.title}</h3><p>{card.text}</p><b>{card.cta} →</b>
        </a>)}
      </section>

      <section className="mobile-support">
        <article>
          <h2>TRUSTED DATA SOURCES</h2>
          <div><span><strong>USGS</strong><small>Water Data</small></span><span><strong>Open-Meteo</strong><small>Weather</small></span><span><strong>NWS</strong><small>Alerts</small></span><span><strong>Community</strong><small>Reports</small></span></div>
        </article>
        <article className="offline-card"><strong>OFFLINE READY</strong><p>Cached BaitLogic pages and previously verified condition data remain available when supported by the device.</p></article>
      </section>
    </main>

    <nav className="mobile-bottom-nav" aria-label="App navigation">
      <a className="active" href="/"><HomeIcon/><span>HOME</span></a>
      <a href="/trails.html"><GlobeIcon/><span>MAPS</span></a>
      <a className="center" href="/field-intel.html#field-check" aria-label="Add Field Check"><CompassAnchorMark small/></a>
      <a href="/field-intel.html"><ReaderIcon/><span>LOG</span></a>
      <a href="/catches.html"><PersonIcon/><span>COMMUNITY</span></a>
    </nav>
  </div>;
}
