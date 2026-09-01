import {
  Crosshair2Icon, HomeIcon, ReaderIcon, GlobeIcon,
  LapTimerIcon, SunIcon, ActivityLogIcon
} from "@radix-ui/react-icons";
import { compass, formatClock, pressureTrend, relativeUpdated, useBaitLogicConditions, WEATHER_LABELS } from "./useBaitLogicConditions";
import "./mobile-dashboard.css";

const APPROVED_TRAILS = "data:image/webp;base64,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";
const APPROVED_FIELD = "data:image/webp;base64,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";

function CompassAnchorMark({small=false}:{small?:boolean}) {
  return <img className={small?"mobile-compass small":"mobile-compass"} src="/assets/founder-small-emblem.svg" alt="" aria-hidden="true"/>;
}

const cards = [
  {cls:"conservation",title:"CONSERVATION REPORTING · LOCAL",text:"If you see something, say something.",cta:"REPORT / RESOURCES",href:"/field-intel.html#conservation",img:"/assets/approved-card-conservation.svg",icon:"♧"},
  {cls:"trails",title:"TRAILS & OFF-GRID",text:"Nearby trails, maps, and off-grid resources.",cta:"EXPLORE TRAILS",href:"/trails.html",img:APPROVED_TRAILS,icon:"⌁"},
  {cls:"barometer",title:"BAROMETER",text:"Real-time weather, pressure, wind and water data.",cta:"VIEW DASHBOARD",href:"/barometer.html",img:"/assets/approved-card-barometer.svg",icon:"◴"},
  {cls:"knowledge",title:"OUTDOOR KNOWLEDGE",text:"Camping, hiking, safety, wildlife and more.",cta:"LEARN MORE",href:"/outdoor.html",img:"/assets/pillar-camping.webp",icon:"▤"},
  {cls:"field",title:"FIELD LOG",text:"Track conditions, notes, and observations over time.",cta:"OPEN LOG",href:"/field-intel.html#field-check",img:APPROVED_FIELD,icon:"▣"},
  {cls:"catches",title:"COMMUNITY CATCHES",text:"Share your catches. See what others are catching.",cta:"VIEW CATCHES",href:"/catches.html",img:"/assets/approved-card-catches.svg",icon:"◉"}
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
