"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseBbox, distanceMiles, toFeature, toTrailhead, parseOsmXml } = require("../api/trails")._test;
const trailHandler = require("../api/trails");

test("trail bbox accepts a focused Illinois view and rejects unsafe scopes", () => {
  assert.deepEqual(parseBbox("-89.75,38.7,-89.55,38.82"), { west: -89.75, south: 38.7, east: -89.55, north: 38.82 });
  assert.equal(parseBbox("-95.9,35.9,-87.2,42.7"), null);
  assert.equal(parseBbox("-100,38,-99,39"), null);
  assert.equal(parseBbox("bad,input"), null);
});

test("trail conversion preserves route facts without inventing difficulty", () => {
  const feature = toFeature({
    id: 123,
    geometry: [{ lat: 38.7, lon: -89.5 }, { lat: 38.71, lon: -89.49 }],
    tags: { name: "Field Trail", surface: "gravel", operator: "Illinois Department of Natural Resources" },
  });
  assert.equal(feature.properties.name, "Field Trail");
  assert.equal(feature.properties.surface, "gravel");
  assert.equal(feature.properties.official, true);
  assert.ok(feature.properties.distanceMiles > 0);
  assert.equal("difficulty" in feature.properties, false);
});

test("distance calculation is stable for a known segment", () => {
  const miles = distanceMiles([[-89.5, 38.7], [-89.49, 38.71]]);
  assert.ok(miles > 0.8 && miles < 1.0);
});

test("trailhead conversion only labels actual mapped trailhead nodes", () => {
  const trailhead = toTrailhead({ id: 7, lat: 38.7, lon: -89.5, tags: { information: "trailhead", name: "North Trailhead" } });
  assert.equal(trailhead.geometry.type, "Point");
  assert.equal(trailhead.properties.name, "North Trailhead");
});

test("OpenStreetMap XML fallback keeps eligible trails and real trailheads", () => {
  const parsed = parseOsmXml(`<?xml version="1.0"?><osm>
    <node id="1" lat="38.7" lon="-89.5"><tag k="information" v="trailhead"/><tag k="name" v="North &amp; South"/></node>
    <node id="2" lat="38.71" lon="-89.49"/>
    <way id="3"><nd ref="1"/><nd ref="2"/><tag k="highway" v="path"/><tag k="name" v="Field Trail"/></way>
    <way id="4"><nd ref="1"/><nd ref="2"/><tag k="highway" v="path"/><tag k="access" v="private"/></way>
  </osm>`);
  assert.equal(parsed.ways.length, 1);
  assert.equal(parsed.ways[0].geometry.length, 2);
  assert.equal(parsed.nodes[0].tags.name, "North & South");
});

test("trail endpoint returns GeoJSON and sends a bounded Overpass query", async () => {
  const originalFetch = global.fetch;
  let requestBody = "";
  global.fetch = async (_url, options) => {
    requestBody = String(options.body);
    return {
      ok: true,
      json: async () => ({ elements: [
        { type: "way", id: 9, geometry: [{ lat: 38.7, lon: -89.5 }, { lat: 38.71, lon: -89.49 }], tags: { name: "Test Trail" } },
        { type: "node", id: 10, lat: 38.7, lon: -89.5, tags: { information: "trailhead", name: "Test Trailhead" } },
      ] }),
    };
  };
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    end() { return this; },
  };
  try {
    await trailHandler({ method: "GET", query: { bbox: "-89.75,38.7,-89.55,38.82" } }, response);
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.type, "FeatureCollection");
  assert.equal(response.payload.features[0].properties.name, "Test Trail");
  assert.equal(response.payload.trailheads[0].properties.name, "Test Trailhead");
  assert.match(requestBody, /38.7%2C-89.75%2C38.82%2C-89.55/);
});
