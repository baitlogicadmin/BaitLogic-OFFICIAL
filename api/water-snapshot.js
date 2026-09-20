"use strict";

const USGS_URL = "https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items";

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "Valid latitude and longitude are required." });
  }

  const delta = 0.35;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].map(value => value.toFixed(5)).join(",");

  try {
    const url = new URL(USGS_URL);
    url.searchParams.set("f", "json");
    url.searchParams.set("bbox", bbox);
    url.searchParams.set("parameter_code", "00060,00065,00010");
    url.searchParams.set("limit", "500");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "BaitLogic/1.0 (baitlogicadmin@gmail.com)", Accept: "application/geo+json,application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new Error(`USGS modern API request failed (${response.status})`);
    const data = await response.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    const bySite = new Map();

    for (const feature of features) {
      const p = feature?.properties || {};
      const site = p.monitoring_location_id || p.monitoring_location_number || "USGS";
      if (!bySite.has(site)) {
        bySite.set(site, {
          site,
          name: p.monitoring_location_name || site,
          flow: null,
          gage: null,
          temp: null,
          timestamp: null,
          approval: null,
        });
      }

      const row = bySite.get(site);
      const value = parseNumber(p.value);
      if (value == null) continue;
      const code = String(p.parameter_code || "");
      if (code === "00060") row.flow = Math.round(value * 10) / 10;
      if (code === "00065") row.gage = Math.round(value * 100) / 100;
      if (code === "00010") {
        const unit = String(p.unit_of_measure || "").toLowerCase();
        row.temp = unit.includes("c") && !unit.includes("cf") ? Math.round((value * 9 / 5 + 32) * 10) / 10 : Math.round(value * 10) / 10;
      }
      if (p.time) row.timestamp = p.time;
      if (p.approval_status) row.approval = p.approval_status;
    }

    return res.status(200).json({
      source: "USGS Water Data APIs — latest continuous",
      stations: [...bySite.values()].slice(0, 8),
      timestamp: new Date().toISOString(),
      providerUpdated: features.length > 0 ? features.map(f => f.properties?.time).filter(Boolean).sort().at(-1) || null : null,
    });
  } catch (error) {
    console.error("water-snapshot", error);
    return res.status(200).json({
      source: "USGS Water Data APIs — latest continuous",
      stations: [],
      unavailable: true,
      timestamp: new Date().toISOString(),
      error: "Nearby USGS water data could not be verified right now. No water values were estimated.",
    });
  }
};

module.exports._test = { parseNumber };
