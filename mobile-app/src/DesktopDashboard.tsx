import {
  Crosshair2Icon, HomeIcon, LapTimerIcon, SunIcon, ActivityLogIcon
} from "@radix-ui/react-icons";
import { compass, formatClock, pressureTrend, relativeUpdated, useBaitLogicConditions, WEATHER_LABELS } from "./useBaitLogicConditions";
import "./desktop-dashboard.css";

const cards = [
  {cls:"reporting",title:"CONSERVATION REPORTING · LOCAL",text:"If you see something, say something.",cta:"REPORT / RESOURCES",href:"/field-intel.html#conservation",img:"/assets/pillar-conservation.webp"},
  {cls:"trails",title:"TRAILS & OFF-GRID",text:"Nearby trails, maps, and off-grid resources.",cta:"EXPLORE TRAILS",href:"/trails.html",img:"/assets/hero-sunset.webp"},
  {cls:"barometer",title:"BAROMETER",text:"Real-time weather, pressure, wind and verified water evidence.",cta:"VIEW DASHBOARD",href:"/barometer.html",img:"/assets/approved-pressure.webp"},
  {cls:"knowledge",title:"OUTDOOR KNOWLEDGE",text:"Camping, hiking, safety, wildlife and more.",cta:"LEARN MORE",href:"/outdoor.html",img:"/assets/pillar-camping.webp"},
  {cls:"field",title:"FIELD LOG",text:"Track conditions, notes, and observations over time.",cta:"OPEN LOG",href:"/field-intel.html#field-check",img:"/assets/hero-sunset.webp"},
  {cls:"catches",title:"COMMUNITY CATCHES",text:"See catches shared through BaitLogic.",cta:"VIEW CATCHES",href:"/catches.html",img:"/assets/pillar-fishing.webp"}
];

export default function DesktopDashboard(){
  const {snapshot,waterTemp,online,status,refreshLocation}=useBaitLogicConditions();
  const w=snapshot?.weather;
  const place=snapshot?.location?.name || "Location not loaded";
  const live=online&&status==="live";

  return <div className="desktop-dashboard">
    <header className="desktop-header">
      <a className="desktop-wordmark" href="/"><strong>BAITLOGIC</strong><b>OUTDOORS</b><small>Beyond the Bite. Powered by People and Purpose.</small></a>
      <nav aria-label="Desktop primary navigation">
        <a className="home" href="/">HOME</a><a className="barometer" href="/barometer.html">BAROMETER</a><a className="catches" href="/catches.html">CATCHES</a><a className="nature" href="/field-intel.html#conservation">NATURE CHECK</a><a className="trails" href="/trails.html">TRAILS</a><a className="more" href="/outdoor.html">MORE</a>
      </nav>
      <button className="desktop-location" type="button" onClick={refreshLocation}><Crosshair2Icon/><span><strong>{place}</strong><small>● {live?"LIVE":status==="cached"?"CACHED":"CHECK LOCATION"}</small></span></button>
    </header>

    <main className="desktop-main">
      <section className="desktop-hero">
        <div><p className="eyebrow">LOCAL OUTDOOR INTELLIGENCE</p><h1>Know before you go.</h1><p>Verified conditions, community observations, trails, conservation tools and practical outdoor knowledge in one place.</p><div className="hero-actions"><a href="/field-intel.html#conservation">REPORT / RESOURCES</a><a href="/trails.html">EXPLORE TRAILS</a></div></div>
        <aside className="desktop-conditions">
          <h2>CURRENT CONDITIONS</h2>
          <div className="desktop-metric-grid">
            <div><LapTimerIcon/><span><b>PRESSURE</b><strong>{w?`${w.pressureInHg.toFixed(2)} inHg`:"—"}</strong><small>{w?pressureTrend(w.pressureDelta3h):"Not loaded"}</small></span></div>
            <div><span className="metric-glyph">☁</span><span><b>WEATHER</b><strong>{w?`${Math.round(w.temperatureF)}°F`:"—"}</strong><small>{w?WEATHER_LABELS[w.code]||"Current conditions":"Not loaded"}</small></span></div>
            <div><span className="metric-glyph">◉</span><span><b>WATER TEMP</b><strong>{waterTemp!=null?`${waterTemp.toFixed(1)}°F`:"—"}</strong><small>{waterTemp!=null?"Verified USGS station":"No verified reading"}</small></span></div>
            <div><ActivityLogIcon/><span><b>WIND</b><strong>{w?`${Math.round(w.windMph)} mph`:"—"}</strong><small>{w?compass(w.windDirection):"—"}</small></span></div>
            <div><SunIcon/><span><b>SUNRISE / SUNSET</b><strong>{formatClock(w?.sunrise)} / {formatClock(w?.sunset)}</strong><small>{relativeUpdated(snapshot?.updatedAt)}</small></span></div>
          </div>
        </aside>
      </section>

      <section className="desktop-card-grid">
        {cards.map(card=><a key={card.title} className={`desktop-card ${card.cls}`} href={card.href}>
          <div className="desktop-card-image" style={{backgroundImage:`linear-gradient(180deg,rgba(2,7,13,.12),rgba(2,7,13,.93)),url("${card.img}")`}}/>
          <h2>{card.title}</h2><p>{card.text}</p><b>{card.cta} →</b>
        </a>)}
      </section>

      <section className="desktop-lower">
        <article><h2>TRUSTED DATA SOURCES</h2><p>USGS water data · Open-Meteo weather · National Weather Service alerts · approved BaitLogic community reports.</p></article>
        <article><h2>OFFLINE READY</h2><p>Cached BaitLogic pages and previously verified condition data remain available where the device has already stored them.</p></article>
      </section>
    </main>
    <footer className="desktop-footer"><HomeIcon/><span>BaitLogic Outdoors · Beyond the Bite. Powered by People and Purpose.</span></footer>
  </div>;
}
