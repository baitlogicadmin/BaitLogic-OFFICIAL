"use strict";

const inHg = hpa => Number(hpa) * 0.0295299830714;

async function fetchJson(url, options = {}, timeoutMs = 6500, attempts = 1) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Upstream request failed (${response.status})`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Upstream request failed");
}

function nearestIndex(times, targetMs) {
  let best = 0;
  let distance = Infinity;
  times.forEach((value, index) => {
    const d = Math.abs(new Date(value).getTime() - targetMs);
    if (d < distance) { distance = d; best = index; }
  });
  return best;
}

function placeFromNominatim(data) {
  const a = data?.address || {};
  const locality = a.city || a.town || a.village || a.municipality || a.borough || a.suburb || a.hamlet || null;
  const region = a.state || a.region || null;
  const country = a.country || null;
  if (!locality) return null;
  return {
    name: region && locality.toLowerCase() !== region.toLowerCase() ? `${locality}, ${region}` : locality,
    locality,
    region,
    country
  };
}

function placeFromBigData(data) {
  if (!data) return null;
  const direct = data.city || null;
  const candidates = [
    direct,
    data.locality,
    ...(data.localityInfo?.informative || []).filter(x => /city|town|village|municipality|borough/i.test(x.description || x.type || "")).map(x => x.name)
  ].filter(Boolean);
  const locality = candidates.find(name => !/township|county|district/i.test(name)) || null;
  const region = data.principalSubdivision || null;
  const country = data.countryName || null;
  if (!locality) return null;
  return {
    name: region && locality.toLowerCase() !== region.toLowerCase() ? `${locality}, ${region}` : locality,
    locality,
    region,
    country
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "Valid latitude and longitude are required." });
    }

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.search = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,cloud_cover,precipitation",
      hourly: "pressure_msl",
      daily: "sunrise,sunset",
      past_days: "1",
      forecast_days: "1",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      timezone: "auto"
    }).toString();

    const alertsUrl = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2&addressdetails=1&zoom=12&layer=address`;
    const bigDataUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;

    const [weatherResult, alertsResult, nominatimResult, bigDataResult] = await Promise.allSettled([
      fetchJson(weatherUrl.toString(), { headers: { "User-Agent": "BaitLogic/1.0 baitlogicadmin@gmail.com" } }, 5000, 2),
      fetchJson(alertsUrl, { headers: { "User-Agent": "BaitLogic/1.0 (baitlogicadmin@gmail.com)", "Accept": "application/geo+json" } }, 1500),
      fetchJson(nominatimUrl, { headers: { "User-Agent": "BaitLogic/1.0 (baitlogicadmin@gmail.com)", "Accept-Language": "en" } }, 2500),
      fetchJson(bigDataUrl, { headers: { "User-Agent": "BaitLogic/1.0 baitlogicadmin@gmail.com" } }, 2200)
    ]);

    if (weatherResult.status !== "fulfilled") {
      return res.status(502).json({ error: "Live weather source did not respond in time. Please refresh." });
    }

    const d = weatherResult.value;
    const c = d.current || {};
    if (!Number.isFinite(Number(c.pressure_msl))) {
      return res.status(502).json({ error: "Live pressure data was unavailable for this location." });
    }

    const times = d.hourly?.time || [];
    const pressures = d.hourly?.pressure_msl || [];
    const currentMs = c.time ? new Date(c.time).getTime() : Date.now();
    const idx = times.length ? nearestIndex(times, currentMs) : 0;
    const currentPressure = inHg(c.pressure_msl);
    const p3raw = Number(pressures[Math.max(0, idx - 3)]);
    const p6raw = Number(pressures[Math.max(0, idx - 6)]);
    const delta3 = Number.isFinite(p3raw) ? currentPressure - inHg(p3raw) : 0;
    const delta6 = Number.isFinite(p6raw) ? currentPressure - inHg(p6raw) : 0;
    const sunrise = Array.isArray(d.daily?.sunrise) && d.daily.sunrise.length ? d.daily.sunrise[d.daily.sunrise.length - 1] : null;
    const sunset = Array.isArray(d.daily?.sunset) && d.daily.sunset.length ? d.daily.sunset[d.daily.sunset.length - 1] : null;

    const alerts = alertsResult.status === "fulfilled"
      ? (alertsResult.value.features || []).slice(0, 5).map(feature => ({
          event: feature.properties?.event || "Weather alert",
          severity: feature.properties?.severity || "Unknown",
          urgency: feature.properties?.urgency || "Unknown",
          headline: feature.properties?.headline || "",
          instruction: feature.properties?.instruction || ""
        }))
      : [];

    const nominatimPlace = nominatimResult.status === "fulfilled" ? placeFromNominatim(nominatimResult.value) : null;
    const bigDataPlace = bigDataResult.status === "fulfilled" ? placeFromBigData(bigDataResult.value) : null;
    const place = nominatimPlace || bigDataPlace || null;
    const placeSource = nominatimPlace ? "OpenStreetMap Nominatim" : bigDataPlace ? "BigDataCloud" : "GPS only";

    return res.status(200).json({
      source: {
        weather: "Open-Meteo",
        alerts: alertsResult.status === "fulfilled" ? "National Weather Service" : "NWS unavailable",
        location: placeSource
      },
      updatedAt: new Date().toISOString(),
      location: place,
      weather: {
        temperatureF: Number(c.temperature_2m),
        apparentTemperatureF: Number(c.apparent_temperature),
        humidity: Number(c.relative_humidity_2m),
        code: Number(c.weather_code),
        pressureInHg: currentPressure,
        pressureDelta3h: delta3,
        pressureDelta6h: delta6,
        windMph: Number(c.wind_speed_10m || 0),
        windDirection: Number(c.wind_direction_10m),
        gustMph: Number(c.wind_gusts_10m || 0),
        cloudCover: Number(c.cloud_cover || 0),
        precipitationIn: Number(c.precipitation || 0),
        isDay: Number(c.is_day ?? 1),
        sunrise,
        sunset
      },
      alerts
    });
  } catch (error) {
    console.error("barometer-snapshot", error);
    return res.status(500).json({ error: "BaitLogic could not load live conditions. Please refresh." });
  }
};
