import { expect, test, type Page } from "@playwright/test";

const conditions = {
  updatedAt: "2026-08-26T12:00:00.000Z",
  location: { name: "Highland, Illinois", locality: "Highland", region: "Illinois" },
  weather: {
    temperatureF: 72,
    apparentTemperatureF: 72,
    code: 1,
    pressureInHg: 30.02,
    pressureDelta3h: 0.01,
    pressureDelta6h: 0.02,
    windMph: 6,
    windDirection: 315,
    gustMph: 9,
    cloudCover: 18,
    precipitationIn: 0,
  },
  alerts: [],
};

async function prepareHome(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: { latitude: 38.7395, longitude: -89.6712, accuracy: 10 },
        } as GeolocationPosition),
      },
    });
  });
  await page.route("**/api/barometer-snapshot**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(conditions),
  }));
  await page.goto("/");
}

test("core pillars keep primary experiences inside the unified app", async ({ page }) => {
  await prepareHome(page);

  const quickTools = page.getByRole("navigation", { name: "BaitLogic core pillars" });
  await expect(quickTools.getByRole("link", { name: "Fishing Intel", exact: true })).toHaveAttribute("href", "/barometer.html");
  await expect(quickTools.getByRole("button", { name: "Community", exact: true })).toBeVisible();
  await expect(quickTools.getByRole("button", { name: "Water + Environment", exact: true })).toBeVisible();
  await expect(quickTools.getByRole("button", { name: "Conservation", exact: true })).toBeVisible();

  await quickTools.getByRole("button", { name: "Community", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "See something? Say something." })).toBeVisible();
  await page.getByRole("button", { name: "Close See something? Say something." }).click();

  await quickTools.getByRole("button", { name: "Water + Environment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Explore Illinois + Missouri" })).toBeVisible();
  await expect(page.locator("#regional-explore-host")).toBeVisible();

  await quickTools.getByRole("button", { name: "Conservation", exact: true }).click();
  const protectDialog = page.getByRole("dialog", { name: "See something? Say something." });
  await expect(protectDialog).toBeVisible();
  await expect(protectDialog.getByText("OFFICIAL REPORTING", { exact: true })).toBeVisible();
});

test("primary candidate does not send core pillars to recovered legacy pages", async ({ page }) => {
  await prepareHome(page);

  const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") || ""));
  expect(hrefs).not.toContain("/field-intel.html#field-check");
  expect(hrefs).not.toContain("/field-intel.html#water");
  expect(hrefs).not.toContain("/nature-check.html");
  expect(hrefs).toContain("/conservation-prairie.html");
  expect(hrefs).toContain("/barometer.html");
});

test("official reporting destinations remain exact and state-specific", async ({ page }) => {
  await prepareHome(page);
  await page.getByRole("navigation", { name: "BaitLogic core pillars" }).getByRole("button", { name: "Conservation", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "See something? Say something." });
  await expect(dialog.getByRole("link", { name: /Wildlife violation/ })).toHaveAttribute("href", "https://dnr.illinois.gov/lawenforcement/target-poachers.html");
  await expect(dialog.getByRole("link", { name: /Environmental concern/ })).toHaveAttribute("href", "https://epa.illinois.gov/pollution-complaint/submit-a-complaint.html");
  await expect(dialog.getByRole("link", { name: /Call Illinois DNR/ })).toHaveAttribute("href", "tel:+18772367529");

  await dialog.getByRole("button", { name: "Missouri" }).click();
  await expect(dialog.getByRole("link", { name: /Wildlife violation/ })).toHaveAttribute("href", "https://mdc.mo.gov/contact-engage/report-illegal-activity");
  await expect(dialog.getByRole("link", { name: /Environmental concern/ })).toHaveAttribute("href", "https://dnr.mo.gov/reporting/environmental-concern");
  await expect(dialog.getByRole("link", { name: /Call Missouri Conservation/ })).toHaveAttribute("href", "tel:+18003921111");
});
