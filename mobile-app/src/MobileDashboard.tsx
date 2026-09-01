import {
  Crosshair2Icon, HomeIcon, ReaderIcon, GlobeIcon
} from "@radix-ui/react-icons";
import {
  compass, pressureTrend, relativeUpdated, useBaitLogicConditions, WEATHER_LABELS
} from "./useBaitLogicConditions";
import "./mobile-dashboard.css";

const education = [
  { title: "Camping", img: "/assets/pillar-camping.webp" },
  { title: "Hiking", img: "/assets/hero-sunset.webp" },
  { title: "Preparedness", img: "/assets/pillar-conservation.webp" },
  { title: "Wildlife", img: "/assets/pillar-conservation.webp" },
  { title: "Fishing", img: "/assets/pillar-fishing.webp" },
  { title: "Conservation", img: "/assets/pillar-conservation.webp" },
];

function Logo() {
  return (
    <img
      className="bl-logo"
      src="/assets/baitlogic-boysenberry-logo.svg"
      alt="BaitLogic Outdoors"
    />
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  cls = "",
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  cls?: string;
}) {
  return (
    <div className={`bl-metric ${cls}`}>
      <span className="bl-metric-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail ? <em>{detail}</em> : null}
      </span>
    </div>
  );
}

export default function MobileDashboard() {
  const { snapshot, waterTemp, waterStatus, online, status, refreshLocation } =
    useBaitLogicConditions();
  const w = snapshot?.weather;
  const place = snapshot?.location?.locality || snapshot?.location?.name || "Choose location";
  const region = snapshot?.location?.region
    ?.replace("Illinois", "IL")
    .replace("Missouri", "MO");
  const locationLabel = region && !place.includes(region) ? `${place}, ${region}` : place;
  const live = online && status === "live";

  return (
    <div className="bl-home">
      <header className="bl-header">
        <a href="/" className="bl-brand" aria-label="BaitLogic Outdoors home">
          <Logo />
          <span className="bl-wordmark">
            <strong>BAITLOGIC</strong>
            <b><i />OUTDOORS<i /></b>
            <small><em>Beyond the Bite.</em> Powered by People and Purpose.</small>
            <span className="bl-rainbow" aria-hidden="true" />
          </span>
        </a>
        <button
          className="bl-location"
          onClick={refreshLocation}
          type="button"
          aria-label="Refresh current location and conditions"
        >
          <Crosshair2Icon />
          <span>
            <strong>{locationLabel}</strong>
            <small>● {live ? "LIVE" : status === "cached" ? "CACHED" : "CHECK"}</small>
          </span>
        </button>
      </header>

      <main className="bl-main">
        <section className="bl-conditions" aria-label="Outdoor conditions">
          <div className="bl-conditions-top">
            <div>
              <h1>
                OUTDOOR CONDITIONS <span>{live ? "● LIVE" : status === "cached" ? "● CACHED" : "● CHECK"}</span>
              </h1>
              <div className="bl-temp-row">
                <span className="bl-weather-icon">{w && [0, 1].includes(w.code) ? "☀" : "☁"}</span>
                <div>
                  <strong>{w ? `${Math.round(w.temperatureF)}°F` : "—"}</strong>
                  <p>{w ? WEATHER_LABELS[w.code] || "Current conditions" : "Unavailable"}</p>
                </div>
              </div>
            </div>
            <div className="bl-hero-photo" aria-hidden="true" />
          </div>

          <div className="bl-condition-metrics">
            <Metric
              icon="💧"
              label="Water"
              value={waterTemp != null ? `${waterTemp.toFixed(1)}°F` : "—"}
              detail={waterTemp != null ? (waterStatus === "cached" ? "Cached" : "Verified") : "No verified reading"}
              cls="water"
            />
            <Metric icon="≋" label="Wind" value={w ? `${Math.round(w.windMph)} mph ${compass(w.windDirection)}` : "—"} cls="wind" />
            <Metric icon="◴" label="Pressure" value={w ? `${w.pressureInHg.toFixed(2)} inHg` : "—"} detail={w ? pressureTrend(w.pressureDelta3h) : "Unavailable"} cls="pressure" />
            <Metric icon="◷" label="Updated" value={relativeUpdated(snapshot?.updatedAt)} cls="updated" />
          </div>
          <a className="bl-primary-cta" href="/barometer.html">VIEW LOCAL CONDITIONS <span>→</span></a>
        </section>

        <section className="bl-report-now" aria-label="See something say something">
          <div className="bl-alert-icon">!</div>
          <div>
            <h2>SEE SOMETHING? SAY SOMETHING.</h2>
            <p>Report pollution, fish kills, wildlife concerns, or unsafe conditions.</p>
          </div>
          <a href="/field-intel.html#conservation">REPORT NOW <span>▣</span></a>
        </section>

        <section className="bl-agency" aria-label="Report to the right agency">
          <div>
            <h2>REPORT TO THE RIGHT AGENCY</h2>
            <p>Your reports help protect our waters, wildlife, and public safety.</p>
          </div>
          <a className="illinois" href="https://dnr2.illinois.gov/OLETIPHotline/" target="_blank" rel="noopener noreferrer">
            <span className="state-icon">IL</span>
            <span><strong>REPORT TO IL DNR</strong><small>Illinois Department of Natural Resources</small></span>
          </a>
          <a className="missouri" href="https://mdc12.mdc.mo.gov/Applications/FishKillsIntake/Intake" target="_blank" rel="noopener noreferrer">
            <span className="state-icon">MO</span>
            <span><strong>REPORT TO MO CONS.</strong><small>Missouri Department of Conservation</small></span>
          </a>
        </section>

        <section className="bl-feature-grid" aria-label="Outdoor tools">
          <a className="bl-feature water-flow" href="/field-intel.html#water">
            <div><h2>≋ WATER &amp; FLOW</h2><p>Stream levels, flow, temperature &amp; pressure data.</p></div>
            <span className="bl-feature-arrow">→</span>
          </a>
          <a className="bl-feature catches" href="/catches.html">
            <div><h2>⌾ LOCAL CATCHES</h2><p>Recent catches, species reports &amp; activity.</p></div>
            <span className="bl-feature-arrow">→</span>
          </a>
          <a className="bl-feature trails" href="/trails.html">
            <div><h2>♜ TRAILS &amp; MAPS</h2><p>Explore trails with offline maps &amp; directions.</p></div>
            <span className="bl-feature-arrow">→</span>
          </a>
        </section>

        <section className="bl-education">
          <div className="bl-section-row">
            <h2>OUTDOOR EDUCATION</h2>
            <a href="/outdoor.html">LEARN MORE →</a>
          </div>
          <div className="bl-education-row">
            {education.map((item) => (
              <a href="/outdoor.html" className="bl-education-card" key={item.title}>
                <span>{item.title}</span>
                <div style={{ backgroundImage: `url("${item.img}")` }} />
              </a>
            ))}
          </div>
          <div className="bl-dots" aria-hidden="true"><b /><i /><i /><i /><i /></div>
        </section>

        <section className="bl-sources" aria-label="Trusted data sources">
          <span>💧 <b>USGS</b> Water Data</span>
          <span>⛈ <b>NWS</b> Weather</span>
          <span>☀ <b>Open-Meteo</b></span>
          <span>◉ <b>Offline Ready</b></span>
        </section>
      </main>

      <nav className="bl-bottom-nav" aria-label="App navigation">
        <a className="active" href="/"><HomeIcon /><span>Home</span></a>
        <a href="/trails.html"><GlobeIcon /><span>Maps</span></a>
        <a className="log" href="/field-intel.html#field-check"><span className="plus">＋</span><span>Log</span></a>
        <a href="/field-intel.html#conservation"><ReaderIcon /><span>Reports</span></a>
        <a href="/profile.html"><span className="profile-icon">◎</span><span>Profile</span></a>
      </nav>
    </div>
  );
}
