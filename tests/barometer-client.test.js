const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = readFileSync(new URL("../public/barometer/app.js", `file://${__filename}`), "utf8");

function element() {
  return {
    textContent: "",
    value: "",
    hidden: false,
    disabled: false,
    innerHTML: "",
    classList: { add() {}, remove() {} },
    addEventListener(type, listener) { this.listeners ||= {}; this.listeners[type] = listener; },
    querySelector() { return element(); },
    reset() {},
  };
}

function harness(getCurrentPosition, initialStorage = {}) {
  const elements = new Map();
  const document = {
    hidden: false,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
  };
  const snapshot = {
    updatedAt: "2026-08-24T11:24:24.641Z",
    source: { alerts: "National Weather Service" },
    location: { name: "Highland, Illinois" },
    weather: {
      temperatureF: 55.6,
      apparentTemperatureF: 55.7,
      code: 0,
      pressureInHg: 30.0497,
      pressureDelta3h: 0.0089,
      pressureDelta6h: 0.0207,
      windMph: 1.8,
      windDirection: 194,
      gustMph: 3.6,
      cloudCover: 6,
      precipitationIn: 0,
      isDay: 0,
      sunrise: "2026-08-24T06:21",
      sunset: "2026-08-24T19:40",
    },
    alerts: [],
  };
  const storage = new Map(Object.entries(initialStorage));
  const context = vm.createContext({
    AbortController,
    Date,
    FormData,
    alert() {},
    document,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    navigator: {
      onLine: true,
      geolocation: { getCurrentPosition },
      serviceWorker: { register: async () => {} },
    },
    fetch: async (url) => ({
      ok: true,
      status: 200,
      json: async () => String(url).startsWith("/api/catches") ? { catches: [] } : snapshot,
    }),
    setInterval: () => 0,
    setTimeout,
    clearTimeout,
    window: { addEventListener() {} },
  });
  vm.runInContext(source, context);
  return { elements, snapshot, storage };
}

test("barometer uses a fast location fix and renders live Highland data", async () => {
  let options;
  const { elements } = harness((success, _error, receivedOptions) => {
    options = receivedOptions;
    success({ coords: { latitude: 38.7395, longitude: -89.6712, accuracy: 24 } });
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(options.enableHighAccuracy, false);
  assert.equal(options.timeout, 9000);
  assert.equal(options.maximumAge, 300000);
  assert.equal(elements.get("#locationName").textContent, "Highland, Illinois");
  assert.equal(elements.get("#pressureValue").textContent, "30.05");
  assert.equal(elements.get("#connectionStatus").textContent, "Live");
});

test("barometer replaces the endless locator with an actionable permission error", () => {
  const { elements } = harness((_success, error) => error({ code: 1 }));

  assert.equal(elements.get("#locationName").textContent, "Location needed");
  assert.match(elements.get("#locationDetail").textContent, /allow Location for bait-logic\.com/i);
  assert.equal(elements.get("#primaryDecision").textContent, "RETRY");
  assert.equal(elements.get("#connectionStatus").textContent, "Unavailable");
});

test("barometer paints saved verified conditions before GPS responds", () => {
  const cachedSnapshot = {
    savedAt: Date.now(),
    lat: 38.74,
    lon: -89.67,
    accuracy: 1500,
    snapshot: {
      updatedAt: "2026-08-24T11:24:24.641Z",
      source: { alerts: "National Weather Service" },
      location: { name: "Highland, Illinois" },
      weather: {
        temperatureF: 55.6, apparentTemperatureF: 55.7, code: 0,
        pressureInHg: 30.0497, pressureDelta3h: 0.0089, pressureDelta6h: 0.0207,
        windMph: 1.8, windDirection: 194, gustMph: 3.6, cloudCover: 6,
        precipitationIn: 0, isDay: 0,
      },
      alerts: [],
    },
  };
  const { elements } = harness((_success, error) => {
    setTimeout(() => error({ code: 3 }), 50);
  }, { "baitlogic-barometer-last-v1": JSON.stringify(cachedSnapshot) });

  assert.equal(elements.get("#locationName").textContent, "Highland, Illinois");
  assert.equal(elements.get("#pressureValue").textContent, "30.05");
  assert.equal(elements.get("#connectionStatus").textContent, "Saved");
  assert.match(elements.get("#locationDetail").textContent, /refreshing/i);
});
