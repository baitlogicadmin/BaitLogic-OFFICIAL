import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError) },
    });
  });
  await page.goto("/");
});

test("Water Watch separates official status, interpretation, and unresolved legislation", async ({ page }) => {
  await page.getByRole("button", { name: /Water Watch/ }).click();
  const dialog = page.getByRole("dialog", { name: "Illinois Water Watch" });

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Verified against Illinois General Assembly records")).toBeVisible();
  await expect(dialog.getByText("HB4418 · PA 104-0772")).toBeVisible();
  await expect(dialog.getByText("SB3917 · PA 104-0747")).toBeVisible();
  await expect(dialog.getByText("HB5309 · PA 104-0794")).toBeVisible();

  const unresolved = dialog.getByText("HB2955", { exact: true }).locator("..")
    .locator("..");
  await expect(unresolved).toContainText("NEEDS RECHECK");
  await expect(unresolved).toContainText("Do not describe HB2955 as enacted");
});

test("Water Watch keeps government reporting separate from BaitLogic Field Checks", async ({ page }) => {
  await page.getByRole("button", { name: /Water Watch/ }).click();
  const dialog = page.getByRole("dialog", { name: "Illinois Water Watch" });

  await expect(dialog.getByText("BaitLogic does not replace an official report.")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Pollution concern/ })).toHaveAttribute("href", "https://epa.illinois.gov/pollution-complaint/submit-a-complaint.html");
  await expect(dialog.getByRole("link", { name: /Wildlife violation/ })).toHaveAttribute("href", "https://dnr.illinois.gov/lawenforcement/target-poachers.html");
  await expect(dialog.getByRole("link", { name: /Community Field Check/ })).toHaveAttribute("href", "/field-intel.html#field-check");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
