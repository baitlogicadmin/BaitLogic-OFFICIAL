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
  await expect(page.locator(".bl-conditions")).toContainText("8 mph NW");
  await expect(page.locator(".bl-location")).toContainText("Highland");
});

test("mobile homepage preserves the founder-approved information architecture", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile founder gate");
  await page.goto("/");

  await expect(page.locator(".bl-logo")).toHaveAttribute("src", "/assets/baitlogic-boysenberry-logo.svg");
  await expect(page.locator(".bl-report-now")).toContainText("SEE SOMETHING? SAY SOMETHING.");
  await expect(page.locator(".bl-feature")).toHaveCount(3);
  await expect(page.locator(".bl-education-card")).toHaveCount(6);
  await expect(page.locator(".bl-agency")).toContainText("REPORT TO THE RIGHT AGENCY");
  await expect(page.locator(".bl-sources")).toContainText("USGS");
  await expect(page.locator(".bl-sources")).toContainText("NWS");
  await expect(page.locator(".bl-sources")).toContainText("Open-Meteo");
  await expect(page.locator(".bl-sources")).toContainText("Offline Ready");
});

test("every mobile home action points at a real route or approved official destination", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile action gate");
  await page.goto("/");

  const expected = [
    [".bl-primary-cta", "/barometer.html"],
    [".bl-report-now a", "/field-intel.html#conservation"],
    [".bl-feature.water-flow", "/field-intel.html#water"],
    [".bl-feature.catches", "/catches.html"],
    [".bl-feature.trails", "/trails.html"],
    [".bl-section-row a", "/outdoor.html"],
    [".bl-agency .illinois", "https://dnr2.illinois.gov/OLETIPHotline/"],
    [".bl-agency .missouri", "https://mdc12.mdc.mo.gov/Applications/FishKillsIntake/Intake"],
  ] as const;

  for (const [selector, href] of expected) {
    await expect(page.locator(selector)).toHaveAttribute("href", href);
  }

  const education = page.locator(".bl-education-card");
  await expect(education).toHaveCount(6);
  for (let i=0;i<6;i++) await expect(education.nth(i)).toHaveAttribute("href", "/outdoor.html");
});

test("primary destinations and barometer render successfully", async ({ page }, testInfo) => {
  const failures = watchRuntimeFailures(page);
  const routes = ["/barometer.html", "/catches.html", "/field-intel.html", "/trails.html", "/outdoor.html", "/profile.html"];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  }

  expect(failures, failures.join("\n")).toEqual([]);
  expect(testInfo.project.name).toMatch(/mobile-app|desktop-web/);
});

test("barometer loads verified pressure data instead of hanging", async ({ page }) => {
  await page.goto("/barometer.html");
  await page.getByRole("button", { name: /Use Highland, IL/i }).click();
  await expect(page.locator("#pressureValue")).toHaveText("29.91", { timeout: 10000 });
  await expect(page.locator("#dataState")).toContainText(/Live conditions|conditions loaded/i);
});

test("mobile candidate captures deterministic founder-review evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile screenshot only");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);

  await expect(page.locator(".bl-header")).toBeVisible();
  await expect(page.locator(".bl-conditions")).toBeVisible();
  await expect(page.locator(".bl-report-now")).toBeVisible();
  await expect(page.locator(".bl-feature")).toHaveCount(3);
  await expect(page.locator(".bl-education-card")).toHaveCount(6);
  await expect(page.locator(".bl-agency")).toBeVisible();
  await expect(page.locator(".bl-bottom-nav")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("baitlogic-mobile-candidate.png"),
    fullPage: true,
    animations: "disabled",
  });
});


test("approved phone composition does not overflow or collapse", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-app", "mobile geometry gate");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const body = document.documentElement;
    const featureGrid = document.querySelector(".bl-feature-grid");
    const education = document.querySelector(".bl-education-row");
    const agency = document.querySelector(".bl-agency");
    const report = document.querySelector(".bl-report-now");
    const conditions = document.querySelector(".bl-conditions");
    const style = (el: Element | null) => el ? getComputedStyle(el) : null;
    return {
      viewport: innerWidth,
      scrollWidth: body.scrollWidth,
      featureCols: style(featureGrid)?.gridTemplateColumns.split(" ").length ?? 0,
      educationCols: style(education)?.gridTemplateColumns.split(" ").length ?? 0,
      agencyCols: style(agency)?.gridTemplateColumns.split(" ").length ?? 0,
      reportHeight: report?.getBoundingClientRect().height ?? 0,
      conditionsHeight: conditions?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(geometry.viewport).toBe(360);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(360);
  expect(geometry.featureCols).toBe(3);
  expect(geometry.educationCols).toBe(6);
  expect(geometry.agencyCols).toBe(3);
  expect(geometry.reportHeight).toBeLessThan(70);
  expect(geometry.conditionsHeight).toBeLessThan(170);

  await expect(page.locator(".bl-report-now a")).toBeVisible();
  await expect(page.locator(".bl-feature")).toHaveCount(3);
  await expect(page.locator(".bl-education-card")).toHaveCount(6);
  await expect(page.locator(".bl-agency a")).toHaveCount(2);
});
