import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./regional-explore.css";
import { readFieldChecks } from "./data/baitlogicData";

type Coordinates = { lat: number; lon: number };
type MapLike = any;
type MarkerLike = any;

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
type TrailFeature = {
  type: "Feature";
  id?: string;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: {
    id: string;
    osmId: number;
    name: string;
    ref?: string | null;
    operator?: string | null;
    highway: string;
    surface?: string | null;
    access?: string | null;
    foot?: string | null;
    bicycle?: string | null;
    horse?: string | null;
    website?: string | null;
    official: boolean;
    distanceMiles: number;
    routePoint: [number, number];
    source: string;
  };
};
type TrailheadFeature = {
  type: "Feature";
  id?: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    osmId: number;
    name: string;
    parking?: string | null;
    operator?: string | null;
    website?: string | null;
    official: boolean;
    source: string;
  };
};
type TrailCollection = {
  type: "FeatureCollection";
  features: TrailFeature[];
  trailheads?: TrailheadFeature[];
  bbox?: [number, number, number, number];
  fetchedAt?: string;
  truncated?: boolean;
  notice?: string;
};
type SearchResult = { place_id: number; display_name: string; lat: string; lon: string; type?: string };
type WeatherIntel = {
  updatedAt?: string;
  location?: { name?: string } | null;
  weather?: { temperatureF?: number; pressureInHg?: number; windMph?: number; gustMph?: number };
};

const REGION_BOUNDS: [[number, number], [number, number]] = [[-95.9, 35.9], [-87.2, 42.7]];
const USGS_CACHE_KEY = "baitlogic-usgs-il-mo-v1";
const TRAIL_CACHE_KEY = "baitlogic-trails-il-mo-v1";
const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const USGS_URL = "https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&bbox=-95.9,35.9,-87.2,42.7&parameter_code=00060&limit=500";
const OFFLINE_MAP_STYLE = {
  version: 8 as const,
  name: "BaitLogic offline field map",
  sources: {},
  layers: [{ id: "offline-background", type: "background" as const, paint: { "background-color": "#dfecea" } }],
};

const quickJumps = [
  { label: "Carlyle Lake", lon: -89.338, lat: 38.676, zoom: 10 },
  { label: "Rend Lake", lon: -88.967, lat: 38.046, zoom: 10 },
  { label: "Mark Twain Lake", lon: -91.721, lat: 39.493, zoom: 10 },
  { label: "Lake of the Ozarks", lon: -92.638, lat: 38.126, zoom: 9 },
];

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readTrailCache(): TrailCollection | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRAIL_CACHE_KEY) || "null") as TrailCollection | null;
    return parsed?.type === "FeatureCollection" && Array.isArray(parsed.features) ? parsed : null;
  } catch {
    return null;
  }
}

function trailUses(properties: TrailFeature["properties"]) {
  const uses = [
    properties.foot !== "no" ? "hiking" : null,
    ["yes", "designated", "permissive"].includes(properties.bicycle || "") ? "biking" : null,
    ["yes", "designated", "permissive"].includes(properties.horse || "") ? "horseback" : null,
  ].filter(Boolean);
  return uses.length ? uses.join(" · ") : "check posted permitted uses";
}

function trailToGpx(trail: TrailFeature) {
  const points = trail.geometry.coordinates
    .map(([lon, lat]) => `<trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="BaitLogic" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${escapeHtml(trail.properties.name)}</name></metadata><trk><name>${escapeHtml(trail.properties.name)}</name><trkseg>${points}</trkseg></trk></gpx>`;
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "baitlogic-trail";
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
  const trailsRef = useRef<TrailFeature[]>(readTrailCache()?.features ?? []);
  const trailheadsRef = useRef<TrailheadFeature[]>(readTrailCache()?.trailheads ?? []);
  const locationMarker = useRef<MarkerLike>(null);
  const searchMarker = useRef<MarkerLike>(null);
  const handlersBound = useRef(false);
  const trailHandlersBound = useRef(false);
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
  const [trails, setTrails] = useState<TrailFeature[]>(() => readTrailCache()?.features ?? []);
  const [trailheads, setTrailheads] = useState<TrailheadFeature[]>(() => readTrailCache()?.trailheads ?? []);
  const [trailStatus, setTrailStatus] = useState(() => {
    const saved = readTrailCache();
    return saved?.features.length ? `${saved.features.length} saved trail segments ready offline.` : "Zoom into an area, then load every mapped trail in view.";
  });
  const [trailMode, setTrailMode] = useState<"idle" | "loading" | "live" | "saved">(() => readTrailCache()?.features.length ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState(() => readTrailCache()?.fetchedAt || "");
  const [communityCount, setCommunityCount] = useState(() => readFieldChecks().filter((item) => item.syncState === "approved").length);

  const gaugeGeoJson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: gauges.map((feature) => ({ type: "Feature" as const, geometry: feature.geometry, properties: feature.properties })),
  }), [gauges]);

  const trailGeoJson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: trails,
  }), [trails]);

  const trailheadGeoJson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: trailheads,
  }), [trailheads]);

  useEffect(() => { trailsRef.current = trails; }, [trails]);
  useEffect(() => { trailheadsRef.current = trailheads; }, [trailheads]);

  const loadTrails = useCallback(async () => {
    const cached = readTrailCache();
    if (!navigator.onLine) {
      setTrails(cached?.features ?? []);
      setTrailheads(cached?.trailheads ?? []);
      setSavedAt(cached?.fetchedAt || "");
      setTrailMode("saved");
      setTrailStatus(cached?.features.length
        ? `Offline · showing ${cached.features.length} saved trail segments.`
        : "Offline · no trail area has been saved on this device yet.");
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    if (map.getZoom() < 9.5) {
      setTrailStatus("Zoom into a town, park, or lake before loading trails so the route data stays useful.");
      return;
    }
    const bounds = map.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
      .map((value: number) => value.toFixed(5)).join(",");
    setTrailMode("loading");
    setTrailStatus("Loading every mapped public trail in this view…");
    try {
      const response = await fetch(`/api/trails?bbox=${encodeURIComponent(bbox)}`, { headers: { Accept: "application/geo+json, application/json" } });
      const payload = await response.json() as TrailCollection & { error?: string };
      if (!response.ok || payload.type !== "FeatureCollection") throw new Error(payload.error || "Trail response unavailable");
      localStorage.setItem(TRAIL_CACHE_KEY, JSON.stringify(payload));
      setTrails(payload.features);
      setTrailheads(payload.trailheads ?? []);
      setSavedAt(payload.fetchedAt || new Date().toISOString());
      setTrailMode("live");
      setTrailStatus(payload.features.length
        ? `${payload.features.length} mapped trail segments loaded and saved for offline use.${payload.truncated ? " Zoom closer for the complete local view." : ""}`
        : "No mapped public trail segments were returned for this view. Check the official area map below.");
    } catch (error) {
      setTrails(cached?.features ?? []);
      setTrailheads(cached?.trailheads ?? []);
      setSavedAt(cached?.fetchedAt || "");
      setTrailMode(cached?.features.length ? "saved" : "idle");
      setTrailStatus(cached?.features.length
        ? "Live trail lookup failed · showing the last saved offline trail area."
        : error instanceof Error ? error.message : "Mapped trails could not be loaded right now.");
    }
  }, []);

  const saveTrailArea = () => {
    if (!trails.length) {
      setTrailStatus("Load the trails in this map view before saving an offline area.");
      return;
    }
    const bounds = mapRef.current?.getBounds();
    const bbox = bounds
      ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number]
      : readTrailCache()?.bbox;
    const next: TrailCollection = { type: "FeatureCollection", features: trails, trailheads, bbox, fetchedAt: savedAt || new Date().toISOString() };
    localStorage.setItem(TRAIL_CACHE_KEY, JSON.stringify(next));
    setTrailMode("saved");
    setTrailStatus(`${trails.length} trail segments saved on this device. GPS and route lines remain available without service.`);
  };

  const downloadTrail = (trail: TrailFeature) => {
    const blob = new Blob([trailToGpx(trail)], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(trail.properties.name)}.gpx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setTrailStatus(`${trail.properties.name} GPX downloaded for an offline navigation app.`);
  };

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
        if (mapRef.current) {
          locationMarker.current?.remove();
          locationMarker.current = new maplibregl.Marker({ color: "#087f8c" })
            .setLngLat([next.lon, next.lat])
            .setPopup(new maplibregl.Popup({ offset: 22 }).setText("Your current area"))
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
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !mapRef.current) return;
    searchMarker.current?.remove();
    searchMarker.current = new maplibregl.Marker({ color: "#d89a00" })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup({ offset: 22 }).setText(result.display_name.split(",").slice(0, 3).join(",")))
      .addTo(mapRef.current);
    mapRef.current.flyTo({ center: [lon, lat], zoom: result.type === "city" || result.type === "town" ? 10 : 12, duration: 900 });
    setQuery(result.display_name.split(",")[0]);
    setResults([]);
    setSearchMessage("");
  };

  const resetRegion = () => mapRef.current?.fitBounds(REGION_BOUNDS, { padding: 24, duration: 800 });

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    try {
      const map = new maplibregl.Map({
        container: mapNode.current,
        style: navigator.onLine ? OPEN_FREE_MAP_STYLE : OFFLINE_MAP_STYLE,
        bounds: REGION_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true }), "top-right");
      map.on("load", () => {
        const saved = readTrailCache();
        if (saved?.bbox) map.fitBounds([[saved.bbox[0], saved.bbox[1]], [saved.bbox[2], saved.bbox[3]]], { padding: 28, duration: 0 });
        setMapReady(true);
        setMapStatus(navigator.onLine ? "" : "Offline field map · saved trail lines and GPS remain available.");
      });
      map.on("error", () => setMapStatus(navigator.onLine
        ? "Background map tiles are temporarily unavailable. Saved trail lines and GPS can still work."
        : "Offline field map · saved trail lines and GPS remain available."));
      mapRef.current = map;
    } catch {
      setMapStatus("Interactive map could not start. Check your connection and retry.");
    }

    return () => {
      handlersBound.current = false;
      trailHandlersBound.current = false;
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
        new maplibregl.Popup({ offset: 10, maxWidth: "300px" })
          .setLngLat(point)
          .setHTML(`<div class="baitlogic-map-popup"><strong>${name}</strong><span>${value} ${unit} streamflow</span><small>${observed} · ${status}</small><a href="${siteLink}" target="_blank" rel="noreferrer">Open USGS station ↗</a></div>`)
          .addTo(map);
      });
    }
  }, [gaugeGeoJson, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const existing = map.getSource("baitlogic-trails") as { setData: (data: unknown) => void } | undefined;
    if (existing) {
      existing.setData(trailGeoJson);
    } else {
      map.addSource("baitlogic-trails", {
        type: "geojson",
        data: trailGeoJson,
        attribution: "© OpenStreetMap contributors",
      });
      map.addLayer({
        id: "baitlogic-trails-halo",
        type: "line",
        source: "baitlogic-trails",
        paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": .9 },
      });
      map.addLayer({
        id: "baitlogic-trails",
        type: "line",
        source: "baitlogic-trails",
        paint: {
          "line-color": ["case", ["==", ["get", "official"], true], "#087f8c", "#d89a00"],
          "line-width": 3.5,
          "line-opacity": .95,
        },
      });
    }
    const existingTrailheads = map.getSource("baitlogic-trailheads") as { setData: (data: unknown) => void } | undefined;
    if (existingTrailheads) {
      existingTrailheads.setData(trailheadGeoJson);
    } else {
      map.addSource("baitlogic-trailheads", {
        type: "geojson",
        data: trailheadGeoJson,
        attribution: "© OpenStreetMap contributors",
      });
      map.addLayer({
        id: "baitlogic-trailheads",
        type: "circle",
        source: "baitlogic-trailheads",
        paint: { "circle-radius": 6, "circle-color": "#062452", "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" },
      });
    }

    if (!trailHandlersBound.current) {
      trailHandlersBound.current = true;
      map.on("mouseenter", "baitlogic-trails", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "baitlogic-trails", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "baitlogic-trails", (event: any) => {
        const rendered = event.features?.[0];
        const id = rendered?.properties?.id;
        const trail = trailsRef.current.find((item) => item.properties.id === id);
        if (!trail) return;
        const properties = trail.properties;
        const [lon, lat] = properties.routePoint;
        const content = document.createElement("div");
        content.className = "baitlogic-map-popup trail-popup";
        const badge = properties.official ? "Official operator identified" : "Community-mapped route";
        content.innerHTML = `<strong>${escapeHtml(properties.name)}</strong><span>${escapeHtml(properties.distanceMiles)} mi mapped segment · ${escapeHtml(properties.surface || properties.highway)}</span><small>${escapeHtml(trailUses(properties))} · ${escapeHtml(properties.access || "check posted signs")}</small><em>${escapeHtml(badge)}${properties.operator ? ` · ${escapeHtml(properties.operator)}` : ""}</em>`;
        const directions = document.createElement("a");
        directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}&travelmode=walking`;
        directions.target = "_blank";
        directions.rel = "noreferrer";
        directions.textContent = "Directions to this mapped route ↗";
        content.appendChild(directions);
        if (properties.website) {
          const official = document.createElement("a");
          official.href = properties.website;
          official.target = "_blank";
          official.rel = "noreferrer";
          official.textContent = "Open operator trail page ↗";
          content.appendChild(official);
        }
        const gpx = document.createElement("button");
        gpx.type = "button";
        gpx.textContent = "Download GPX for offline use";
        gpx.addEventListener("click", () => downloadTrail(trail));
        content.appendChild(gpx);
        new maplibregl.Popup({ offset: 10, maxWidth: "310px" })
          .setLngLat(event.lngLat)
          .setDOMContent(content)
          .addTo(map);
      });
      map.on("mouseenter", "baitlogic-trailheads", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "baitlogic-trailheads", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "baitlogic-trailheads", (event: any) => {
        const rendered = event.features?.[0];
        const trailhead = trailheadsRef.current.find((item) => item.properties.id === rendered?.properties?.id);
        if (!trailhead) return;
        const properties = trailhead.properties;
        const [lon, lat] = trailhead.geometry.coordinates;
        const content = document.createElement("div");
        content.className = "baitlogic-map-popup trail-popup";
        content.innerHTML = `<strong>${escapeHtml(properties.name)}</strong><span>Mapped trailhead${properties.parking ? ` · ${escapeHtml(properties.parking)}` : ""}</span><small>${escapeHtml(properties.operator || (properties.official ? "Official operator identified" : "Community-mapped location"))}</small>`;
        const directions = document.createElement("a");
        directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
        directions.target = "_blank";
        directions.rel = "noreferrer";
        directions.textContent = "Directions to trailhead ↗";
        content.appendChild(directions);
        if (properties.website) {
          const official = document.createElement("a");
          official.href = properties.website;
          official.target = "_blank";
          official.rel = "noreferrer";
          official.textContent = "Open operator trail page ↗";
          content.appendChild(official);
        }
        new maplibregl.Popup({ offset: 10, maxWidth: "300px" })
          .setLngLat([lon, lat])
          .setDOMContent(content)
          .addTo(map);
      });
    }
  }, [mapReady, trailGeoJson, trailheadGeoJson, trails]);

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
          <button type="button" className="trail-load-button" disabled={trailMode === "loading"} onClick={() => void loadTrails()}>{trailMode === "loading" ? "Loading trails…" : "🥾 Load trails here"}</button>
          <button type="button" onClick={resetRegion}>↺ IL + MO</button>
        </div>
        <div className="map-legend"><span><i className="trail-line official" /> Official operator identified</span><span><i className="trail-line community" /> Community-mapped trail</span><span><i className="trailhead-dot" /> Trailhead</span><span><i className="gauge-dot" /> USGS gauge</span></div>
      </div>

      <div className="quick-jumps" aria-label="Quick regional map jumps">
        {quickJumps.map((spot) => <button type="button" key={spot.label} onClick={() => mapRef.current?.flyTo({ center: [spot.lon, spot.lat], zoom: spot.zoom, duration: 800 })}>{spot.label}</button>)}
      </div>

      <section className="trail-field-kit" aria-labelledby="trail-field-kit-title">
        <div className="trail-field-heading">
          <div><span>TRAILS · FIELD NAVIGATION</span><strong id="trail-field-kit-title">Actual routes, ready beyond cell service</strong></div>
          <button type="button" onClick={saveTrailArea} disabled={!trails.length}>Save offline</button>
        </div>
        <p className={`trail-status ${trailMode}`} role="status">{trailStatus}</p>
        {savedAt ? <small className="trail-freshness">Trail data checked {formatObserved(savedAt)}. Reconnect before leaving to refresh closures and map changes.</small> : null}
        {trails.length ? <div className="trail-summary"><strong>{trails.length}</strong><span>mapped segments visible</span><strong>{trailheads.length}</strong><span>mapped trailheads</span></div> : null}
        <p className="trail-truth">Tap a colored route for its name, mapped length, surface, permitted-use details, route directions, and GPX download. Tap a navy point for verified trailhead directions. Unnamed paths remain visible so connectors are not hidden.</p>
      </section>

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
        <a href="https://www.mcttrails.org/map" target="_blank" rel="noreferrer">MCT actual trail map ↗</a>
        <a href="https://www.meprd.org/maps.html" target="_blank" rel="noreferrer">Metro-East trail maps ↗</a>
        <a href="https://dnr.illinois.gov/parks.html" target="_blank" rel="noreferrer">Illinois DNR parks ↗</a>
        <a href="https://mostateparks.com/activity/hiking_and_walking" target="_blank" rel="noreferrer">Missouri State Parks trails ↗</a>
        <a href="https://mdc.mo.gov/conservation-areas-search" target="_blank" rel="noreferrer">MDC conservation trails ↗</a>
        <a href="https://www.fs.usda.gov/r09/marktwain/maps-guides" target="_blank" rel="noreferrer">Mark Twain trail maps ↗</a>
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
