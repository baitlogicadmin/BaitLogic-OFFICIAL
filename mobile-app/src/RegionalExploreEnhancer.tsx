import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./regional-explore.css";
import { readFieldChecks } from "./data/baitlogicData";

type Coordinates = { lat: number; lon: number };
type MapLike = any;
type MarkerLike = any;
type PopupLike = any;
type MapLibreApi = {
  Map: new (options: Record<string, unknown>) => MapLike;
  Marker: new (options?: Record<string, unknown>) => MarkerLike;
  Popup: new (options?: Record<string, unknown>) => PopupLike;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
  GeolocateControl: new (options?: Record<string, unknown>) => unknown;
};

declare global {
  interface Window { maplibregl?: MapLibreApi }
}

type UsgsFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    monitoring_location_id?: string;
    monitoring_location_number?: string;
    monitoring_location_name?: string;
    parameter_code?: string;
    time?: string;
    value?: string | number;
    unit_of_measure?: string;
    approval_status?: string;
    state_name?: string;
  };
};

type UsgsCollection = { type: "FeatureCollection"; features: UsgsFeature[] };
type SearchResult = { place_id: number; display_name: string; lat: string; lon: string; type?: string };
type WeatherIntel = {
  updatedAt?: string;
  location?: { name?: string } | null;
  weather?: { temperatureF?: number; pressureInHg?: number; windMph?: number; gustMph?: number };
};

const REGION_BOUNDS: [[number, number], [number, number]] = [[-95.9, 35.9], [-87.2, 42.7]];
const USGS_CACHE_KEY = "baitlogic-usgs-il-mo-v1";
const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@6.5.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@6.5.0/dist/maplibre-gl.css";
const USGS_URL = "https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&bbox=-95.9,35.9,-87.2,42.7&parameter_code=00060&limit=500";

const quickJumps = [
  { label: "Carlyle Lake", lon: -89.338, lat: 38.676, zoom: 10 },
  { label: "Rend Lake", lon: -88.967, lat: 38.046, zoom: 10 },
  { label: "Mark Twain Lake", lon: -91.721, lat: 39.493, zoom: 10 },
  { label: "Lake of the Ozarks", lon: -92.638, lat: 38.126, zoom: 9 },
];

let mapLibrePromise: Promise<MapLibreApi> | null = null;
function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (mapLibrePromise) return mapLibrePromise;

  mapLibrePromise = new Promise<MapLibreApi>((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MAPLIBRE_JS}"]`);
    const script = existing ?? document.createElement("script");
    const finish = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error("MapLibre unavailable"));
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("MapLibre failed to load")), { once: true });
    if (!existing) {
      script.src = MAPLIBRE_JS;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    } else if (window.maplibregl) {
      finish();
    }
  });
  return mapLibrePromise;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readGaugeCache(): UsgsCollection | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(USGS_CACHE_KEY) || "null") as UsgsCollection | null;
    return parsed?.type === "FeatureCollection" && Array.isArray(parsed.features) ? parsed : null;
  } catch {
    return null;
  }
}

function withinRegion(lat: number, lon: number) {
  return lon >= REGION_BOUNDS[0][0] && lon <= REGION_BOUNDS[1][0]
    && lat >= REGION_BOUNDS[0][1] && lat <= REGION_BOUNDS[1][1];
}

function formatObserved(iso?: string) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "time unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function RegionalExplorePanel() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike>(null);
  const locationMarker = useRef<MarkerLike>(null);
  const searchMarker = useRef<MarkerLike>(null);
  const handlersBound = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapStatus, setMapStatus] = useState("Loading interactive map…");
  const [gauges, setGauges] = useState<UsgsFeature[]>(() => readGaugeCache()?.features ?? []);
  const [gaugeMode, setGaugeMode] = useState<"live" | "saved" | "loading">(navigator.onLine ? "loading" : "saved");
  const [gaugeError, setGaugeError] = useState("");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [weather, setWeather] = useState<WeatherIntel | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("Locating for live weather…");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [communityCount, setCommunityCount] = useState(() => readFieldChecks().filter((item) => item.syncState === "approved").length);

  const gaugeGeoJson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: gauges.map((feature) => ({ type: "Feature" as const, geometry: feature.geometry, properties: feature.properties })),
  }), [gauges]);

  const loadGauges = useCallback(async () => {
    const cached = readGaugeCache();
    if (!navigator.onLine) {
      setGauges(cached?.features ?? []);
      setGaugeMode("saved");
      setGaugeError(cached ? "Offline · showing the last saved USGS gauge snapshot." : "Offline · no USGS gauge snapshot has been saved yet.");
      return;
    }

    setGaugeMode("loading");
    setGaugeError("");
    try {
      const response = await fetch(USGS_URL, { headers: { Accept: "application/geo+json, application/json" } });
      if (!response.ok) throw new Error(`USGS request failed: ${response.status}`);
      const payload = await response.json() as UsgsCollection;
      if (payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) throw new Error("Unexpected USGS response");
      const valid = payload.features.filter((feature) => feature.geometry?.type === "Point" && feature.properties?.parameter_code === "00060");
      const next: UsgsCollection = { type: "FeatureCollection", features: valid };
      localStorage.setItem(USGS_CACHE_KEY, JSON.stringify(next));
      setGauges(valid);
      setGaugeMode("live");
    } catch {
      setGauges(cached?.features ?? []);
      setGaugeMode(cached ? "saved" : "loading");
      setGaugeError(cached ? "USGS is temporarily unreachable · showing the last saved gauge snapshot." : "USGS live gauges are temporarily unavailable.");
    }
  }, []);

  const loadWeather = useCallback(async (position: Coordinates) => {
    if (!navigator.onLine) {
      setWeatherStatus("Offline · BaitLogic will refresh weather when service returns.");
      return;
    }
    try {
      setWeatherStatus("Loading live weather…");
      const response = await fetch(`/api/barometer-snapshot?lat=${encodeURIComponent(position.lat)}&lon=${encodeURIComponent(position.lon)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("weather unavailable");
      const payload = await response.json() as WeatherIntel;
      setWeather(payload);
      setWeatherStatus(`Live · ${formatObserved(payload.updatedAt)}`);
    } catch {
      setWeatherStatus("Live weather could not be verified right now.");
    }
  }, []);

  const useMyLocation = useCallback((announceErrors = true) => {
    if (!navigator.geolocation) {
      if (announceErrors) setWeatherStatus("This browser does not provide location access.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lon: position.coords.longitude };
        setCoords(next);
        void loadWeather(next);
        const api = window.maplibregl;
        if (mapRef.current && api) {
          locationMarker.current?.remove();
          locationMarker.current = new api.Marker({ color: "#087f8c" })
            .setLngLat([next.lon, next.lat])
            .setPopup(new api.Popup({ offset: 22 }).setText("Your current area"))
            .addTo(mapRef.current);
          mapRef.current.flyTo({ center: [next.lon, next.lat], zoom: 9.5, duration: 900 });
        }
      },
      () => {
        if (announceErrors) setWeatherStatus("Location permission is off. Allow location to center the regional map on you.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [loadWeather]);

  const searchRegion = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!navigator.onLine) {
      setSearchMessage("Search needs a connection. Saved gauges and the regional map remain available.");
      return;
    }
    setSearching(true);
    setSearchMessage("");
    setResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&countrycodes=us&viewbox=-95.9,42.7,-87.2,35.9&bounded=1&q=${encodeURIComponent(trimmed)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("search unavailable");
      const payload = await response.json() as SearchResult[];
      const regional = payload.filter((item) => withinRegion(Number(item.lat), Number(item.lon))).slice(0, 6);
      setResults(regional);
      if (!regional.length) setSearchMessage("No Illinois or Missouri map results matched that search.");
    } catch {
      setSearchMessage("Regional search is temporarily unavailable.");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const chooseResult = (result: SearchResult) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    const api = window.maplibregl;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !mapRef.current || !api) return;
    searchMarker.current?.remove();
    searchMarker.current = new api.Marker({ color: "#d89a00" })
      .setLngLat([lon, lat])
      .setPopup(new api.Popup({ offset: 22 }).setText(result.display_name.split(",").slice(0, 3).join(",")))
      .addTo(mapRef.current);
    mapRef.current.flyTo({ center: [lon, lat], zoom: result.type === "city" || result.type === "town" ? 10 : 12, duration: 900 });
    setQuery(result.display_name.split(",")[0]);
    setResults([]);
    setSearchMessage("");
  };

  const resetRegion = () => mapRef.current?.fitBounds(REGION_BOUNDS, { padding: 24, duration: 800 });

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    let disposed = false;
    void loadMapLibre().then((api) => {
      if (disposed || !mapNode.current || mapRef.current) return;
      const map = new api.Map({
        container: mapNode.current,
        style: OPEN_FREE_MAP_STYLE,
        bounds: REGION_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        attributionControl: true,
      });
      map.addControl(new api.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new api.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false, showUserLocation: true }), "top-right");
      map.on("load", () => { setMapReady(true); setMapStatus(""); });
      map.on("error", () => setMapStatus("Map tiles are temporarily unavailable. Live data below can still refresh."));
      mapRef.current = map;
    }).catch(() => setMapStatus("Interactive map could not load. Check your connection and retry."));

    return () => {
      disposed = true;
      handlersBound.current = false;
      searchMarker.current?.remove();
      locationMarker.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const existing = map.getSource("usgs-gauges") as { setData: (data: unknown) => void } | undefined;
    if (existing) {
      existing.setData(gaugeGeoJson);
    } else {
      map.addSource("usgs-gauges", { type: "geojson", data: gaugeGeoJson });
      map.addLayer({ id: "usgs-gauges-halo", type: "circle", source: "usgs-gauges", paint: { "circle-radius": 8, "circle-color": "#ffffff", "circle-opacity": 0.88 } });
      map.addLayer({ id: "usgs-gauges", type: "circle", source: "usgs-gauges", paint: { "circle-radius": 4.5, "circle-color": "#087f8c", "circle-stroke-width": 1.5, "circle-stroke-color": "#062452" } });
    }

    if (!handlersBound.current) {
      handlersBound.current = true;
      map.on("mouseenter", "usgs-gauges", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "usgs-gauges", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "usgs-gauges", (event: any) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry?.type !== "Point") return;
        const point = feature.geometry.coordinates as [number, number];
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        const site = String(props.monitoring_location_number || props.monitoring_location_id || "").replace("USGS-", "");
        const value = escapeHtml(props.value);
        const unit = escapeHtml(props.unit_of_measure || "ft³/s");
        const name = escapeHtml(props.monitoring_location_name || "USGS monitoring location");
        const observed = escapeHtml(formatObserved(String(props.time || "")));
        const status = escapeHtml(props.approval_status || "Provisional");
        const siteLink = site ? `https://waterdata.usgs.gov/monitoring-location/${encodeURIComponent(site)}` : "https://waterdata.usgs.gov/";
        const api = window.maplibregl;
        if (!api) return;
        new api.Popup({ offset: 10, maxWidth: "300px" })
          .setLngLat(point)
          .setHTML(`<div class="baitlogic-map-popup"><strong>${name}</strong><span>${value} ${unit} streamflow</span><small>${observed} · ${status}</small><a href="${siteLink}" target="_blank" rel="noreferrer">Open USGS station ↗</a></div>`)
          .addTo(map);
      });
    }
  }, [gaugeGeoJson, mapReady]);

  useEffect(() => {
    void loadGauges();
    const refresh = () => void loadGauges();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const timer = window.setInterval(() => void loadGauges(), 15 * 60 * 1000);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.clearInterval(timer);
    };
  }, [loadGauges]);

  useEffect(() => { useMyLocation(false); }, [useMyLocation]);

  useEffect(() => {
    const refreshCount = () => setCommunityCount(readFieldChecks().filter((item) => item.syncState === "approved").length);
    const timer = window.setInterval(refreshCount, 5000);
    window.addEventListener("storage", refreshCount);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refreshCount);
    };
  }, []);

  return (
    <section className="regional-explore" aria-label="Illinois and Missouri live outdoor intelligence">
      <div className="regional-status-row">
        <span className="regional-badge">ILLINOIS + MISSOURI</span>
        <span className={`live-source-badge ${gaugeMode}`}>{gaugeMode === "live" ? "LIVE PUBLIC DATA" : gaugeMode === "saved" ? "SAVED OFFLINE DATA" : "REFRESHING DATA"}</span>
      </div>

      <form className="regional-search" onSubmit={(event) => { event.preventDefault(); void searchRegion(); }}>
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any lake, river, town, park, or access area in IL + MO" aria-label="Search Illinois and Missouri map" />
        <button type="submit" disabled={searching}>{searching ? "…" : "Search"}</button>
      </form>
      {(results.length > 0 || searchMessage) && <div className="regional-search-results" role="status">
        {results.map((result) => <button type="button" key={result.place_id} onClick={() => chooseResult(result)}><strong>{result.display_name.split(",")[0]}</strong><span>{result.display_name.split(",").slice(1, 4).join(",")}</span></button>)}
        {searchMessage ? <p>{searchMessage}</p> : null}
      </div>}

      <div className="regional-map-shell">
        <div ref={mapNode} className="regional-map" aria-label="Interactive Illinois and Missouri outdoor map" />
        {mapStatus ? <div className="regional-map-status">{mapStatus}</div> : null}
        <div className="map-command-bar">
          <button type="button" onClick={() => useMyLocation(true)}>◎ My location</button>
          <button type="button" onClick={resetRegion}>↺ IL + MO</button>
        </div>
        <div className="map-legend"><span><i className="gauge-dot" /> USGS live streamflow gauge</span><span>Drag · zoom · tap gauges</span></div>
      </div>

      <div className="quick-jumps" aria-label="Quick regional map jumps">
        {quickJumps.map((spot) => <button type="button" key={spot.label} onClick={() => mapRef.current?.flyTo({ center: [spot.lon, spot.lat], zoom: spot.zoom, duration: 800 })}>{spot.label}</button>)}
      </div>

      <div className="live-intel-grid">
        <article>
          <span>WATER · USGS</span>
          <strong>{gaugeMode === "loading" && gauges.length === 0 ? "Loading gauges…" : `${gauges.length} regional gauges`}</strong>
          <small>{gaugeError || (gaugeMode === "live" ? "Current streamflow observations from the USGS Water Data API." : "Last saved gauge snapshot available offline.")}</small>
        </article>
        <article>
          <span>WEATHER · BAITLOGIC</span>
          <strong>{weather?.weather?.temperatureF != null ? `${Math.round(weather.weather.temperatureF)}°F · ${weather.weather.pressureInHg?.toFixed(2) ?? "—"} inHg` : coords ? "Checking conditions…" : "Use your location"}</strong>
          <small>{weather?.weather?.windMph != null ? `${Math.round(weather.weather.windMph)} mph wind · gusts ${Math.round(weather.weather.gustMph ?? weather.weather.windMph)} mph · ${weatherStatus}` : weatherStatus}</small>
        </article>
        <article>
          <span>COMMUNITY · VERIFIED</span>
          <strong>{communityCount} approved Field {communityCount === 1 ? "Check" : "Checks"}</strong>
          <small>Community observations complement public data; empty categories are never fabricated.</small>
        </article>
      </div>

      <div className="official-intel-links">
        <a href="https://dnr.illinois.gov/" target="_blank" rel="noreferrer">Illinois DNR ↗</a>
        <a href="https://mdc.mo.gov/" target="_blank" rel="noreferrer">Missouri Conservation ↗</a>
        <a href="https://waterdata.usgs.gov/" target="_blank" rel="noreferrer">USGS Water Data ↗</a>
      </div>
    </section>
  );
}

export default function RegionalExploreEnhancer() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const mount = () => {
      const views = Array.from(document.querySelectorAll<HTMLElement>(".tab-view"));
      const exploreView = views.find((view) => view.querySelector(".view-kicker")?.textContent?.includes("LOCAL INTELLIGENCE"));
      if (!exploreView) {
        setHost(null);
        return;
      }

      exploreView.classList.add("regional-explore-mounted");
      const heading = exploreView.querySelector("h1");
      const lead = exploreView.querySelector<HTMLElement>(".view-lead");
      if (heading && heading.textContent !== "Explore Illinois + Missouri") heading.textContent = "Explore Illinois + Missouri";
      if (lead) lead.textContent = "Live regional map, verified public data, and real community Field Checks across both states—not just your current town.";

      let target = exploreView.querySelector<HTMLElement>("#regional-explore-host");
      if (!target) {
        target = document.createElement("div");
        target.id = "regional-explore-host";
        const topicGrid = exploreView.querySelector(".topic-grid");
        if (topicGrid) exploreView.insertBefore(target, topicGrid);
        else exploreView.appendChild(target);
      }
      setHost((current) => current === target ? current : target);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return host ? createPortal(<RegionalExplorePanel />, host) : null;
}
