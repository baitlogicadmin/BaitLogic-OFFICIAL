import { type PropsWithChildren, useEffect, useId, useMemo, useRef, useState } from "react";
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
        aria-label={`Close ${title}`}
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

function ConnectionPill({ online, mode }: { online: boolean; mode: SyncMode }) {
  const label = !online ? "Offline ready" : mode === "syncing" ? "Syncing" : mode === "synced" ? "Community synced" : "Device copy";
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
  const [reportCaptcha, setReportCaptcha] = useState<string>();
  const [emailCaptcha, setEmailCaptcha] = useState<string>();
  const [syncCaptcha, setSyncCaptcha] = useState<string>();

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
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const localPicture = useMemo(() => [
    { id: 1, eyebrow: "WATER · VERIFIED", title: "Clear edges, light surface chop", detail: "Silver Lake · 18 min ago", image: "/assets/water-pulse.png", accent: "water" },
    { id: 2, eyebrow: "WILDLIFE · COMMUNITY", title: "Two doe moving along the east timber", detail: "Highland area · 46 min ago", image: "/assets/hero-observer.png", accent: "wildlife" },
    { id: 3, eyebrow: "CONSERVATION · THIS SATURDAY", title: "Help restore the creek bank", detail: "Meet at 8:00 AM · supplies provided", image: "/assets/habitat-restoration.png", accent: "conservation" },
  ], []);

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
    setReports(addFieldCheck(category, note)); setNote("");
    setReportOpen(false); setTab("community");
    setNotice(online && backendConfigured ? "Submitting Field Check" : "Saved on this device");
    const result = await syncBaitLogicData(navigator.onLine, { field: reportCaptcha });
    setReports(result.fieldChecks); setSyncMode(result.mode);
    setReportCaptcha(undefined);
    setNotice(result.mode === "synced" ? "Submitted · awaiting community review" : navigator.onLine ? "Saved on this device" : "Saved offline · ready to sync");
  };

  const join = async () => {
    if (!email.includes("@")) { setNotice("Enter a valid email"); return; }
    saveWeeklyEmail(email); setJoinOpen(false);
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
  const topics = [["Water", "Clear edges · 68°"], ["Wildlife", "Movement before noon"], ["Trails", "Dry with shaded mud"], ["Conservation", "1 event this week"]];
  const visibleTopics = topics.filter(([name, detail]) => `${name} ${detail}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="app-shell">
      <header className="app-header">
        <MiniLogo />
        <div className="location-block"><span className="location-label">BAITLOGIC OUTDOORS</span><button className="location-button" onClick={() => setNotice("Using Highland, Illinois")}>Highland, Illinois <ChevronRightIcon /></button></div>
        <button className="icon-button" aria-label="Notifications" onClick={() => setNotice("You’re all caught up")}><BellIcon /></button>
      </header>

      <div className="app-screen native-scroll">
        <main className="screen-content" data-testid="baitlogic-home" aria-label="BaitLogic Outdoors local field intelligence">
          {tab === "home" && <>
            <section className="hero-card">
              <img src="/assets/hero-observer.png" alt="Outdoor observer beside a southern Illinois lake" /><div className="hero-shade" />
              <div className="hero-topline"><ConnectionPill online={online} mode={syncMode} /><span>Sample conditions</span></div>
              <div className="hero-copy"><p>{currentDateLabel}</p><h1>Highland outdoor pulse</h1><span>One calm, useful picture before you head outside.</span></div>
            </section>
            <section className="conditions-grid" aria-label="Sample local conditions">
              <div><span>NOW</span><strong>82°</strong><small>Feels like 84°</small></div><div><span>PRESSURE</span><strong>Steady</strong><small>29.94 inHg</small></div><div><span>WIND</span><strong>8 mph</strong><small>From the SW</small></div>
            </section>
            <section className="notice-card"><div className="notice-icon"><EyeOpenIcon /></div><div><span>THE SIGNAL</span><strong>Good movement near cover before the afternoon heat.</strong></div></section>
            <button className="primary-cta" onClick={() => setReportOpen(true)}><span className="cta-icon"><PlusIcon /></span><span><strong>What did you notice?</strong><small>30 seconds · any outdoor observation</small></span><ChevronRightIcon /></button>
            <p className="privacy-line"><LockClosedIcon /> No expertise needed. Exact spots stay private.</p>
            <section className="section-block">
              <div className="section-heading"><div><p>AROUND HIGHLAND</p><h2>The local picture</h2></div><button onClick={() => showTab("explore")}>Explore <ChevronRightIcon /></button></div>
              <div className="feed-list">{localPicture.map((item) => <article className="feed-card" key={item.id}><img src={item.image} alt="" /><div className="feed-body"><p className={`feed-eyebrow ${item.accent}`}>{item.eyebrow}</p><h3>{item.title}</h3><span>{item.detail}</span><div className="feed-actions"><button onClick={() => toggleSave(item.id)}>{saved.includes(item.id) ? <BookmarkFilledIcon /> : <BookmarkIcon />}{saved.includes(item.id) ? "Saved" : "Save"}</button><button onClick={() => void shareItem(item.title, item.detail)}><Share1Icon /> Share</button></div></div></article>)}</div>
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

          {tab === "explore" && <section className="tab-view"><div className="view-kicker"><GlobeIcon /> LOCAL INTELLIGENCE</div><h1>Explore Highland</h1><p className="view-lead">A broad outdoor picture—water, wildlife, weather, access, and stewardship—in one place.</p><div className="search-shell"><MagnifyingGlassIcon /><input aria-label="Search places, species, or reports" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search places, species, or reports" />{search ? <button aria-label="Clear search" onClick={() => setSearch("")}><Cross2Icon /></button> : null}</div><div className="topic-grid">{visibleTopics.map(([name, detail]) => <button key={name} onClick={() => setNotice(`${name} view selected`)}><strong>{name}</strong><span>{detail}</span><ChevronRightIcon /></button>)}</div>{visibleTopics.length === 0 ? <p className="empty-state">No local topics match that search yet.</p> : null}<div className="map-card"><Crosshair2Icon /><div><strong>Highland area</strong><span>Precise community locations stay private.</span></div></div></section>}

          {tab === "community" && <section className="tab-view"><div className="view-kicker"><PersonIcon /> COMMUNITY FIELD NOTES</div><h1>Useful beats impressive.</h1><p className="view-lead">Real observations from people who care about the same places.</p><button className="compact-cta" onClick={() => setReportOpen(true)}><PlusIcon /> What did you notice?</button><div className="report-list">{reports.map((report) => <article key={report.id}><div className={`avatar ${report.syncState === "approved" ? "verified" : ""}`}>BL</div><div><span>{report.category} · {relativeTime(report.createdAt)}</span><strong>{report.note}</strong><small>{report.syncState === "approved" ? <CheckCircledIcon /> : <LockClosedIcon />} {report.syncState === "approved" ? "Community approved" : report.syncState === "submitted" ? "Awaiting review" : "Saved on this device"} · {report.place}</small></div></article>)}<article><div className="avatar verified">KM</div><div><span>Wildlife sample · 46 min ago</span><strong>Two doe moving along the east timber.</strong><small><CheckCircledIcon /> Example community note · Highland area</small></div></article><article><div className="avatar">DR</div><div><span>Trail sample · 1 hr ago</span><strong>South loop is clear; soft ground near the bridge.</strong><small><LockClosedIcon /> Example note · exact location protected</small></div></article></div></section>}

          {tab === "saved" && <section className="tab-view"><div className="view-kicker"><BookmarkIcon /> YOUR FIELD KIT</div><h1>Saved for the next outing.</h1><p className="view-lead">Your important local notes remain available when service drops.</p><div className="offline-panel"><ReloadIcon /><div><strong>{online ? syncMode === "synced" ? "Device copy and community are current" : "Offline copy is current" : "You’re viewing the offline copy"}</strong><span>{saved.length + reports.length + 3} items stored on this device</span></div><CheckCircledIcon /></div>{captchaEnabled && online && reports.some((report) => report.syncState === "pending") ? <button className="sync-button" onClick={() => setSyncOpen(true)}><ReloadIcon /> Verify & sync saved Field Checks</button> : null}<div className="feed-list saved-list">{localPicture.filter((item) => saved.includes(item.id)).map((item) => <article className="feed-card" key={item.id}><img src={item.image} alt="" /><div className="feed-body"><p className={`feed-eyebrow ${item.accent}`}>{item.eyebrow}</p><h3>{item.title}</h3><span>{item.detail}</span><div className="feed-actions"><button onClick={() => toggleSave(item.id)}><BookmarkFilledIcon /> Saved</button></div></div></article>)}</div></section>}
          <div className="scroll-spacer" />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={tab === "home" ? "active" : ""} onClick={() => showTab("home")}><HomeIcon /><span>Home</span></button><button className={tab === "explore" ? "active" : ""} onClick={() => showTab("explore")}><MagnifyingGlassIcon /><span>Explore</span></button><button className="report-tab" onClick={() => setReportOpen(true)}><span><PlusIcon /></span><small>Report</small></button><button className={tab === "community" ? "active" : ""} onClick={() => showTab("community")}><HeartIcon /><span>Community</span></button><button className={tab === "saved" ? "active" : ""} onClick={() => showTab("saved")}><BookmarkIcon /><span>Saved</span></button>
      </nav>

      <AppSheet open={reportOpen} onOpenChange={(open) => { setReportOpen(open); if (!open) setReportCaptcha(undefined); }} title="What did you notice?" description="A quick Field Check helps everyone understand the local picture." snap={0.8}><div className="sheet-form"><label>WHAT KIND OF SIGNAL?</label><div className="category-row">{["Water", "Wildlife", "Trail", "Weather", "Conservation"].map((item) => <button className={category === item ? "selected" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><label htmlFor="observation">WHAT DID YOU NOTICE?</label><textarea id="observation" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Example: Clear water near the bank; more bird movement than yesterday…" /><div className="privacy-card"><LockClosedIcon /><div><strong>Privacy is the default</strong><span>We show “Highland area,” never your exact spot.</span></div></div>{online && backendConfigured ? <TurnstileChallenge onToken={setReportCaptcha} /> : null}<button className="submit-button" disabled={captchaEnabled && online && backendConfigured && !reportCaptcha} onClick={() => void submitReport()}>{online && backendConfigured ? "Submit Field Check" : online ? "Save on this device" : "Save offline"}<ChevronRightIcon /></button></div></AppSheet>
      <AppSheet open={joinOpen} onOpenChange={(open) => { setJoinOpen(open); if (!open) setEmailCaptcha(undefined); }} title="Get the weekly local picture" description="One genuinely useful email. No paywall, no clutter." snap={captchaEnabled ? 0.66 : 0.52}><div className="sheet-form"><label htmlFor="email">EMAIL</label><input id="email" type="email" inputMode="email" autoComplete="email" value={email} onInput={(event) => setEmail(event.currentTarget.value)} placeholder="you@example.com" /><div className="trust-row"><CheckCircledIcon /> Unsubscribe anytime · exact locations never included.</div>{online && backendConfigured ? <TurnstileChallenge onToken={setEmailCaptcha} /> : null}<button className="submit-button" disabled={captchaEnabled && online && backendConfigured && !emailCaptcha} onClick={() => void join()}>Join free <ChevronRightIcon /></button></div></AppSheet>
      <AppSheet open={syncOpen} onOpenChange={(open) => { setSyncOpen(open); if (!open) setSyncCaptcha(undefined); }} title="Sync saved Field Checks" description="One quick privacy-friendly check, then your offline notes can join the review queue." snap={0.46}><div className="sheet-form"><TurnstileChallenge onToken={setSyncCaptcha} /><button className="submit-button" disabled={!syncCaptcha} onClick={() => void syncPending()}>Verify & sync <ReloadIcon /></button></div></AppSheet>
      {notice && <div className="toast" role="status"><CheckCircledIcon /> {notice}</div>}
    </div>
  );
}
