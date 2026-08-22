import { expect, test, type Page } from "@playwright/test";

async function drag(page: Page, locator: ReturnType<Page["locator"]>, dx: number, dy: number, steps = 8) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("drag target is not visible");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  });
});

test("page boots as a real mobile app without a device mock shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".phone-frame")).toHaveCount(0);
  await expect(page.locator(".viewport-shell")).toHaveCount(1);
  await expect(page.locator(".bottom-nav")).toBeVisible();
});

test("the mobile runtime keeps browser-native touch scrolling and removes fake gesture plumbing", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-mobile-runtime]")).toHaveCount(0);
  await expect(page.locator("[data-mobile-scroll]")).toHaveCount(0);
  await expect(page.locator(".viewport-shell")).toHaveCSS("overscroll-behavior-y", "auto");
  await expect(page.locator(".app-scroll")).toHaveCSS("overflow-y", "auto");
});

test("bottom navigation switches sections without rendering fake state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore" }).click();
  await expect(page.getByRole("heading", { name: /Explore/ })).toBeVisible();
  await expect(page.getByText("LOCAL INTELLIGENCE")).toBeVisible();

  await page.getByRole("button", { name: "Community" }).click();
  await expect(page.getByRole("heading", { name: "Useful beats impressive." })).toBeVisible();
  await expect(page.getByText("No real Field Checks have been posted", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("heading", { name: "Saved for the next outing." })).toBeVisible();
});

test("report button opens the native sheet and privacy language stays explicit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Report" }).click();
  const dialog = page.getByRole("dialog", { name: "See something? Say something." });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Privacy is the default")).toBeVisible();
  await expect(dialog.getByText(/never your exact spot/)).toBeVisible();
});

test("community connection language does not imply contributions when none exist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("BaitLogic connected")).toBeVisible();
  await expect(page.getByText(/community notes?/)).toHaveCount(0);
});

test("location denial is transparent and does not fabricate conditions", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError) },
    });
  });
  await page.goto("/");

  await expect(page.getByText("Location permission is off.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Verified local weather conditions")).not.toContainText("82°");
  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
});

test("official reporting is prominent, educational, and routes to both states", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError) },
    });
  });
  await page.goto("/");

  await expect(page.getByText("SEE SOMETHING? SAY SOMETHING.", { exact: true })).toBeVisible();
  await expect(page.getByText("Document safely", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Open the official reporting guide" }).click();

  const dialog = page.getByRole("dialog", { name: "See something? Say something." });
  await expect(dialog.getByText("A BaitLogic Field Check does not notify officials.", { exact: false })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Call Illinois DNR/ })).toHaveAttribute("href", "tel:+18772367529");
  await expect(dialog.getByRole("link", { name: /Submit a pollution complaint/ })).toHaveAttribute("href", "https://epa.illinois.gov/pollution-complaint/submit-a-complaint.html");
  await expect(dialog.getByRole("link", { name: /Wildlife violation/ })).toHaveAttribute("href", "https://dnr.illinois.gov/lawenforcement/target-poachers.html");

  await dialog.getByRole("button", { name: "Missouri" }).click();
  await expect(dialog.getByRole("link", { name: /Call Missouri Conservation/ })).toHaveAttribute("href", "tel:+18003921111");
  await expect(dialog.getByRole("link", { name: /Report an environmental concern/ })).toHaveAttribute("href", "https://dnr.mo.gov/reporting/environmental-concern");
  await expect(dialog.getByRole("link", { name: /24-hour spill line/ })).toHaveAttribute("href", "tel:+15736342436");
});

test("horizontal intent stays in Carousel and cannot create parent momentum", async ({ page }) => {
  const carousel = page.locator(".fixture-carousel");
  const card = page.locator(".carousel-card").nth(1);
  const parent = page.getByTestId("mobile-scroll");

  await expect(carousel).not.toHaveAttribute("data-scroll-drag", "ignore");
  await drag(page, card, -130, 14, 5);

  const afterRelease = await carousel.evaluate((element) => element.scrollLeft);
  const parentAfterRelease = await parent.evaluate((element) => element.scrollTop);
  await page.waitForTimeout(320);
  const afterSettled = await carousel.evaluate((element) => element.scrollLeft);
  const parentAfterSettled = await parent.evaluate((element) => element.scrollTop);

  expect(afterRelease).toBeGreaterThan(10);
  expect(Math.abs(afterSettled - afterRelease)).toBeLessThan(10);
  expect(Math.abs(parentAfterRelease)).toBeLessThan(6);
  expect(Math.abs(parentAfterSettled - parentAfterRelease)).toBeLessThan(6);
});

test("vertical intent inside Carousel does not hijack parent scrolling", async ({ page }) => {
  const carousel = page.locator(".fixture-carousel");
  const card = page.locator(".carousel-card").first();
  const parent = page.getByTestId("mobile-scroll");

  await parent.evaluate((element) => { element.scrollTop = 0; });
  await drag(page, card, -8, -140, 5);
  await page.waitForTimeout(180);
  expect(await parent.evaluate((element) => element.scrollTop)).toBeGreaterThan(25);
  expect(Math.abs(await carousel.evaluate((element) => element.scrollLeft))).toBeLessThan(12);
});

test("nested carousel inside FlowStack switches axis ownership cleanly", async ({ page }) => {
  const nestedCarousel = page.locator(".nested-fixture-carousel");
  const nestedCard = page.locator(".nested-carousel-card").nth(1);
  const parent = page.getByTestId("nested-parent");

  await parent.evaluate((element) => { element.scrollTop = 0; });
  await drag(page, nestedCard, -100, 8, 5);
  expect(await nestedCarousel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(10);
  expect(Math.abs(await parent.evaluate((element) => element.scrollTop))).toBeLessThan(8);

  const baseline = await nestedCarousel.evaluate((element) => element.scrollLeft);
  await drag(page, nestedCard, -6, -110, 5);
  await page.waitForTimeout(150);
  expect(await parent.evaluate((element) => element.scrollTop)).toBeGreaterThan(20);
  expect(Math.abs((await nestedCarousel.evaluate((element) => element.scrollLeft)) - baseline)).toBeLessThan(15);
});

test("BottomSheet prevents edge swipe from creating parent momentum", async ({ page }) => {
  const sheet = page.locator(".fixture-sheet");
  const sheetBody = sheet.locator(".bottom-sheet-body");
  const parent = page.getByTestId("mobile-scroll");

  await sheetBody.evaluate((element) => { element.scrollTop = 0; });
  await parent.evaluate((element) => { element.scrollTop = 0; });
  await drag(page, sheetBody, 5, 100, 5);
  await page.waitForTimeout(250);

  expect(Math.abs(await parent.evaluate((element) => element.scrollTop))).toBeLessThan(6);
});

test("FlowStack releases drag state after pointercancel", async ({ page }) => {
  const flowStack = page.locator(".fixture-flow-stack");
  await flowStack.dispatchEvent("pointerdown", { pointerId: 11, clientX: 100, clientY: 100, pointerType: "touch", isPrimary: true });
  await flowStack.dispatchEvent("pointermove", { pointerId: 11, clientX: 102, clientY: 50, pointerType: "touch", isPrimary: true });
  await flowStack.dispatchEvent("pointercancel", { pointerId: 11, clientX: 102, clientY: 50, pointerType: "touch", isPrimary: true });
  await expect(flowStack).not.toHaveAttribute("data-scroll-drag", "active");
});

test("FlowStack releases drag state after pointerup", async ({ page }) => {
  const flowStack = page.locator(".fixture-flow-stack");
  await flowStack.dispatchEvent("pointerdown", { pointerId: 12, clientX: 100, clientY: 100, pointerType: "touch", isPrimary: true });
  await flowStack.dispatchEvent("pointermove", { pointerId: 12, clientX: 102, clientY: 50, pointerType: "touch", isPrimary: true });
  await flowStack.dispatchEvent("pointerup", { pointerId: 12, clientX: 102, clientY: 50, pointerType: "touch", isPrimary: true });
  await expect(flowStack).not.toHaveAttribute("data-scroll-drag", "active");
});

test("MobileScroll does not transform, mutate, or retain parent momentum", async ({ page }) => {
  const parent = page.getByTestId("mobile-scroll");
  await expect(parent).toHaveCSS("transform", "none");
  await expect(parent).not.toHaveAttribute("data-scroll-drag", "active");
  await parent.evaluate((element) => { element.scrollTop = 0; });
  await drag(page, parent, 0, -120, 5);
  await page.waitForTimeout(150);
  expect(await parent.evaluate((element) => element.scrollTop)).toBeGreaterThan(20);
});
