import {
  Crosshair2Icon, HomeIcon, ReaderIcon, GlobeIcon, PersonIcon,
  LapTimerIcon, SunIcon, ActivityLogIcon
} from "@radix-ui/react-icons";
import {
  compass, formatClock, pressureTrend, relativeUpdated, useBaitLogicConditions, WEATHER_LABELS
} from "./useBaitLogicConditions";
import "./mobile-dashboard.css";

const cards = [
  {
    cls:"reporting",
    title:"CONSERVATION REPORTING · LOCAL",
    text:"If you see something, say something.",
    cta:"REPORT / RESOURCES",
    href:"/field-intel.html#conservation",
    img:"/assets/hero-sunset.webp",
    icon:"♧"
  },
  {
    cls:"trails",
    title:"TRAILS & OFF-GRID",
    text:"Nearby trails, maps, and off-grid resources.",
    cta:"EXPLORE TRAILS",
    href:"/trails.html",
    img:"/assets/approved-card-conservation.svg",
    icon:"⌁"
  },
  {
    cls:"barometer",
    title:"BAROMETER",
    text:"Real-time weather, pressure, wind and water data.",
    cta:"VIEW DASHBOARD",
    href:"/barometer.html",
    img:"/assets/approved-card-barometer.svg",
    icon:"◴"
  },
  {
    cls:"knowledge",
    title:"OUTDOOR KNOWLEDGE",
    text:"Camping, hiking, safety, wildlife and more.",
    cta:"LEARN MORE",
    href:"/outdoor.html",
    img:"/assets/pillar-camping.webp",
    icon:"▤"
  },
  {
    cls:"field",
    title:"FIELD LOG",
    text:"Track conditions, notes, and observations over time.",
    cta:"OPEN LOG",
    href:"/field-intel.html#field-check",
    img:"/assets/hero-sunset.webp",
    icon:"▣"
  },
  {
    cls:"catches",
    title:"COMMUNITY CATCHES",
    text:"Share your catches. See what others are catching.",
    cta:"VIEW CATCHES",
    href:"/catches.html",
    img:"/assets/approved-card-catches.svg",
    icon:"◎"
  }
];

function Logo({small=false}:{small?:boolean}) {
  return <img className={small?"auth-logo small":"auth-logo"} src="/assets/baitlogic-logo.png" alt={small?"":"BaitLogic Outdoors"} />;
}

export default function MobileDashboard(){
  const {snapshot,waterTemp,online,status,refreshLocation}=useBaitLogicConditions();
  const w=snapshot?.weather;
  const place=snapshot?.location?.locality || snapshot?.location?.name || "Choose location";
  const region=snapshot?.location?.region?.replace("Illinois","IL").replace("Missouri","MO");
  const locationLabel=region && !place.includes(region) ? `${place}, ${region}` : place;
  const live=online&&status==="live";
  const stateLabel=live?"LIVE":status==="cached"?"CACHED":"CHECK";

  return <div className="authorized-home">
    <header className="auth-header">
      <a className="auth-brand" href="/" aria-label="BaitLogic Outdoors home">
        <Logo/>
        <span className="auth-wordmark">
          <strong>BAITLOGIC</strong>
          <b><i/>OUTDOORS<i/></b>
          <small>Beyond the Bite. Powered by People and Purpose.</small>
        </span>
      </a>
      <button className="auth-location" type="button" onClick={refreshLocation}>
        <Crosshair2Icon/>
        <span><strong>{locationLabel}</strong><small>● {stateLabel}</small></span>
      </button>
    </header>

    <main className="auth-main">
      <section className="auth-conditions">
        <a className="auth-section-title" href="/barometer.html">CURRENT CONDITIONS <span>›</span></a>
        <div className="auth-metrics">
          <div><LapTimerIcon/><span><strong>{w?`${w.pressureInHg.toFixed(2)}`:"—"} <i>inHg</i></strong><small>{w?pressureTrend(w.pressureDelta3h):"Unavailable"}</small></span></div>
          <div><span className="glyph">☁</span><span><strong>{w?`${Math.round(w.temperatureF)}°F`:"—"}</strong><small>{w?(WEATHER_LABELS[w.code]||"Current conditions"):"Unavailable"}</small></span></div>
          <div><span className="glyph water">◯</span><span><strong>{waterTemp!=null?`${waterTemp.toFixed(1)}°F`:"—"}</strong><small>Water Temp</small></span></div>
          <div><ActivityLogIcon/><span><strong>{w?`${Math.round(w.windMph)} mph`:"—"}</strong><small>{w?compass(w.windDirection):"Unavailable"}</small></span></div>
          <div><SunIcon/><span><strong>{formatClock(w?.sunrise)}</strong><small>{formatClock(w?.sunset)}</small></span></div>
          <div><span className="glyph clock">◷</span><span><strong>Updated</strong><small>{relativeUpdated(snapshot?.updatedAt)}</small></span></div>
        </div>
      </section>

      <section className="auth-card-grid">
        {cards.map(card=><a className={`auth-card ${card.cls}`} href={card.href} key={card.title}>
          <div className="auth-card-image" style={{backgroundImage:`linear-gradient(180deg,rgba(10,4,12,.06),rgba(12,3,12,.86)),url("${card.img}")`}}/>
          <span className="auth-card-icon">{card.icon}</span>
          <h2>{card.title}</h2>
          <p>{card.text}</p>
          <b>{card.cta} <span>→</span></b>
        </a>)}
      </section>

      <section className="auth-trusted">
        <h2>◇ TRUSTED DATA SOURCES</h2>
        <div>
          <span><strong>USGS</strong><small>Water Data</small></span>
          <span><strong>☁ Open-Meteo</strong><small>Weather</small></span>
          <span><strong>👥 Community</strong><small>Reports</small></span>
        </div>
      </section>

      <a className="auth-strip offline" href="/outdoor.html">
        <span className="strip-icon">⇩</span>
        <span><strong>OFFLINE READY</strong><small>Access key data and maps even when you're off the grid.</small><em>Always prepared. Always outdoors.</em></span>
        <b>›</b>
      </a>

    </main>

    <nav className="auth-bottom-nav" aria-label="App navigation">
      <a className="active" href="/"><HomeIcon/><span>HOME</span></a>
      <a href="/trails.html"><GlobeIcon/><span>MAPS</span></a>
      <a className="center-logo" href="/field-intel.html#field-check" aria-label="Open field log"><Logo small/></a>
      <a href="/field-intel.html#field-check"><ReaderIcon/><span>LOG</span></a>
      <a href="/profile.html"><PersonIcon/><span>PROFILE</span></a>
    </nav>
  </div>;
}
