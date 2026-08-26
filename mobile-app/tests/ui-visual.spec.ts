import { expect, test } from "@playwright/test";

const visualConditions = {
  updatedAt: "2026-08-26T11:35:00.000Z",
  location: { name: "Highland, Illinois", locality: "Highland", region: "Illinois" },
  weather: {
    temperatureF: 61,
    apparentTemperatureF: 62,
    code: 0,
    pressureInHg: 30.16,
    pressureDelta3h: 0.03,
    pressureDelta6h: 0.05,
    windMph: 5,
    windDirection: 315,
    gustMph: 9,
    cloudCover: 5,
    precipitationIn: 0,
  },
  alerts: [],
};

test("render established BaitLogic home candidate", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 1100 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: { latitude: 38.7395, longitude: -89.6712, accuracy: 12 },
        } as GeolocationPosition),
      },
    });
  });
  await page.route("**/api/barometer-snapshot**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(visualConditions),
  }));

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Refresh current location and conditions" })).toContainText("Highland, Illinois");
  await expect(page.getByLabel("Verified local weather conditions")).toContainText("30.16 inHg");
  await expect(page.getByRole("navigation", { name: "BaitLogic core pillars" })).toBeVisible();
  await expect(page.locator(".hero-place")).toHaveText("Highland");
  await expect(page.locator(".hero-pulse")).toHaveText("outdoor pulse");
  await page.locator(".native-scroll").evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: "test-results/ui-home.png", fullPage: false });
});
