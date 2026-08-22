import { type PropsWithChildren, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BellIcon, BookmarkFilledIcon, BookmarkIcon, CheckCircledIcon, ChevronRightIcon,
  Cross2Icon, Crosshair2Icon, ExternalLinkIcon, EyeOpenIcon, GlobeIcon, HeartIcon, HomeIcon, LockClosedIcon,
  MagnifyingGlassIcon, PaperPlaneIcon, PersonIcon, PlusIcon, ReloadIcon, Share1Icon,
} from "@radix-ui/react-icons";
import {
  addFieldCheck, backendConfigured, persistSavedIds, readFieldChecks, readSavedIds, relativeTime,
  saveWeeklyEmail, syncBaitLogicData, type FieldCheck, type SyncMode,
} from "./data/baitlogicData";

type Tab = "home" | "explore" | "community" | "saved";
type ReportingState = "Illinois" | "Missouri";

type WeatherSnapshot = {
  updatedAt: string;
  location: { name: string; locality?: string; region?: string } | null;
  weather: {
    temperatureF: number;
    apparentTemperatureF: number;
    code: number;
    pressureInHg: number;
    pressureDelta3h: number;
    pressureDelta6h: number;
    windMph: number;
    windDirection: number;
    gustMph: number;
    cloudCover: number;
    precipitationIn: number;
  };
  alerts?: Array<{ event?: string; severity?: string }>;
};

type ConditionsState = {
  status: "idle" | "locating" | "loading" | "live" | "cached" | "error";
  data?: WeatherSnapshot;
  message?: string;
};

const CONDITIONS_CACHE_KEY = "baitlogic-live-conditions-v1";
const weatherLabels: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
  95: "Thunderstorms", 96: "Thunderstorms with hail", 99: "Severe thunderstorms with hail",
};

function validSnapshot(value: unknown): value is WeatherSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WeatherSnapshot>;
  const weather = candidate.weather;
  return Boolean(
    weather
    && [
      weather.temperatureF, weather.apparentTemperatureF, weather.code, weather.pressureInHg,
      weather.pressureDelta3h, weather.pressureDelta6h, weather.windMph, weather.windDirection,
      weather.gustMph, weather.cloudCover, weather.precipitationIn,
    ].every((item) => Number.isFinite(Number(item)))
    && candidate.updatedAt,
  );
}

function readConditionsCache() {
  try {
    const value = JSON.parse(localStorage.getItem(CONDITIONS_CACHE_KEY) || "null") as unknown;
    return validSnapshot(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function compassDirection(degrees: number) {
  if (!Number.isFinite(degrees)) return "—";
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

function pressureTrend(delta3: number, delta6: number) {
  const delta = Math.abs(delta3) >= 0.02 ? delta3 : delta6 / 2;
  if (delta <= -0.06) return "Falling fast";
  if (delta < -0.02) return "Falling";
  if (delta >= 0.06) return "Rising fast";
  if (delta > 0.02) return "Rising";
  return "Steady";
}

function updatedLabel(iso?: string, includeDate = false) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "time unavailable";
  return new Intl.DateTimeFormat("en-US", includeDate
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

type AppSheetProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  snap?: number;
}>;

function AppSheet({ open, onOpenChange, title, description, snap = 0.72, children }: AppSheetProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="native-sheet-layer">
      <button
        type="button"
        className="sheet-overlay native-sheet-overlay"
        aria-label={`Dismiss ${title}`}
        onClick={() => onOpenChange(false)}
      />
      <section
        className="bottom-sheet native-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={{ maxHeight: `${Math.round(snap * 100)}dvh` }}
      >
        <div className="sheet-handle-zone" aria-hidden="true"><div className="sheet-handle" /></div>
        <div className="sheet-header native-sheet-header">
          <div>
            <h2 id={titleId} className="sheet-title">{title}</h2>
            {description ? <p id={descriptionId} className="sheet-description">{description}</p> : null}
          </div>
          <button type="button" className="sheet-close" aria-label={`Close ${title}`} onClick={() => onOpenChange(false)}><Cross2Icon /></button>
        </div>
        <div className="sheet-content">{children}</div>
      </section>
    </div>
  );
}

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
const captchaEnabled = Boolean(turnstileSiteKey);
const facebookUrl = "https://www.facebook.com/share/1C3i4dL3vk/";
const instagramUrl = "https://www.instagram.com/baitlogicadmin?igsh=MTVuOHV2dDljaTd3Yg==";
const officialReporting = {
  Illinois: {
    wildlifeAgency: "Illinois DNR",
    wildlifePhone: "1-877-236-7529",
    wildlifePhoneHref: "tel:+18772367529",
    wildlifeUrl: "https://dnr.illinois.gov/lawenforcement/target-poachers.html",
    environmentAgency: "Illinois EPA",
    environmentLabel: "Submit a pollution complaint",
    environmentUrl: "https://epa.illinois.gov/pollution-complaint/submit-a-complaint.html",
    emergencyLabel: "Environmental emergency · 1-800-782-7860",
    emergencyHref: "tel:+18007827860",
  },
  Missouri: {
    wildlifeAgency: "Missouri Conservation",
    wildlifePhone: "1-800-392-1111",
    wildlifePhoneHref: "tel:+18003921111",
    wildlifeUrl: "https://mdc.mo.gov/contact-engage/report-illegal-activity",
    environmentAgency: "Missouri DNR",
    environmentLabel: "Report an environmental concern",
    environmentUrl: "https://dnr.mo.gov/reporting/environmental-concern",
    emergencyLabel: "24-hour spill line · 573-634-2436",
    emergencyHref: "tel:+15736342436",
  },
} as const;
const currentDateLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date()).replace(",", " ·");

function TurnstileChallenge({ onToken }: { onToken: (token?: string) => void }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let widgetId: string | undefined;
    let disposed = false;
    const render = () => {
      if (disposed || !container.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: turnstileSiteKey,
        theme: "light",
        size: "flexible",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(undefined),
        "error-callback": () => onToken(undefined),
      });
    };

    let script = document.querySelector<HTMLScriptElement>('script[data-baitlogic-turnstile="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.baitlogicTurnstile = "true";
      document.head.appendChild(script);
    }
    if (window.turnstile) render(); else script.addEventListener("load", render, { once: true });

    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!turnstileSiteKey) return null;
  return <div className="turnstile-shell"><div ref={container} /><small>Quiet bot protection keeps community notes useful.</small></div>;
}

function MiniLogo() {
  return <img className="brand-logo" src="/assets/baitlogic-logo.png" alt="BaitLogic Outdoors" />;
}

function ConnectionPill({ online, mode, communityCount }: { online: boolean; mode: SyncMode; communityCount: number }) {
  const label = !online
    ? "Offline ready"
    : mode === "syncing"
      ? "Syncing"
      : mode === "synced"
        ? communityCount > 0
          ? `${communityCount} community ${communityCount === 1 ? "note" : "notes"}`
          : "BaitLogic connected"
        : "Device copy";
  return <span className={`connection-pill ${online ? "is-online" : "is-offline"}`}><span className="connection-dot" />{label}</span>;
}

export default function Prototype() {
  const [tab, setTab] = useState<Tab>("home");
  const [online, setOnline] = useState(navigator.onLine);
  const [reportOpen, setReportOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<number[]>(readSavedIds);
  const [reports, setReports] = useState<FieldCheck[]>(readFieldChecks);
  const [syncMode, setSyncMode] = useState<SyncMode>(navigator.onLine ? "device" : "offline");
  const [category, setCategory] = useState("Water");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [selectedReportingState, setSelectedReportingState] = useState<ReportingState>();
  const [reportCaptcha, setReportCaptcha] = useState<string>();
  const [emailCaptcha, setEmailCaptcha] = useState<string>();
  const [syncCaptcha, setSyncCaptcha] = useState<string>();
  const [conditions, setConditions] = useState<ConditionsState>(() => {
    const cached = readConditionsCache();
    if (cached) return { status: "cached", data: cached, message: "Showing the last verified conditions while BaitLogic refreshes." };
    return { status: navigator.onLine ? "idle" : "error", message: navigator.onLine ? "Waiting for location." : "No saved conditions are available offline yet." };
  });
  const conditionsStarted = useRef(false);
  const approvedReports = reports.filter((report) => report.syncState === "approved");

  const loadConditions = useCallback(async () => {
    const cached = readConditionsCache();
    if (!navigator.onLine) {
      setConditions(cached
        ? { status: "cached", data: cached, message: "Offline · showing the last verified conditions." }
        : { status: "error", message: "No saved conditions are available offline yet." });
      return;
    }
    if (!navigator.geolocation) {
      setConditions(cached
        ? { status: "cached", data: cached, message: "This browser cannot refresh location. Showing saved conditions." }
        : { status: "error", message: "This browser does not provide location access." });
      return;
    }

    setConditions((current) => ({ ...current, status: "locating", message: "Requesting your current location…" }));
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 60_000,
        });
      });
      setConditions((current) => ({ ...current, status: "loading", message: "Loading verified local conditions…" }));

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch(`/api/barometer-snapshot?lat=${encodeURIComponent(position.coords.latitude)}&lon=${encodeURIComponent(position.coords.longitude)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = await response.json() as unknown;
        if (!response.ok || !validSnapshot(payload)) throw new Error("Live weather could not be verified.");
        const servedFromCache = response.headers.get("X-BaitLogic-Source") === "offline-cache";
        localStorage.setItem(CONDITIONS_CACHE_KEY, JSON.stringify(payload));
        setConditions(servedFromCache
          ? { status: "cached", data: payload, message: "The live source was unreachable. Showing the last verified conditions." }
          : { status: "live", data: payload, message: "Live conditions verified." });
      } finally {
        window.clearTimeout(timer);
      }
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
      const message = code === 1
        ? "Location permission is off. Allow location for bait-logic.com, then tap here to retry."
        : error instanceof DOMException && error.name === "AbortError"
          ? "Live conditions timed out. Tap here to retry."
          : "Live conditions could not be verified. Tap here to retry.";
      const saved = readConditionsCache();
      setConditions(saved ? { status: "cached", data: saved, message: `${message} Showing the last verified conditions.` } : { status: "error", message });
    }
  }, []);

  useEffect(() => {
    let current = true;
    const refresh = async (isOnline: boolean) => {
      setOnline(isOnline);
      setSyncMode(isOnline && backendConfigured ? "syncing" : isOnline ? "device" : "offline");
      const result = await syncBaitLogicData(isOnline);
      if (!current) return;
      setReports(result.fieldChecks);
      setSyncMode(result.mode);
    };
    const connected = () => void refresh(true);
    const disconnected = () => void refresh(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    void refresh(navigator.onLine);
    return () => { current = false; window.removeEventListener("online", connected); window.removeEventListener("offline", disconnected); };
  }, []);

  useEffect(() => {
    if (conditionsStarted.current) return;
    conditionsStarted.current = true;
    void loadConditions();
    const refreshAfterReconnect = () => void loadConditions();
    window.addEventListener("online", refreshAfterReconnect);
    return () => window.removeEventListener("online", refreshAfterReconnect);
  }, [loadConditions]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const weather = conditions.data?.weather;
  const reportingState: ReportingState = selectedReportingState
    ?? (conditions.data?.location?.region?.toLowerCase().includes("missouri") ? "Missouri" : "Illinois");
  const locationName = conditions.data?.location?.name || "Current area";
  const localityName = conditions.data?.location?.locality || conditions.data?.location?.name?.split(",")[0] || "your area";
  const conditionName = weather ? weatherLabels[weather.code] || "Current conditions" : "Conditions unavailable";
  const trend = weather ? pressureTrend(weather.pressureDelta3h, weather.pressureDelta6h) : "—";
  const conditionsAreLive = conditions.status === "live";
  const localPicture = useMemo(() => conditions.data ? [{
    id: 1001,
    eyebrow: conditionsAreLive ? "WEATHER · LIVE" : "WEATHER · SAVED OFFLINE",
    title: `${conditionName} · ${Math.round(conditions.data.weather.temperatureF)}°F`,
    detail: `${locationName} · ${conditionsAreLive ? "Updated" : "Saved"} ${updatedLabel(conditions.data.updatedAt, !conditionsAreLive)}`,
    image: "/assets/hero-observer.png",
    accent: "water",
  }] : [], [conditionName, conditions.data, conditionsAreLive, locationName]);

  const toggleSave = (id: number) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      persistSavedIds(next);
      setNotice(current.includes(id) ? "Removed from Saved" : "Saved for offline");
      return next;
    });
  };

  const submitReport = async () => {
    if (!note.trim()) { setNotice("Add one quick observation first"); return; }
    setReports(addFieldCheck(category, note, localityName === "your area" ? "Area not shared" : `${localityName} area`)); setNote("");
    setReportOpen(false); setTab("community");
    setNotice(online && backendConfigured ? "Submitting Field Check" : "Saved on this device");
    const result = await syncBaitLogicData(navigator.onLine, { field: reportCaptcha });
    setReports(result.fieldChecks); setSyncMode(result.mode);
    setReportCaptcha(undefined);
    setNotice(result.mode === "synced" ? "Submitted · awaiting community review" : navigator.onLine ? "Saved on this device" : "Saved offline · ready to sync");
  };
  const join = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail.includes("@")) { setNotice("Enter a valid email"); return; }
    saveWeeklyEmail(normalizedEmail); setEmail(""); setJoinOpen(false);
    const result = await syncBaitLogicData(navigator.onLine, { email: emailCaptcha });
    setReports(result.fieldChecks); setSyncMode(result.mode);
    setEmailCaptcha(undefined);
    setNotice(result.emailSynced ? "You’re on the weekly local list" : "Email saved on this device");
  };

  const syncPending = async () => {
    if (!navigator.onLine) { setNotice("Reconnect before syncing"); return; }
    const result = await syncBaitLogicData(true, { field: syncCaptcha });
    setReports(result.fieldChecks); setSyncMode(result.mode);
    if (result.mode === "synced") { setSyncOpen(false); setSyncCaptcha(undefined); }
    setNotice(result.mode === "synced" ? "Field Checks submitted for review" : "Still saved safely on this device");
  };

  const shareItem = async (title: string, detail: string) => {
    const text = `${title} — ${detail}\nBaitLogic Outdoors`;
    try {
      if (navigator.share) { await navigator.share({ title, text }); setNotice("Share sheet opened"); return; }
      await navigator.clipboard.writeText(text); setNotice("Field note copied");
    } catch { setNotice("Sharing canceled"); }
  };

  const showTab = (next: Tab) => setTab(next);
  const latestReport = (categoryName: string) => reports.find((report) => report.category.toLowerCase() === categoryName.toLowerCase());
  const reportDetail = (categoryName: string) => {
    const report = latestReport(categoryName);
    if (!report) return "No verified report yet";
    return `${report.syncState === "approved" ? "Community verified" : "Your saved report"} · ${relativeTime(report.createdAt)}`;
  };
  const topics = [
    ["Weather", weather ? `${conditionName} · ${Math.round(weather.temperatureF)}°F` : "Location needed for live data"],
    ["Water", reportDetail("Water")],
    ["Wildlife", reportDetail("Wildlife")],
    ["Trails", reportDetail("Trail")],
    ["Conservation", reportDetail("Conservation")],
  ];
  const visibleTopics = topics.filter(([name, detail]) => `${name} ${detail}`.toLowerCase().includes(search.trim().toLowerCase()));
  const conditionsStatus = conditionsAreLive
    ? `Live · ${updatedLabel(conditions.data?.updatedAt)}`
    : conditions.data
      ? `Saved · ${updatedLabel(conditions.data.updatedAt, true)}`
      : conditions.status === "locating"
        ? "Finding your location"
        : conditions.status === "loading"
          ? "Loading live conditions"
          : "Location needed";
  const signalText = (() => {
    const alert = conditions.data?.alerts?.[0];
    if (alert) return `Active NWS ${alert.event || "weather alert"}. Check the official warning before heading out.`;
    if (!weather) return conditions.message || "Allow location to load current weather, pressure, and wind.";
    if ([95, 96, 99].includes(weather.code)) return "Thunderstorm conditions are present. Seek appropriate shelter and follow official warnings.";
    if (weather.apparentTemperatureF >= 100) return `Feels like ${Math.round(weather.apparentTemperatureF)}°F. Heat safety should lead the plan.`;
    if (weather.windMph >= 20 || weather.gustMph >= 30) return `${conditionName} with ${Math.round(weather.windMph)} mph wind and gusts near ${Math.round(weather.gustMph)} mph.`;
    return `${conditionName}, ${trend.toLowerCase()} pressure, and ${Math.round(weather.windMph)} mph wind from the ${compassDirection(weather.windDirection)}.`;
  })();
  const storedItemCount = reports.length + localPicture.length;
  const reporting = officialReporting[reportingState];

  return (
    <div className="app-shell">
      <header className="app-header">
        <MiniLogo />
        <div className="location-block"><span className="location-label">BAITLOGIC OUTDOORS</span><button className="location-button" onClick={() => void loadConditions()} aria-label="Refresh current location and conditions">{conditions.data?.location?.name || "Use current location"} <ChevronRightIcon /></button></div>
        <button className="icon-button" aria-label="Notifications" onClick={() => setNotice("You’re all caught up")}><BellIcon /></button>
      </header>

      <div className="app-screen native-scroll">
        <main className="screen-content" data-testid="baitlogic-home" aria-label="BaitLogic Outdoors local field intelligence">
          {tab === "home" && <>
            <section className="hero-card">
              <img src="/assets/hero-observer.png" alt="Outdoor observer beside a southern Illinois lake" /><div className="hero-shade" />
              <div className="hero-topline"><ConnectionPill online={online} mode={syncMode} communityCount={approvedReports.length} /><button className="conditions-status" onClick={() => void loadConditions()}>{conditionsStatus}</button></div>
              <div className="hero-copy"><p>{currentDateLabel}</p><h1>{conditions.data?.location?.locality || conditions.data?.location?.name?.split(",")[0] || "Your"} outdoor pulse</h1><span>Verified weather when online. Clearly dated saved conditions when offline.</span></div>
            </section>
            <section className="conditions-grid" aria-label="Verified local weather conditions" aria-live="polite">
              <div><span>NOW</span><strong>{weather ? `${Math.round(weather.temperatureF)}°` : "—"}</strong><small>{weather ? `${conditionName} · feels ${Math.round(weather.apparentTemperatureF)}°` : "Waiting for verified data"}</small></div><div><span>PRESSURE</span><strong>{weather ? trend : "—"}</strong><small>{weather ? `${weather.pressureInHg.toFixed(2)} inHg` : "Waiting for verified data"}</small></div><div><span>WIND</span><strong>{weather ? `${Math.round(weather.windMph)} mph` : "—"}</strong><small>{weather ? `${compassDirection(weather.windDirection)} · gusts ${Math.round(weather.gustMph)}` : "Waiting for verified data"}</small></div>
            </section>
            <section className="watch-card" aria-labelledby="watch-card-title">
              <div className="watch-heading"><span>SEE SOMETHING? SAY SOMETHING.</span><strong id="watch-card-title">Know what matters. Make a difference.</strong></div>
              <ol className="watch-steps">
                <li><b>1</b><span><strong>Notice</strong> poaching, dumping, fish kills, illegal hunting, or unusual discharge.</span></li>
                <li><b>2</b><span><strong>Document safely</strong> what, when, and the general location. Never confront anyone.</span></li>
                <li><b>3</b><span><strong>Report directly</strong> to the correct Illinois or Missouri agency.</span></li>
              </ol>
              <button onClick={() => setReportOpen(true)}>Open the official reporting guide <ChevronRightIcon /></button>
            </section>
            <section className={`notice-card ${conditions.status === "error" ? "needs-location" : ""}`}><div className="notice-icon"><EyeOpenIcon /></div><div><span>{conditionsAreLive ? "THE LIVE SIGNAL" : conditions.data ? "SAVED CONDITIONS" : "LIVE CONDITIONS NEEDED"}</span><strong>{signalText}</strong>{conditions.message && conditions.status !== "live" && conditions.data ? <small>{conditions.message}</small> : null}</div></section>
            <button className="primary-cta" onClick={() => setReportOpen(true)}><span className="cta-icon"><PlusIcon /></span><span><strong>What did you notice?</strong><small>Report to officials or add a community Field Check</small></span><ChevronRightIcon /></button>
            <p className="privacy-line"><LockClosedIcon /> No expertise needed. Exact spots stay private.</p>
            <section className="section-block">
              <div className="section-heading"><div><p>AROUND {localityName.toUpperCase()}</p><h2>The verified picture</h2></div><button onClick={() => showTab("explore")}>Explore <ChevronRightIcon /></button></div>
              <div className="feed-list">{localPicture.map((item) => <article className="feed-card" key={item.id}><img src={item.image} alt="" /><div className="feed-body"><p className={`feed-eyebrow ${item.accent}`}>{item.eyebrow}</p><h3>{item.title}</h3><span>{item.detail}</span><div className="feed-actions"><button onClick={() => toggleSave(item.id)}>{saved.includes(item.id) ? <BookmarkFilledIcon /> : <BookmarkIcon />}{saved.includes(item.id) ? "Saved" : "Save"}</button><button onClick={() => void shareItem(item.title, item.detail)}><Share1Icon /> Share</button></div></div></article>)}{localPicture.length === 0 ? <div className="truth-empty"><ReloadIcon /><div><strong>No verified local conditions loaded.</strong><span>Use your location to replace blanks with current weather, pressure, and wind.</span></div><button onClick={() => void loadConditions()}>Use my location</button></div> : null}</div>
            </section>
            <section className="weekly-card"><div className="weekly-icon"><PaperPlaneIcon /></div><div><span>THE WEEKLY LOCAL PICTURE</span><strong>Weather, water, wildlife, and one good way to help.</strong><small>Free. Useful. Never noisy.</small></div><button onClick={() => setJoinOpen(true)}>Join free</button></section>
            <section className="social-card" aria-label="Follow BaitLogic Outdoors">
              <div><span>FOLLOW THE FIELD</span><strong>Keep the local outdoor conversation going.</strong></div>
              <div className="social-links">
                <a href={facebookUrl} target="_blank" rel="noreferrer">Facebook <ExternalLinkIcon /></a>
                <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram <ExternalLinkIcon /></a>
              </div>
            </section>
          </>}

          {tab === "explore" && <section className="tab-view"><div className="view-kicker"><GlobeIcon /> LOCAL INTELLIGENCE</div><h1>Explore {localityName}</h1><p className="view-lead">Live weather plus actual community Field Checks—without filling empty categories with made-up reports.</p><div className="search-shell"><MagnifyingGlassIcon /><input aria-label="Search places, species, or reports" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search places, species, or reports" />{search ? <button aria-label="Clear search" onClick={() => setSearch("")}><Cross2Icon /></button> : null}</div><div className="topic-grid">{visibleTopics.map(([name, detail]) => <button key={name} onClick={() => setNotice(`${name} view selected`)}><strong>{name}</strong><span>{detail}</span><ChevronRightIcon /></button>)}</div>{visibleTopics.length === 0 ? <p className="empty-state">No local topics match that search yet.</p> : null}<div className="map-card"><Crosshair2Icon /><div><strong>{localityName === "your area" ? "Current area" : `${localityName} area`}</strong><span>Precise community locations stay private.</span></div></div></section>}

          {tab === "community" && <section className="tab-view"><div className="view-kicker"><PersonIcon /> COMMUNITY FIELD NOTES</div><h1>Useful beats impressive.</h1><p className="view-lead">Only actual submitted or locally saved observations appear here.</p><button className="compact-cta" onClick={() => setReportOpen(true)}><PlusIcon /> What did you notice?</button><div className="report-list">{reports.map((report) => <article key={report.id}><div className={`avatar ${report.syncState === "approved" ? "verified" : ""}`}>BL</div><div><span>{report.category} · {relativeTime(report.createdAt)}</span><strong>{report.note}</strong><small>{report.syncState === "approved" ? <CheckCircledIcon /> : <LockClosedIcon />} {report.syncState === "approved" ? "Community approved" : report.syncState === "submitted" ? "Awaiting review" : "Saved on this device"} · {report.place}</small></div></article>)}{reports.length === 0 ? <p className="empty-state">No real Field Checks have been posted for this device or community yet.</p> : null}</div></section>}

          {tab === "saved" && <section className="tab-view"><div className="view-kicker"><BookmarkIcon /> YOUR FIELD KIT</div><h1>Saved for the next outing.</h1><p className="view-lead">Your actual reports and last verified conditions remain available when service drops.</p><div className="offline-panel"><ReloadIcon /><div><strong>{online ? syncMode === "synced" ? "Device copy is synced with BaitLogic" : "Offline copy is current" : "You’re viewing the offline copy"}</strong><span>{storedItemCount} verified or user-created {storedItemCount === 1 ? "item" : "items"} stored on this device</span></div><CheckCircledIcon /></div>{captchaEnabled && online && reports.some((report) => report.syncState === "pending") ? <button className="sync-button" onClick={() => setSyncOpen(true)}><ReloadIcon /> Verify & sync saved Field Checks</button> : null}<div className="feed-list saved-list">{localPicture.filter((item) => saved.includes(item.id)).map((item) => <article className="feed-card" key={item.id}><img src={item.image} alt="" /><div className="feed-body"><p className={`feed-eyebrow ${item.accent}`}>{item.eyebrow}</p><h3>{item.title}</h3><span>{item.detail}</span><div className="feed-actions"><button onClick={() => toggleSave(item.id)}><BookmarkFilledIcon /> Saved</button></div></div></article>)}</div></section>}
          <div className="scroll-spacer" />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={tab === "home" ? "active" : ""} onClick={() => showTab("home")}><HomeIcon /><span>Home</span></button><button className={tab === "explore" ? "active" : ""} onClick={() => showTab("explore")}><MagnifyingGlassIcon /><span>Explore</span></button><button className="report-tab" onClick={() => setReportOpen(true)}><span><PlusIcon /></span><small>Report</small></button><button className={tab === "community" ? "active" : ""} onClick={() => showTab("community")}><HeartIcon /><span>Community</span></button><button className={tab === "saved" ? "active" : ""} onClick={() => showTab("saved")}><BookmarkIcon /><span>Saved</span></button>
      </nav>

      <AppSheet open={reportOpen} onOpenChange={(open) => { setReportOpen(open); if (!open) setReportCaptcha(undefined); }} title="See something? Say something." description="Learn what to notice, report official concerns directly, or share a general-area Field Check." snap={0.92}>
        <div className="sheet-form report-sheet-form">
          <section className="official-report-card" aria-labelledby="official-report-heading">
            <span className="official-kicker">OFFICIAL REPORTING</span>
            <h3 id="official-report-heading">Contact the agency—not BaitLogic—for violations or environmental concerns.</h3>
            <p>A BaitLogic Field Check does not notify officials. In immediate danger, call <a href="tel:911">911</a>.</p>
            <div className="state-switch" aria-label="Choose reporting state">
              {(["Illinois", "Missouri"] as const).map((state) => <button type="button" className={reportingState === state ? "selected" : ""} aria-pressed={reportingState === state} onClick={() => setSelectedReportingState(state)} key={state}>{state}</button>)}
            </div>
            <div className="official-actions">
              <a href={reporting.wildlifeUrl} target="_blank" rel="noreferrer"><EyeOpenIcon /><span><strong>Wildlife violation</strong><small>{reporting.wildlifeAgency} · Open official reporting page</small></span><ExternalLinkIcon /></a>
              <a href={reporting.environmentUrl} target="_blank" rel="noreferrer"><GlobeIcon /><span><strong>Environmental concern</strong><small>{reporting.environmentAgency} · {reporting.environmentLabel}</small></span><ExternalLinkIcon /></a>
            </div>
            <div className="official-support-links">
              <a href={reporting.wildlifePhoneHref}>Call {reporting.wildlifeAgency} · {reporting.wildlifePhone}</a>
              <a href={reporting.emergencyHref}>{reporting.emergencyLabel}</a>
            </div>
          </section>
          <section className="what-to-watch" aria-labelledby="what-to-watch-heading">
            <span>WHAT TO LOOK FOR</span>
            <h3 id="what-to-watch-heading">Your observation can help protect a place.</h3>
            <ul>
              <li>Illegal taking, trapping, harassment, sale, or possession of wildlife.</li>
              <li>Dumped waste, oil or chemical sheen, odd-colored discharge, strong chemical odor, fish kill, or harmful algae.</li>
              <li>Note what happened, the time, a safe general location, descriptions, and photos only when safe and legal.</li>
            </ul>
            <p><strong>Stay safe:</strong> do not confront anyone, trespass, touch hazardous material, or put yourself at risk.</p>
          </section>
          <div className="field-check-divider"><span>OPTIONAL COMMUNITY FIELD CHECK</span><p>After contacting officials when needed, share a non-emergency general-area observation with BaitLogic.</p></div>
          <label>WHAT KIND OF SIGNAL?</label>
          <div className="category-row">{["Water", "Wildlife", "Trail", "Weather", "Conservation"].map((item) => <button type="button" className={category === item ? "selected" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
          <label htmlFor="observation">WHAT DID YOU NOTICE?</label>
          <textarea id="observation" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Example: Clear water near the bank; more bird movement than yesterday…" />
          <div className="privacy-card"><LockClosedIcon /><div><strong>Privacy is the default</strong><span>We show only the general {localityName === "your area" ? "area" : `${localityName} area`}, never your exact spot.</span></div></div>
          {online && backendConfigured ? <TurnstileChallenge onToken={setReportCaptcha} /> : null}
          <button className="submit-button" disabled={captchaEnabled && online && backendConfigured && !reportCaptcha} onClick={() => void submitReport()}>{online && backendConfigured ? "Submit Field Check" : online ? "Save on this device" : "Save offline"}<ChevronRightIcon /></button>
        </div>
      </AppSheet>
      <AppSheet open={joinOpen} onOpenChange={(open) => { setJoinOpen(open); if (!open) setEmailCaptcha(undefined); }} title="Get the weekly local picture" description="One genuinely useful email. No paywall, no clutter." snap={captchaEnabled ? 0.66 : 0.52}><div className="sheet-form"><label htmlFor="weekly-email">EMAIL</label><input id="weekly-email" name="weekly-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><div className="trust-row"><CheckCircledIcon /> Unsubscribe anytime · exact locations never included.</div>{online && backendConfigured ? <TurnstileChallenge onToken={setEmailCaptcha} /> : null}<button className="submit-button" disabled={captchaEnabled && online && backendConfigured && !emailCaptcha} onClick={() => void join()}>Join free <ChevronRightIcon /></button></div></AppSheet>
      <AppSheet open={syncOpen} onOpenChange={(open) => { setSyncOpen(open); if (!open) setSyncCaptcha(undefined); }} title="Sync saved Field Checks" description="One quick privacy-friendly check, then your offline notes can join the review queue." snap={0.46}><div className="sheet-form"><TurnstileChallenge onToken={setSyncCaptcha} /><button className="submit-button" disabled={!syncCaptcha} onClick={() => void syncPending()}>Verify & sync <ReloadIcon /></button></div></AppSheet>
      {notice && <div className="toast" role="status"><CheckCircledIcon /> {notice}</div>}
    </div>
  );
}