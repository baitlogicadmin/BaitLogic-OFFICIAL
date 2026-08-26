import { expect, test } from "@playwright/test";

function snapshot(location: string, locality: string, overrides: Record<string, number> = {}) {
  return {
    source: { weather: "Open-Meteo", alerts: "National Weather Service", location: "OpenStreetMap Nominatim" },
    updatedAt: "2026-08-26T02:54:00.000Z",
    location: { name: location, locality, region: location.split(", ")[1] || "", country: "United States" },
    weather: {
      temperatureF: overrides.temperatureF ?? 61,
      apparentTemperatureF: overrides.apparentTemperatureF ?? 62,
      humidity: 72,
      code: 0,
      pressureInHg: overrides.pressureInHg ?? 30.16,
      pressureDelta3h: overrides.pressureDelta3h ?? 0.03,
      pressureDelta6h: overrides.pressureDelta6h ?? 0.05,
      windMph: overrides.windMph ?? 5,
      windDirection: 315,
      gustMph: 9,
      cloudCover: 5,
      precipitationIn: 0,
      isDay: 1,
      sunrise: "2026-08-26T06:20",
      sunset: "2026-08-26T19:40",
    },
    alerts: [],
  };
}

const highland = snapshot("Highland, Illinois", "Highland");

test("built Barometer loads live conditions, visible water evidence, and refreshes", async ({ page }) => {
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
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(highland) });
  });
  await page.route("**/api/water-snapshot**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      source: "USGS Water Data for the Nation",
      timestamp: "2026-08-26T02:54:00.000Z",
      stations: [{ site: "05593000", name: "Kaskaskia River near Venedy, IL", temp: 74.3, flow: 812, gage: 6.4 }],
    }),
  }));
  await page.route("**/api/catches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ catches: [] }) }));

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

  const waterStyles = await page.locator(".water-evidence-grid article").first().evaluate((article) => {
    const value = article.querySelector("strong");
    return {
      backgroundImage: getComputedStyle(article).backgroundImage,
      valueColor: value ? getComputedStyle(value).color : "",
    };
  });
  expect(waterStyles.backgroundImage).not.toBe("none");
  expect(waterStyles.valueColor).not.toBe("rgb(255, 255, 255, 0)");

  const before = weatherRequests;
  await page.getByRole("button", { name: "Refresh now" }).click();
  await expect.poll(() => weatherRequests).toBeGreaterThan(before);
  expect(pageErrors).toEqual([]);
});

test("built Barometer follows a changed device location instead of staying on Highland", async ({ page }) => {
  await page.addInitScript(() => {
    let call = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          call += 1;
          const chicago = call > 1;
          success({
            coords: {
              latitude: chicago ? 41.8781 : 38.7395,
              longitude: chicago ? -87.6298 : -89.6712,
              accuracy: 15,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
  });

  const chicago = snapshot("Chicago, Illinois", "Chicago", { temperatureF: 66.4, apparentTemperatureF: 67.2, pressureInHg: 30.0, windMph: 5.4 });
  const requestedCoordinates: string[] = [];
  await page.route("**/api/barometer-snapshot**", async (route) => {
    const url = new URL(route.request().url());
    requestedCoordinates.push(`${url.searchParams.get("lat")},${url.searchParams.get("lon")}`);
    const lat = Number(url.searchParams.get("lat"));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(lat > 40 ? chicago : highland) });
  });
  await page.route("**/api/water-snapshot**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "USGS Water Data for the Nation", timestamp: "2026-08-26T02:54:00.000Z", stations: [] }) }));
  await page.route("**/api/catches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ catches: [] }) }));

  await page.goto("/barometer.html");
  await expect(page.locator("#locationName")).toHaveText("Highland, Illinois");

  await page.getByRole("button", { name: "Relocate" }).click();
  await expect(page.locator("#locationName")).toHaveText("Chicago, Illinois");
  await expect(page.locator("#airTemperature")).toHaveText("66°");
  await expect.poll(() => requestedCoordinates.some((coords) => coords.startsWith("41.8781,-87.6298"))).toBe(true);
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
