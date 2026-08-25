import { defineConfig } from "@playwright/test";

const testPort = Number(process.env.BAITLOGIC_RELEASE_TEST_PORT ?? 4175);

export default defineConfig({
  testDir: "./release-tests",
  timeout: 25_000,
  use: {
    baseURL: `http://127.0.0.1:${testPort}`,
    viewport: { width: 430, height: 1000 },
  },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${testPort}`,
    url: `http://127.0.0.1:${testPort}/barometer.html`,
    reuseExistingServer: false,
  },
});
