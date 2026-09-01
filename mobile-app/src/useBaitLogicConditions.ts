import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DashboardSnapshot = {
  updatedAt: string;
  location: { name: string; locality?: string; region?: string } | null;
  weather: {
    temperatureF: number;
    apparentTemperatureF?: number;
    humidity?: number;
    code: number;
    pressureInHg: number;
    pressureDelta3h: number;
    pressureDelta6h?: number;
    windMph: number;
    windDirection: number;
    gustMph?: number;
    cloudCover?: number;
    sunrise?: string | null;
    sunset?: string | null;
  };
};

export type WaterSnapshot = {
  source: string;
  stations: Array<{
    site: string;
    name: string;
    flow: number | null;
    gage: number | null;
    temp: number | null;
  }>;
  timestamp: string;
};

const CACHE_KEY = "baitlogic-approved-dashboard-conditions-v2";

export const WEATHER_LABELS: Record<number,string> = {
  0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",45:"Fog",48:"Fog",
  51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",
  65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",
  81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Thunderstorms / hail",
  99:"Severe thunderstorms / hail"
};

function readCache(): DashboardSnapshot | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return value?.weather ? value : undefined;
  } catch {
    return undefined;
  }
}

export function compass(deg?: number) {
  if (!Number.isFinite(deg)) return "—";
  const points = ["N","NE","E","SE","S","SW","W","NW"];
  return points[Math.round((((Number(deg) % 360) + 360) % 360) / 45) % 8];
}

export function pressureTrend(delta?: number) {
  if (!Number.isFinite(delta)) return "Unavailable";
  if (Number(delta) <= -0.06) return "Falling fast";
  if (Number(delta) < -0.02) return "Falling";
  if (Number(delta) >= 0.06) return "Rising fast";
  if (Number(delta) > 0.02) return "Rising";
  return "Steady";
}

export function formatClock(value?: string | null) {
  if (!value) return "—";
  const localClock = value.match(/T(\d{2}):(\d{2})/);
  if (localClock) {
    const hour24 = Number(localClock[1]);
    const minute = localClock[2];
    if (Number.isFinite(hour24)) {
      const suffix = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${minute} ${suffix}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(date);
}

export function relativeUpdated(value?: string) {
  if (!value) return "Not loaded";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return "Updated";
  const minutes = Math.max(0,Math.round(ms/60000));
  return minutes < 1 ? "Just now" : `${minutes} min ago`;
}

export function useBaitLogicConditions() {
  const cached = typeof window !== "undefined" ? readCache() : undefined;
  const [snapshot,setSnapshot] = useState<DashboardSnapshot|undefined>(cached);
  const [water,setWater] = useState<WaterSnapshot|undefined>();
  const [waterStatus,setWaterStatus] = useState<"live"|"cached"|"unavailable">("unavailable");
  const [online,setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [status,setStatus] = useState<"idle"|"loading"|"live"|"cached"|"unavailable">(cached?"cached":"idle");
  const [accuracy,setAccuracy] = useState<number|undefined>();

  const snapshotRef = useRef<DashboardSnapshot|undefined>(cached);
  const waterRef = useRef<WaterSnapshot|undefined>();

  const loadAt = useCallback(async (lat:number,lon:number,acc?:number) => {
    setStatus(snapshotRef.current ? "cached" : "loading");
    setAccuracy(acc);
    try {
      const [weatherResponse,waterResponse] = await Promise.all([
        fetch(`/api/barometer-snapshot?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,{cache:"no-store"}),
        fetch(`/api/water-snapshot?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,{cache:"no-store"})
      ]);

      const weatherData = await weatherResponse.json();
      if (!weatherResponse.ok || !weatherData?.weather) throw new Error(weatherData?.error || "Live conditions unavailable.");

      snapshotRef.current = weatherData;
      setSnapshot(weatherData);
      localStorage.setItem(CACHE_KEY,JSON.stringify(weatherData));
      const weatherSource = weatherResponse.headers.get("X-BaitLogic-Source");
      setStatus(weatherSource === "offline-cache" ? "cached" : "live");

      if (waterResponse.ok) {
        const waterData = await waterResponse.json();
        waterRef.current = waterData;
        setWater(waterData);
        setWaterStatus(waterResponse.headers.get("X-BaitLogic-Source") === "offline-cache" ? "cached" : "live");
      } else {
        waterRef.current = undefined;
        setWater(undefined);
        setWaterStatus("unavailable");
      }
    } catch {
      setWaterStatus(waterRef.current ? "cached" : "unavailable");
      const fallback = readCache();
      if (fallback) {
        snapshotRef.current = fallback;
        setSnapshot(fallback);
        setStatus("cached");
      } else {
        setStatus("unavailable");
      }
    }
  },[]);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus(readCache()?"cached":"unavailable");
      return;
    }
    setStatus(snapshotRef.current?"cached":"loading");
    navigator.geolocation.getCurrentPosition(
      p => loadAt(p.coords.latitude,p.coords.longitude,p.coords.accuracy),
      () => setStatus(readCache()?"cached":"unavailable"),
      {enableHighAccuracy:false,timeout:8000,maximumAge:300000}
    );
  },[loadAt]);

  useEffect(() => {
    const on=()=>setOnline(true),off=()=>setOnline(false);
    addEventListener("online",on); addEventListener("offline",off);
    return()=>{removeEventListener("online",on);removeEventListener("offline",off)};
  },[]);

  useEffect(() => {
    refreshLocation();
    const timer=setInterval(()=>{ if(navigator.onLine) refreshLocation(); },60*60*1000);
    return()=>clearInterval(timer);
  },[refreshLocation]);

  const waterTemp = useMemo(() => {
    const station=water?.stations?.find(s=>Number.isFinite(s.temp));
    return station?.temp ?? null;
  },[water]);

  return {snapshot,water,waterTemp,waterStatus,online,status,accuracy,refreshLocation};
}
