"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const dashboard = readFileSync(join(root, "mobile-app/src/ApprovedDashboard.tsx"), "utf8");
const dashboardCss = readFileSync(join(root, "mobile-app/src/approved-dashboard.css"), "utf8");
const signupApi = readFileSync(join(root, "api/signups.js"), "utf8");
const indexHtml = readFileSync(join(root, "mobile-app/index.html"), "utf8");
const edgeFunction = readFileSync(join(root, "mobile-app/supabase/functions/submit-baitlogic-signal/index.ts"), "utf8");
const fieldIntel = readFileSync(join(root, "public/index.html"), "utf8");
const fieldIntelJs = readFileSync(join(root, "public/site.js"), "utf8");
const serviceWorker = readFileSync(join(root, "mobile-app/public/sw.js"), "utf8");
const barometerPage = readFileSync(join(root, "public/barometer.html"), "utf8");

test("approved dashboard signup is wired to the live signup endpoint", () => {
  assert.match(dashboard, /fetch\("\/api\/signups"/);
  assert.doesNotMatch(dashboard, /onSubmit=\{e=>e\.preventDefault\(\)\}/);
  assert.match(signupApi, /if \(!validEmail\(email\)\)/);
  assert.match(signupApi, /captcha_token: captchaToken/);
  assert.match(dashboard, /VITE_TURNSTILE_SITE_KEY/);
  assert.match(edgeFunction, /if \(!secret\) return false/);
  assert.doesNotMatch(edgeFunction, /trustedWebBridge|x-baitlogic-web-bridge/);
});

test("approved brand and public contact links are current", () => {
  assert.match(dashboard, /Beyond the Bite\. Protect What Matters\./);
  assert.match(indexHtml, /BaitLogic/);
  assert.match(dashboard, /facebook\.com\/share\/1C3i4dL3vk\//);
  assert.match(dashboard, /mailto:baitlogicadmin@gmail\.com/);
});

test("approved conservation, education, QR, and data-truth contracts are present", () => {
  assert.match(dashboard, /https:\/\/dnr2\.illinois\.gov\/OLETIPHotline\//);
  assert.match(dashboard, /https:\/\/mdc12\.mdc\.mo\.gov\/Applications\/FishKillsIntake\/Intake/);
  assert.match(fieldIntel, /https:\/\/dnr2\.illinois\.gov\/OLETIPHotline\//);
  assert.match(fieldIntel, /https:\/\/mdc12\.mdc\.mo\.gov\/Applications\/FishKillsIntake\/Intake/);
  assert.match(dashboard, /baitlogic-facebook-qr\.png/);
  assert.match(serviceWorker, /baitlogic-facebook-qr\.png/);
  assert.doesNotMatch(dashboard, /temperatureF-2/);
  assert.equal((dashboard.match(/\["[^\n]+","\d+ min read"\]/g) || []).length, 10);
  assert.doesNotMatch(dashboardCss, /lesson-grid article:not\(:first-child\)\{display:none\}/);
  assert.doesNotMatch(dashboardCss, /community-panel,.impact-card\{display:none\}/);
  assert.match(dashboardCss, /\.connect-row\{display:grid;grid-template-columns:1fr\}/);
  assert.match(dashboardCss, /\.approved-dashboard \.trust-row\{display:none\}/);
  assert.match(dashboardCss, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(fieldIntelJs, /Restored your private draft/);
  assert.doesNotMatch(fieldIntelJs, /sync automatically when connection returns/);
});

test("dashboard destinations and mobile recovery actions are real", () => {
  for (const anchor of ["water", "field-check", "conservation"]) {
    assert.match(fieldIntel, new RegExp(`id=["']${anchor}["']`));
    assert.match(dashboard, new RegExp(`/field-intel\\.html#${anchor}`));
  }
  for (const anchor of ["learn", "field-checks", "more"]) {
    assert.match(dashboard, new RegExp(`id=["']${anchor}["']`));
  }
  assert.match(barometerPage, /id="beginLocation"/);
  assert.match(barometerPage, /id="useHighland"/);
  assert.match(dashboardCss, /font-size:clamp\(25px,7\.2vw,28px\)/);
});
