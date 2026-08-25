import { expect, test } from "@playwright/test";

const snapshot = {
  source: { weather: "Open-Meteo", alerts: "National Weather Service", location: "OpenStreetMap Nominatim" },
  updatedAt: "2026-08-25T05:15:00.000Z",
  location: { name: "Highland, Illinois", locality: "Highland", region: "Illinois", country: "United States" },
  weather: {
    temperatureF: 61,
    apparentTemperatureF: 62,
    humidity: 72,
    code: 0,
    pressureInHg: 30.16,
    pressureDelta3h: 0.03,
    pressureDelta6h: 0.05,
    windMph: 5,
    windDirection: 315,
    gustMph: 9,
    cloudCover: 5,
    precipitationIn: 0,
    isDay: 1,
    sunrise: "2026-08-25T06:20",
    sunset: "2026-08-25T19:40"
  },
  alerts: []
};

test("built Barometer loads live conditions, water evidence, and refreshes", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: {
            latitude: 38.7395,
            longitude: -89.6712,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition),
      },
    });
  });

  let weatherRequests = 0;
  await page.route("**/api/barometer-snapshot**", async (route) => {
    weatherRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(snapshot) });
  });
  await page.route("**/api/water-snapshot**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      source: "USGS Water Data for the Nation",
      timestamp: "2026-08-25T05:15:00.000Z",
      stations: [{ site: "05593000", name: "Kaskaskia River near Venedy, IL", temp: 74.3, flow: 812, gage: 6.4 }],
    }),
  }));
  await page.route("**/api/catches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ catches: [] }) }));
  await page.route("https://api.bigdatacloud.net/**", (route) => route.abort());

  await page.goto("/barometer.html");

  await expect(page.locator("#locationName")).toHaveText("Highland, Illinois");
  await expect(page.locator("#pressureValue")).toHaveText("30.16");
  await expect(page.locator("#airTemperature")).toHaveText("61°");
  await expect(page.locator("#windValue")).toHaveText("5 mph");
  await expect(page.locator("#dataState")).toHaveText("Live conditions loaded");
  await expect(page.locator("#primaryDecision")).not.toHaveText("CHECKING");
  await expect(page.locator("#waterEvidenceState")).toHaveText("LIVE");
  await expect(page.locator("#waterStation")).toContainText("Kaskaskia River");
  await expect(page.locator("#waterTemp")).toBeVisible();
  const waterColors = await page.locator(".water-evidence-grid article").first().evaluate((article) => {
    const value = article.querySelector("strong");
    return {
      background: getComputedStyle(article).backgroundColor,
      valueColor: value ? getComputedStyle(value).color : "",
    };
  });
  expect(waterColors.background).not.toBe("rgb(255, 255, 255)");
  expect(waterColors.valueColor).not.toBe(waterColors.background);

  const before = weatherRequests;
  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect.poll(() => weatherRequests).toBeGreaterThan(before);

  expect(pageErrors).toEqual([]);
});

test("built Barometer gives a usable recovery path when location is denied", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1, message: "denied" } as GeolocationPositionError),
      },
    });
  });
  await page.route("**/api/catches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ catches: [] }) }));

  await page.goto("/barometer.html");

  await expect(page.locator("#locationName")).toHaveText("Location needed");
  await expect(page.locator("#locationDetail")).toContainText("Location permission is blocked");
  await expect(page.getByRole("button", { name: "Relocate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh now" })).toBeVisible();
});
