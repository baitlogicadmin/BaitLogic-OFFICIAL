import { expect, test, type Page } from "@playwright/test";

const WEATHER_FIXTURE = {
  source: { weather: "Open-Meteo", alerts: "National Weather Service", location: "Playwright fixture" },
  updatedAt: "2026-08-31T20:00:00.000Z",
  location: { name: "Highland, Illinois", locality: "Highland", region: "Illinois", country: "United States" },
  weather: {
    temperatureF: 74,
    apparentTemperatureF: 74,
    humidity: 55,
    code: 2,
    pressureInHg: 29.91,
    pressureDelta3h: -0.03,
    pressureDelta6h: -0.05,
    windMph: 8,
    windDirection: 315,
    gustMph: 12,
    cloudCover: 45,
    precipitationIn: 0,
    isDay: 1,
    sunrise: "2026-08-31T05:59:00-05:00",
    sunset: "2026-08-31T19:31:00-05:00",
  },
  alerts: [],
};

const WATER_FIXTURE = {
  source: "USGS Water Data for the Nation",
  stations: [{ site: "PLAYWRIGHT", name: "Verified-water test fixture", flow: 10, gage: 2, temp: 68 }],
  timestamp: "2026-08-31T20:00:00.000Z",
};

const CATCHES_FIXTURE = {
  catches: [{
    id: "playwright-catch-1",
    species: "Largemouth Bass",
    weight: 4.1,
    location: "Test fixture area",
    notes: "Playwright fixture only.",
    createdAt: "2026-08-31T19:00:00.000Z",
  }],
};

async function installDeterministicBackend(page: Page) {
  await page.route("**/api/barometer-snapshot**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WEATHER_FIXTURE) })
  );
  await page.route("**/api/water-snapshot**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WATER_FIXTURE) })
  );
  await page.route("**/api/catches**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CATCHES_FIXTURE) })
  );
}

function watchRuntimeFailures(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:4174" && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${url.pathname}`);
    }
  });
  return failures;
}

test.beforeEach(async ({ page }) => {
  await installDeterministicBackend(page);
  await page.addInitScript(() => localStorage.clear());
});

test("renders the correct implementation for the active device class", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile-app") {
    await expect(page.locator(".mobile-dashboard")).toBeVisible();
    await expect(page.locator(".desktop-dashboard")).toHaveCount(0);
  } else {
    await expect(page.locator(".desktop-dashboard")).toBeVisible();
    await expect(page.locator(".mobile-dashboard")).toHaveCount(0);
  }
});

test("verified condition data reaches the rendered UI without invented fallback values", async ({ page }, testInfo) => {
  await page.goto("/");
  const conditions = testInfo.project.name === "mobile-app"
    ? page.locator(".mobile-conditions")
    : page.locator(".desktop-conditions");
  await expect(conditions).toContainText("29.91");
  await expect(conditions).toContainText("inHg");
  await expect(conditions).toContainText("74°F");
  await expect(conditions).toContainText("68.0°F");
  await expect(conditions).toContainText("8 mph");
  await expect(page.getByText("LIVE", { exact: false }).first()).toBeVisible();

  if (testInfo.project.name === "mobile-app") {
    await expect(page.getByText("Highland, IL", { exact: true })).toBeVisible();
  }
});

test("unavailable data stays unavailable instead of silently becoming sample data", async ({ page }) => {
  await page.unroute("**/api/barometer-snapshot**");
  await page.unroute("**/api/water-snapshot**");
  await page.route("**/api/barometer-snapshot**", route =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture unavailable" }) })
  );
  await page.route("**/api/water-snapshot**", route =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fixture unavailable" }) })
  );
  await page.goto("/");

  await expect(page.getByText("29.91 inHg", { exact: true })).toHaveCount(0);
  await expect(page.getByText("74°F", { exact: true })).toHaveCount(0);
  await expect(page.getByText("68.0°F", { exact: true })).toHaveCount(0);
});

test("approved card order and dedicated Community Catches route are preserved", async ({ page }, testInfo) => {
  await page.goto("/");
  const selector = testInfo.project.name === "mobile-app" ? ".mobile-card" : ".desktop-card";
  const headingSelector = testInfo.project.name === "mobile-app" ? ".mobile-card h3" : ".desktop-card h2";

  await expect(page.locator(selector)).toHaveCount(6);
  const headings = await page.locator(headingSelector).allTextContents();
  if (testInfo.project.name === "mobile-app") {
    expect(headings).toEqual([
      "CONSERVATION REPORTING · LOCAL",
      "TRAILS & OFF-GRID",
      "BAROMETER",
      "OUTDOOR KNOWLEDGE",
      "FIELD LOG",
      "COMMUNITY CATCHES",
    ]);
  } else {
    expect(headings).toEqual([
      "CONSERVATION REPORTING · LOCAL",
      "TRAILS & OFF-GRID",
      "BAROMETER",
      "OUTDOOR KNOWLEDGE",
      "FIELD LOG",
      "COMMUNITY CATCHES",
    ]);
  }

  const catches = page.locator(`${selector}[href="/catches.html"]`);
  await expect(catches).toHaveCount(1);
});

test("mobile geometry stays compact and bottom navigation does not cover final content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile geometry gate");
  await page.goto("/");

  const conditionBox = await page.locator(".mobile-conditions").boundingBox();
  expect(conditionBox?.height ?? 9999).toBeLessThanOrEqual(190);

  const metricColumns = await page.locator(".mobile-metrics").evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  expect(metricColumns).toBe(6);

  const cardColumns = await page.locator(".mobile-card-grid").evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  expect(cardColumns).toBe(3);

  await expect(page.locator(".mobile-card.conservation")).toContainText("CONSERVATION REPORTING · LOCAL");
  await expect(page.locator(".mobile-conservation-strip")).toContainText("CONSERVATION FIRST");
  await expect(page.locator(".mobile-bottom-nav")).toContainText("PROFILE");

  const nav = page.locator(".mobile-bottom-nav");
  const initialNavBox = await nav.boundingBox();
  expect(initialNavBox?.height ?? 0).toBeGreaterThanOrEqual(80);
  expect(initialNavBox?.height ?? 999).toBeLessThanOrEqual(100);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);

  const finalBox = await page.locator(".mobile-conservation-strip").boundingBox();
  const navBox = await nav.boundingBox();
  expect(finalBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  if (finalBox && navBox) {
    expect(finalBox.y + finalBox.height).toBeLessThanOrEqual(navBox.y + 2);
  }
});

test("desktop keeps its separate four-column primary card layout", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-web", "desktop geometry gate");
  await page.goto("/");

  const columns = await page.locator(".desktop-card-grid").evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  expect(columns).toBe(4);
});

test("primary destinations render successfully", async ({ page }, testInfo) => {
  const failures = watchRuntimeFailures(page);
  const routes = ["/barometer.html", "/catches.html", "/field-intel.html", "/trails.html", "/outdoor.html"];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  }

  expect(failures, failures.join("\n")).toEqual([]);
  expect(testInfo.project.name).toMatch(/mobile-app|desktop-web/);
});

test("mobile candidate captures deterministic visual evidence for founder comparison", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "desktop has a separate founder approval gate");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);

  await expect(page.locator(".mobile-app-header")).toBeVisible();
  await expect(page.locator(".mobile-conditions")).toBeVisible();
  await expect(page.locator(".mobile-card")).toHaveCount(6);
  await expect(page.locator(".mobile-trusted")).toBeVisible();
  await expect(page.locator(".mobile-offline")).toBeVisible();
  await expect(page.locator(".mobile-conservation-strip")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("baitlogic-mobile-candidate.png"),
    fullPage: true,
    animations: "disabled",
  });
});
