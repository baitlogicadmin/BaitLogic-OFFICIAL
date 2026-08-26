"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseBbox, distanceMiles, toFeature, toTrailhead } = require("../api/trails")._test;
const trailHandler = require("../api/trails");

test("trail bbox accepts a focused Illinois view and rejects unsafe scopes", () => {
  assert.deepEqual(parseBbox("-89.8,38.4,-89.2,39.0"), { west: -89.8, south: 38.4, east: -89.2, north: 39 });
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
    await trailHandler({ method: "GET", query: { bbox: "-89.8,38.4,-89.2,39.0" } }, response);
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.type, "FeatureCollection");
  assert.equal(response.payload.features[0].properties.name, "Test Trail");
  assert.equal(response.payload.trailheads[0].properties.name, "Test Trailhead");
  assert.match(requestBody, /38.4%2C-89.8%2C39%2C-89.2/);
});
