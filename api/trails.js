"use strict";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OSM_MAP_URL = "https://api.openstreetmap.org/api/0.6/map";
const REGION = { south: 35.9, west: -95.9, north: 42.7, east: -87.2 };
const MAX_SPAN = 0.5;
const MAX_AREA = 0.08;
const MAX_FEATURES = 900;

function parseBbox(value) {
  const parts = String(value || "").split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [west, south, east, north] = parts;
  if (west >= east || south >= north) return null;
  if (west < REGION.west || east > REGION.east || south < REGION.south || north > REGION.north) return null;
  if (east - west > MAX_SPAN || north - south > MAX_SPAN || (east - west) * (north - south) > MAX_AREA) return null;
  return { west, south, east, north };
}

function radians(value) {
  return value * Math.PI / 180;
}

function distanceMiles(coordinates) {
  let miles = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const [lon1, lat1] = coordinates[index - 1];
    const [lon2, lat2] = coordinates[index];
    const latDelta = radians(lat2 - lat1);
    const lonDelta = radians(lon2 - lon1);
    const a = Math.sin(latDelta / 2) ** 2
      + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(lonDelta / 2) ** 2;
    miles += 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(miles * 100) / 100;
}

function normalizeWebsite(tags = {}) {
  const value = tags.website || tags.url || tags["contact:website"];
  return /^https?:\/\//i.test(value || "") ? value : null;
}

function isOfficial(tags = {}) {
  const evidence = `${tags.operator || ""} ${tags.owner || ""} ${tags.website || ""}`.toLowerCase();
  return /(department of natural resources|missouri department of conservation|state park|national forest|forest service|\.gov\b|mct trails|madison county transit)/.test(evidence);
}

function toFeature(element) {
  const coordinates = (element.geometry || [])
    .map((point) => [Number(point.lon), Number(point.lat)])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (coordinates.length < 2) return null;
  const tags = element.tags || {};
  return {
    type: "Feature",
    id: `osm-way-${element.id}`,
    geometry: { type: "LineString", coordinates },
    properties: {
      id: `osm-way-${element.id}`,
      osmId: element.id,
      name: tags.name || tags.ref || "Unnamed mapped trail",
      ref: tags.ref || null,
      operator: tags.operator || tags.owner || null,
      highway: tags.highway || "path",
      surface: tags.surface || null,
      access: tags.access || "check posted signs",
      foot: tags.foot || null,
      bicycle: tags.bicycle || null,
      horse: tags.horse || null,
      lit: tags.lit || null,
      website: normalizeWebsite(tags),
      official: isOfficial(tags),
      distanceMiles: distanceMiles(coordinates),
      routePoint: coordinates[0],
      source: "OpenStreetMap contributors",
    },
  };
}

function toTrailhead(element) {
  const lon = Number(element.lon);
  const lat = Number(element.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const tags = element.tags || {};
  return {
    type: "Feature",
    id: `osm-node-${element.id}`,
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      id: `osm-node-${element.id}`,
      osmId: element.id,
      name: tags.name || "Mapped trailhead",
      parking: tags.amenity === "parking" || tags.parking ? (tags.parking || "mapped parking") : null,
      operator: tags.operator || tags.owner || null,
      website: normalizeWebsite(tags),
      official: isOfficial(tags),
      source: "OpenStreetMap contributors",
    },
  };
}

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function xmlAttributes(source) {
  const attributes = {};
  for (const match of source.matchAll(/\b([a-zA-Z_:][\w:.-]*)="([^"]*)"/g)) attributes[match[1]] = decodeXml(match[2]);
  return attributes;
}

function xmlTags(source) {
  const tags = {};
  for (const match of source.matchAll(/<tag\b([^>]*?)\/?\s*>/g)) {
    const attributes = xmlAttributes(match[1]);
    if (attributes.k) tags[attributes.k] = attributes.v || "";
  }
  return tags;
}

function parseOsmXml(xml) {
  const coordinates = new Map();
  const trailheadNodes = [];
  for (const match of xml.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    const attributes = xmlAttributes(match[1]);
    const node = { type: "node", id: Number(attributes.id), lat: Number(attributes.lat), lon: Number(attributes.lon), tags: xmlTags(match[2] || "") };
    if (!Number.isFinite(node.id) || !Number.isFinite(node.lat) || !Number.isFinite(node.lon)) continue;
    coordinates.set(String(node.id), { lat: node.lat, lon: node.lon });
    if (node.tags.information === "trailhead" || (node.tags.amenity === "parking" && /^(yes|designated)$/.test(node.tags.hiking || ""))) trailheadNodes.push(node);
  }
  const ways = [];
  for (const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const attributes = xmlAttributes(match[1]);
    const body = match[2];
    const tags = xmlTags(body);
    if (!/^(path|footway|bridleway|track)$/.test(tags.highway || "") || ["private", "no"].includes(tags.access || "")) continue;
    const geometry = [...body.matchAll(/<nd\b[^>]*ref="([^"]+)"[^>]*\/?\s*>/g)].map((item) => coordinates.get(item[1])).filter(Boolean);
    ways.push({ type: "way", id: Number(attributes.id), geometry, tags });
  }
  return { ways, nodes: trailheadNodes };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  const bbox = parseBbox(req.query.bbox);
  if (!bbox) {
    return res.status(400).json({
      error: "Zoom farther into an Illinois or Missouri area before loading trails.",
      limits: { maximumSpanDegrees: MAX_SPAN, maximumAreaDegrees: MAX_AREA },
    });
  }

  const overpassBbox = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = `[out:json][timeout:18];(way["highway"~"^(path|footway|bridleway|track)$"]["access"!="private"]["access"!="no"](${overpassBbox});node["information"="trailhead"](${overpassBbox});node["amenity"="parking"]["hiking"~"^(yes|designated)$"](${overpassBbox}););out tags geom;`;

  try {
    let ways;
    let nodes;
    let provider = "OpenStreetMap Overpass API";
    const overpassController = new AbortController();
    const overpassTimeout = setTimeout(() => overpassController.abort(), 7_000);
    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "BaitLogic/1.0 (baitlogicadmin@gmail.com)",
        },
        body: new URLSearchParams({ data: query }),
        signal: overpassController.signal,
      });
      if (!response.ok) throw new Error(`Overpass request failed (${response.status})`);
      const payload = await response.json();
      ways = (payload.elements || []).filter((element) => element.type === "way");
      nodes = (payload.elements || []).filter((element) => element.type === "node");
    } catch (overpassError) {
      console.warn("trails-overpass-fallback", overpassError);
      provider = "OpenStreetMap map API fallback";
      const mapController = new AbortController();
      const mapTimeout = setTimeout(() => mapController.abort(), 15_000);
      try {
        const mapBbox = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
        const response = await fetch(`${OSM_MAP_URL}?bbox=${encodeURIComponent(mapBbox)}`, {
          headers: { "User-Agent": "BaitLogic/1.0 (baitlogicadmin@gmail.com)" },
          signal: mapController.signal,
        });
        if (!response.ok) throw new Error(`OpenStreetMap map request failed (${response.status})`);
        ({ ways, nodes } = parseOsmXml(await response.text()));
      } finally {
        clearTimeout(mapTimeout);
      }
    } finally {
      clearTimeout(overpassTimeout);
    }
    const features = ways.map(toFeature).filter(Boolean).slice(0, MAX_FEATURES);
    const trailheads = nodes.map(toTrailhead).filter(Boolean).slice(0, 300);
    return res.status(200).json({
      type: "FeatureCollection",
      features,
      trailheads,
      bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
      fetchedAt: new Date().toISOString(),
      truncated: features.length === MAX_FEATURES,
      source: "OpenStreetMap contributors",
      provider,
      sourceUrl: "https://www.openstreetmap.org/copyright",
      notice: "Trail geometry is community-mapped unless an official operator or government source is shown. Check current agency notices and posted signs.",
    });
  } catch (error) {
    console.error("trails", error);
    return res.status(502).json({ error: "Mapped trails could not be loaded right now. A saved offline area may still be available." });
  }
};

module.exports._test = { parseBbox, distanceMiles, toFeature, toTrailhead, parseOsmXml };
