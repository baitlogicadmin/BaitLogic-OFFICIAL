#!/usr/bin/env node
// Reusable Chromium mobile readiness gate. Requires: npm i -D playwright
// and npx playwright install chromium. No project-specific imports.
import { chromium } from "playwright";
import fs from "node:fs";
const env = process.env;
const url = env.TEST_URL || process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Usage: TEST_SELECTOR='.primary-action' TEST_BUDGET_MS=3000 node mobile-readiness.mjs https://localhost:4173");
  process.exit(2);
}
const selector = env.TEST_SELECTOR || "main";
const budget = Number(env.TEST_BUDGET_MS || 3000);
const width = Number(env.TEST_WIDTH || 360);
const height = Number(env.TEST_HEIGHT || 780);
const latency = Number(env.TEST_LATENCY_MS || 120);
const downloadKbps = Number(env.TEST_DOWNLOAD_KBPS || 1600);
const uploadKbps = Number(env.TEST_UPLOAD_KBPS || 750);
const output = env.TEST_REPORT || "mobile-readiness.json";
const browser = await chromium.launch({ headless: true });
const report = { url, selector, budgetMs: budget, viewport: { width, height }, network: { latencyMs: latency, downloadKbps, uploadKbps }, checkedAt: new Date().toISOString() };
try {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency, downloadThroughput: downloadKbps * 1000 / 8, uploadThroughput: uploadKbps * 1000 / 8 });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  const started = performance.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 20000 });
  report.readyMs = Math.round(performance.now() - started);
  report.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  report.pageErrors = pageErrors;
  report.passed = report.readyMs <= budget && !report.overflow && pageErrors.length === 0;
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.passed = false;
  report.error = String(error);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
