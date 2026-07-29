"use strict";

// Same Supabase project used across the site (config.js / app.js at site root).
const PRESSURE_FUNCTION_URL =
  "https://khhishscjirjxhsulniq.supabase.co/functions/v1/quick-processor";

// Fallback location if the user declines GPS — Carlyle Lake dam vicinity.
const FALLBACK_LOCATION = { latitude: 38.6189, longitude: -89.3529, label: "Carlyle Lake (default)" };

const state = {
  latitude: null,
  longitude: null,
  locationLabel: "Current location",
  pressure: null,
  previousPressure: null,
  selectedSpecies: "Largemouth Bass",
  catchWeight: 1,
  deferredInstallPrompt: null,
  loading: false,
  pressureController: null
};

const elements = {
  airTemperature: document.querySelector("#airTemperature"),
  weatherCondition: document.querySelector("#weatherCondition"),
  locationName: document.querySelector("#locationName"),
  pressureValue: document.querySelector("#pressureValue"),
  pressureTrend: document.querySelector("#pressureTrend"),
  pressureNeedle: document.querySelector("#pressureNeedle"),
  biteStatus: document.querySelector("#biteStatus"),
  lastUpdated: document.querySelector("#lastUpdated"),
  locationStatus: document.querySelector("#locationStatus"),
  locationStatusDot: document.querySelector("#locationStatusDot"),
  pressureTrendLine: document.querySelector("#pressureTrendLine"),
  refreshConditions: document.querySelector("#refreshConditions"),
  pressureDialButton: document.querySelector("#pressureDialButton"),
  recentCatches: document.querySelector("#recentCatches"),
  connectionStatus: document.querySelector("#connectionStatus"),
  installButton: document.querySelector("#installButton"),
  catchLoggerModal: document.querySelector("#catchLoggerModal"),
  openCatchLogger: document.querySelector("#openCatchLogger"),
  closeCatchLogger: document.querySelector("#closeCatchLogger"),
  bottomLogButton: document.querySelector("#bottomLogButton"),
  bottomRefreshButton: document.querySelector("#bottomRefreshButton"),
  cancelCatch: document.querySelector("#cancelCatch"),
  catchForm: document.querySelector("#catchForm"),
  speciesSelector: document.querySelector("#speciesSelector"),
  catchWeight: document.querySelector("#catchWeight"),
  increaseWeight: document.querySelector("#increaseWeight"),
  decreaseWeight: document.querySelector("#decreaseWeight"),
  catchLocation: document.querySelector("#catchLocation"),
  useCatchLocation: document.querySelector("#useCatchLocation"),
  catchNotes: document.querySelector("#catchNotes"),
  waterDepth: document.querySelector("#waterDepth"),
  waterTemperature: document.querySelector("#waterTemperature")
};

const weatherDescriptions = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy",
  45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
  95: "Thunderstorms", 96: "Storms", 99: "Severe storms"
};

// trend -> { badge text, badge class, needle degrees }
// Needle sweeps -80deg (falling fast) to +80deg (rising fast), 0 = steady.
const TREND_META = {
  falling_fast: { badge: "PRIME BITE", cls: "good", angle: -80 },
  falling: { badge: "GOOD", cls: "good", angle: -35 },
  steady: { badge: "STEADY", cls: "", angle: 0 },
  rising: { badge: "FAIR", cls: "", angle: 35 },
  rising_fast: { badge: "TOUGH", cls: "bad", angle: 80 }
};

function setConnectionStatus() {
  elements.connectionStatus.textContent = navigator.onLine ? "Online" : "Offline mode";
}

function setLoadingState() {
  elements.weatherCondition.textContent = "Updating";
  elements.locationStatus.textContent = "Getting current conditions";
  elements.refreshConditions.disabled = true;
}

function clearLoadingState() {
  elements.refreshConditions.disabled = false;
}

function showLocationError(message) {
  elements.locationStatus.textContent = message;
  elements.locationStatusDot.classList.add("error");
  clearLoadingState();
}

function getLocation() {
  setLoadingState();

  if (!navigator.geolocation) {
    useFallbackLocation("GPS isn't supported on this device — showing Carlyle Lake.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.latitude = position.coords.latitude;
      state.longitude = position.coords.longitude;
      state.locationLabel = "Current location";

      elements.locationStatus.textContent = "Location connected";
      elements.locationStatusDot.classList.remove("error");
      elements.locationStatusDot.classList.add("locked");
      elements.catchLocation.value = `${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}`;

      loadConditions();
    },
    () => {
      useFallbackLocation("Location unavailable — showing Carlyle Lake.");
    },
    { timeout: 10000 }
  );
}

function useFallbackLocation(message) {
  state.latitude = FALLBACK_LOCATION.latitude;
  state.longitude = FALLBACK_LOCATION.longitude;
  state.locationLabel = FALLBACK_LOCATION.label;

  elements.locationStatus.textContent = message;
  elements.locationStatusDot.classList.add("error");

  loadConditions();
}

async function loadConditions() {
  if (state.loading) return;
  state.loading = true;
  setLoadingState();

  await Promise.all([loadPressure(), loadWeather()]);

  elements.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  clearLoadingState();
  state.loading = false;
}

async function loadPressure() {
  if (state.pressureController) state.pressureController.abort();
  const controller = new AbortController();
  state.pressureController = controller;

  try {
    const url = `${PRESSURE_FUNCTION_URL}?lat=${state.latitude}&lon=${state.longitude}`;
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Couldn't load pressure data.");

    state.previousPressure = state.pressure;
    state.pressure = data.latest.pressureInHg;

    elements.pressureValue.textContent = data.latest.pressureInHg.toFixed(2);
    elements.locationName.textContent = data.station.name;

    const offlineNote = navigator.onLine ? "" : " (offline — last known reading)";
    elements.pressureTrend.textContent = data.guidance + offlineNote;

    const meta = TREND_META[data.trend] || TREND_META.steady;
    elements.biteStatus.textContent = meta.badge;
    elements.biteStatus.className = `status-pill ${meta.cls}`.trim();
    elements.pressureNeedle.style.transform = `translateX(-50%) rotate(${meta.angle}deg)`;

    if (Array.isArray(data.series) && data.series.length > 1) {
      drawTrendLine(data.series);
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    elements.pressureTrend.textContent = err.message || "Pressure data unavailable right now.";
    elements.biteStatus.textContent = "N/A";
    elements.biteStatus.className = "status-pill";
  }
}

function drawTrendLine(series) {
  const values = series.map((p) => p.pressureInHg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;

  const width = 720;
  const height = 70;
  const padY = 10;

  const points = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * width;
      const normalized = (p.pressureInHg - min) / range;
      const y = height - padY - normalized * (height - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  elements.pressureTrendLine.setAttribute("points", points);
}

async function loadWeather() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${state.latitude}&longitude=${state.longitude}` +
      `&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.current) throw new Error("No current weather returned.");

    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;

    elements.airTemperature.textContent = `${temp}°`;
    elements.weatherCondition.textContent = weatherDescriptions[code] || "Unknown";
  } catch {
    elements.airTemperature.textContent = "--°";
    elements.weatherCondition.textContent = "Weather unavailable";
  }
}

async function loadRecentCatches() {
  try {
    const res = await fetch("/api/catches");
    const data = await res.json();
    const list = Array.isArray(data.catches) ? data.catches : [];

    if (list.length === 0) {
      elements.recentCatches.innerHTML = `<li class="catches-empty">No catches logged yet — be the first.</li>`;
      return;
    }

    elements.recentCatches.innerHTML = list
      .slice(0, 8)
      .map((c) => {
        const weight = c.weight ? `${c.weight} lb ` : "";
        const where = c.location ? ` · ${escapeHtml(c.location)}` : "";
        return `<li><strong>${escapeHtml(c.species)}</strong> — ${weight}${escapeHtml(c.notes || "")}${where}</li>`;
      })
      .join("");
  } catch {
    elements.recentCatches.innerHTML = `<li class="catches-empty">Couldn't load recent catches.</li>`;
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
  ));
}

// --- Catch logger modal ---

function openModal() {
  elements.catchLoggerModal.hidden = false;
}

function closeModal() {
  elements.catchLoggerModal.hidden = true;
}

function setupCatchLogger() {
  elements.openCatchLogger.addEventListener("click", openModal);
  elements.bottomLogButton.addEventListener("click", openModal);
  elements.closeCatchLogger.addEventListener("click", closeModal);
  elements.cancelCatch.addEventListener("click", closeModal);

  elements.increaseWeight.addEventListener("click", () => {
    elements.catchWeight.value = (parseFloat(elements.catchWeight.value || "0") + 0.5).toFixed(1);
  });

  elements.decreaseWeight.addEventListener("click", () => {
    const next = Math.max(0, parseFloat(elements.catchWeight.value || "0") - 0.5);
    elements.catchWeight.value = next.toFixed(1);
  });

  elements.useCatchLocation.addEventListener("click", () => {
    if (state.latitude && state.longitude) {
      elements.catchLocation.value = `${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}`;
    }
  });

  elements.catchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      species: elements.speciesSelector.value,
      weight: elements.catchWeight.value,
      location: elements.catchLocation.value,
      notes: elements.catchNotes.value
    };

    const submitButton = elements.catchForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
      const res = await fetch("/api/catches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save catch.");

      elements.catchForm.reset();
      closeModal();
      loadRecentCatches();
    } catch (err) {
      alert(err.message || "Couldn't save catch. Try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Save Catch";
    }
  });
}

// --- Install prompt (PWA) ---

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    elements.installButton.hidden = true;
  });
}

// --- Wiring ---

function setupRefresh() {
  elements.pressureDialButton.addEventListener("click", loadConditions);
  elements.refreshConditions.addEventListener("click", loadConditions);
  elements.bottomRefreshButton.addEventListener("click", loadConditions);
}

// --- Offline support ---

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/barometer/sw.js")
    .catch((err) => console.warn("Service worker registration failed:", err));
}

document.addEventListener("DOMContentLoaded", () => {
  setConnectionStatus();
  window.addEventListener("online", setConnectionStatus);
  window.addEventListener("offline", setConnectionStatus);

  registerServiceWorker();
  setupCatchLogger();
  setupInstallPrompt();
  setupRefresh();

  loadRecentCatches();
  getLocation();

  // Refresh pressure/weather every 10 minutes automatically.
  setInterval(loadConditions, 10 * 60 * 1000);
});
