import { expect, test, type Page } from "@playwright/test";

const WEATHER_FIXTURE = {
  source: { weather: "Open-Meteo", alerts: "National Weather Service", location: "Playwright fixture" },
  updatedAt: new Date().toISOString(),
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
  stations: [{ site: "PLAYWRIGHT", name: "Verified-water test fixture", flow: 1240, gage: 2, temp: 68 }],
  timestamp: new Date().toISOString(),
};

const CATCHES_FIXTURE = {
  catches: [{
    id: "playwright-catch-1",
    species: "Largemouth Bass",
    weight: 4.1,
    location: "Test fixture area",
    notes: "Playwright fixture only.",
    createdAt: new Date().toISOString(),
  }],
};

async function installDeterministicBackend(page: Page) {
  await page.route("**/api/barometer-snapshot**", route =>
    route.fulfill({ status: 200, headers: { "X-BaitLogic-Source": "live" }, contentType: "application/json", body: JSON.stringify(WEATHER_FIXTURE) })
  );
  await page.route("**/api/water-snapshot**", route =>
    route.fulfill({ status: 200, headers: { "X-BaitLogic-Source": "live" }, contentType: "application/json", body: JSON.stringify(WATER_FIXTURE) })
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
    await expect(page.locator(".bl-home")).toBeVisible();
    await expect(page.locator(".desktop-dashboard")).toHaveCount(0);
  } else {
    await expect(page.locator(".desktop-dashboard")).toBeVisible();
    await expect(page.locator(".bl-home")).toHaveCount(0);
  }
});

test("verified condition data reaches the mobile interface without invented values", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile data gate");
  await page.goto("/");
  await expect(page.locator(".bl-conditions")).toContainText("74°F");
  await expect(page.locator(".bl-conditions")).toContainText("68.0°F");
  await expect(page.locator(".bl-conditions")).toContainText("29.91 inHg");
  await expect(page.locator(".bl-conditions")).toContainText("8 mph");
  await expect(page.locator(".bl-location")).toContainText("Highland");
});

test("mobile homepage preserves the founder-authorized information architecture", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile founder gate");
  await page.goto("/");

  await expect(page.locator(".bl-logo").first()).toHaveAttribute("src", "/assets/baitlogic-boysenberry-logo.svg");
  await expect(page.locator(".bl-conditions")).toContainText("OUTDOOR CONDITIONS");
  await expect(page.locator(".bl-condition-metrics > div")).toHaveCount(4);
  await expect(page.locator(".bl-feature")).toHaveCount(3);
  await expect(page.locator(".bl-feature.water-flow")).toContainText("WATER & FLOW");
  await expect(page.locator(".bl-feature.catches")).toContainText("LOCAL CATCHES");
  await expect(page.locator(".bl-feature.trails")).toContainText("TRAILS & MAPS");
  await expect(page.locator(".bl-education-card")).toHaveCount(6);
  await expect(page.locator(".bl-sources")).toContainText("Offline Ready");
});

test("every founder-authorized mobile card points at the intended real destination", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile action gate");
  await page.goto("/");

  const expected = [
    [".bl-primary-cta", "/barometer.html"],
    [".bl-report-now a", "/field-intel.html#conservation"],
    [".bl-feature.trails", "/trails.html"],
    [".bl-feature.water-flow", "/field-intel.html#water"],
    [".bl-feature.catches", "/catches.html"],
    [".bl-section-row a", "/outdoor.html"],
    [".bl-bottom-nav a:nth-child(1)", "/"],
    [".bl-bottom-nav a:nth-child(2)", "/trails.html"],
    [".bl-bottom-nav a:nth-child(3)", "/field-intel.html#field-check"],
    [".bl-bottom-nav a:nth-child(4)", "/field-intel.html#conservation"],
    [".bl-bottom-nav a:nth-child(5)", "/profile.html"],
  ] as const;

  for (const [selector, href] of expected) {
    await expect(page.locator(selector)).toHaveAttribute("href", href);
  }
});

test("primary destinations ship real non-empty documents", async ({ page, request }, testInfo) => {
  const routes = ["/barometer.html", "/catches.html", "/field-intel.html", "/trails.html", "/outdoor.html", "/profile.html"];

  for (const route of routes) {
    const response = await request.get(route, { timeout: 15000 });
    expect(response.status(), route).toBeLessThan(400);
    const body = await response.text();
    expect(body.trim().length, route + " body").toBeGreaterThan(100);
  }

  expect(testInfo.project.name).toMatch(/mobile-app|desktop-web/);
});

test("barometer Highland fallback is wired to verified pressure loading", async ({ request }) => {
  const documentResponse = await request.get("/barometer.html", { timeout: 15000 });
  expect(documentResponse.status()).toBe(200);
  const documentHtml = await documentResponse.text();
  expect(documentHtml).toContain('id="useHighland"');
  expect(documentHtml).toContain('id="pressureValue"');
  expect(documentHtml).toContain('/barometer/app.js?v=13');

  const appResponse = await request.get("/barometer/app.js?v=13", { timeout: 15000 });
  expect(appResponse.status()).toBe(200);
  const appJs = await appResponse.text();
  expect(appJs).toContain('E.useHighland?.addEventListener("click",useHighland)');
  expect(appJs).toContain('fetchWithTimeout(`/api/barometer-snapshot');
  expect(appJs).toContain('38.7395');
  expect(appJs).toContain('-89.6712');
});

test("mobile candidate captures deterministic founder-review evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile screenshot only");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);

  await expect(page.locator(".bl-header")).toBeVisible();
  await expect(page.locator(".bl-conditions")).toBeVisible();
  await expect(page.locator(".bl-feature")).toHaveCount(3);
  await expect(page.locator(".bl-sources")).toBeVisible();
  await expect(page.locator(".bl-bottom-nav")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("baitlogic-mobile-candidate.png"),
    fullPage: true,
    animations: "disabled",
  });
});


test("founder-authorized phone composition does not overflow or collapse", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile geometry gate");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const cardGrid = document.querySelector(".bl-feature-grid");
    const metrics = document.querySelector(".bl-condition-metrics");
    const trusted = document.querySelector(".bl-sources");
    const style = (el: Element | null) => el ? getComputedStyle(el) : null;
    return {
      viewport: innerWidth,
      scrollWidth: root.scrollWidth,
      cardCols: style(cardGrid)?.gridTemplateColumns.split(" ").length ?? 0,
      metricCols: style(metrics)?.gridTemplateColumns.split(" ").length ?? 0,
      trustedCols: style(trusted)?.gridTemplateColumns.split(" ").length ?? 0,
    };
  });

  expect(geometry.viewport).toBe(360);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.cardCols).toBe(3);
  expect(geometry.metricCols).toBe(4);
  expect(geometry.trustedCols).toBe(4);

  await expect(page.locator(".bl-feature")).toHaveCount(3);
  await expect(page.locator(".bl-condition-metrics > div")).toHaveCount(4);
  await expect(page.locator(".bl-bottom-nav a")).toHaveCount(5);
});
