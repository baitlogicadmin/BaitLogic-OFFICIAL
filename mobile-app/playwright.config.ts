import { defineConfig, devices } from "@playwright/test";

const testPort = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);
const baseURL = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  snapshotPathTemplate: "{testDir}/golden/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "runtime-components",
      testMatch: "**/mobile-runtime.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1100, height: 1100 },
      },
    },
    {
      name: "mobile-app",
      testMatch: "**/e2e/release-gate.spec.ts",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 780 },
        geolocation: { latitude: 38.7392, longitude: -89.6712 },
        permissions: ["geolocation"],
      },
    },
    {
      name: "desktop-web",
      testMatch: "**/e2e/release-gate.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
        geolocation: { latitude: 38.7392, longitude: -89.6712 },
        permissions: ["geolocation"],
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${testPort}`,
    url: baseURL,
    reuseExistingServer: process.env.MOBILE_RUNTIME_TEST_PORT == null,
    timeout: 120_000,
  },
});
