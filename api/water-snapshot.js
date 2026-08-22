"use strict";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  try {
    const requestUrl = new URL(req.url || "/api/water-snapshot", "https://www.bait-logic.com");
    const lat = Number(requestUrl.searchParams.get("lat"));
    const lon = Number(requestUrl.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "Valid latitude and longitude are required." });
    }

    const delta = 0.35;
    const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].map(value => value.toFixed(5)).join(",");
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bbox}&parameterCd=00060,00065,00010&siteStatus=active`;
    const response = await fetch(url, { headers: { "User-Agent": "BaitLogic/1.0 (baitlogic@outlook.com)" } });
    if (!response.ok) throw new Error(`USGS request failed (${response.status})`);

    const data = await response.json();
    const series = data?.value?.timeSeries || [];
    const bySite = new Map();

    for (const timeSeries of series) {
      const source = timeSeries.sourceInfo || {};
      const code = timeSeries.variable?.variableCode?.[0]?.value;
      const raw = timeSeries.values?.[0]?.value?.[0]?.value;
      const site = source.siteCode?.[0]?.value || "USGS";
      if (!bySite.has(site)) bySite.set(site, { site, name: source.siteName || site, flow: null, gage: null, temp: null });
      const row = bySite.get(site);
      const value = raw == null ? null : Number(raw);
      if (!Number.isFinite(value)) continue;
      if (code === "00060") row.flow = Math.round(value * 10) / 10;
      if (code === "00065") row.gage = Math.round(value * 100) / 100;
      if (code === "00010") row.temp = Math.round((value * 9 / 5 + 32) * 10) / 10;
    }

    return res.status(200).json({
      source: "USGS Water Data for the Nation",
      stations: [...bySite.values()].slice(0, 8),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("water-snapshot", error);
    return res.status(502).json({ error: "USGS water data could not be verified right now." });
  }
};
