"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const mobile = readFileSync(join(root, "mobile-app/src/MobileDashboard.tsx"), "utf8");
const desktop = readFileSync(join(root, "mobile-app/src/DesktopDashboard.tsx"), "utf8");
const conditions = readFileSync(join(root, "mobile-app/src/useBaitLogicConditions.ts"), "utf8");
const signupApi = readFileSync(join(root, "api/signups.js"), "utf8");
const indexHtml = readFileSync(join(root, "mobile-app/index.html"), "utf8");
const edgeFunction = readFileSync(join(root, "mobile-app/supabase/functions/submit-baitlogic-signal/index.ts"), "utf8");
const dataSource = readFileSync(join(root, "mobile-app/src/data/baitlogicData.ts"), "utf8");
const fieldIntel = readFileSync(join(root, "mobile-app/public/field-intel.html"), "utf8");
const fieldIntelJs = readFileSync(join(root, "mobile-app/public/site.js"), "utf8");
const serviceWorker = readFileSync(join(root, "mobile-app/public/sw.js"), "utf8");
const barometerPage = readFileSync(join(root, "mobile-app/public/barometer.html"), "utf8");

test("canonical frontend and public writes use current guarded paths", () => {
  assert.match(indexHtml, /BaitLogic/);
  assert.match(signupApi, /if \(!validEmail\(email\)\)/);
  assert.match(signupApi, /captcha_token: captchaToken/);
  assert.match(dataSource, /captcha_token: captchaToken/);
  assert.match(edgeFunction, /if \(!secret\) return false/);
  assert.match(edgeFunction, /TURNSTILE_SECRET_KEY/);
  assert.match(edgeFunction, /rate_limited/);
  assert.doesNotMatch(edgeFunction, /trustedWebBridge|x-baitlogic-web-bridge/);
});

test("canonical mobile brand, reporting, and data-truth contracts are present", () => {
  assert.match(mobile, /Beyond the Bite\.<\/em> Powered by People and Purpose\./);
  assert.match(mobile, /baitlogic-boysenberry-logo\.svg/);
  assert.match(mobile, /https:\/\/dnr2\.illinois\.gov\/OLETIPHotline\//);
  assert.match(mobile, /https:\/\/mdc12\.mdc\.mo\.gov\/Applications\/FishKillsIntake\/Intake/);
  assert.match(mobile, /status === "cached"/);
  assert.match(mobile, /No verified reading/);
  assert.doesNotMatch(mobile, />68°F</);
  assert.doesNotMatch(mobile, />74°F</);
  assert.match(serviceWorker, /baitlogic-facebook-qr\.png/);
});

test("canonical responsive implementations expose the approved product surfaces", () => {
  for (const label of [
    /OUTDOOR CONDITIONS/,
    /SEE SOMETHING\? SAY SOMETHING\./,
    /WATER &amp; FLOW/,
    /LOCAL CATCHES/,
    /TRAILS &amp; MAPS/,
    /OUTDOOR EDUCATION/,
    /REPORT TO THE RIGHT AGENCY/,
    /Offline Ready/,
  ]) assert.match(mobile, label);

  assert.match(mobile, /href="\/catches\.html"/);
  assert.match(mobile, /href="\/trails\.html"/);
  assert.match(mobile, /href="\/field-intel\.html#conservation"/);
  assert.match(desktop, /CONSERVATION REPORTING · LOCAL/);
  assert.match(desktop, /href:"\/catches\.html"/);
});

test("field-intel destinations and mobile recovery actions are real", () => {
  for (const anchor of ["water", "field-check", "conservation"]) {
    assert.match(fieldIntel, new RegExp(`id=["']${anchor}["']`));
  }
  assert.match(mobile, /\/field-intel\.html#water/);
  assert.match(mobile, /\/field-intel\.html#field-check/);
  assert.match(mobile, /\/field-intel\.html#conservation/);
  assert.match(fieldIntel, /https:\/\/dnr2\.illinois\.gov\/OLETIPHotline\//);
  assert.match(fieldIntel, /https:\/\/mdc12\.mdc\.mo\.gov\/Applications\/FishKillsIntake\/Intake/);
  assert.match(fieldIntelJs, /Restored your private draft/);
  assert.doesNotMatch(fieldIntelJs, /sync automatically when connection returns/);
  assert.match(barometerPage, /id="beginLocation"/);
  assert.match(barometerPage, /id="useHighland"/);
});

test("cached conditions have bounded freshness contracts", () => {
  assert.match(conditions, /WEATHER_CACHE_MAX_AGE_MS = 90 \* 60 \* 1000/);
  assert.match(conditions, /WATER_CACHE_MAX_AGE_MS = 6 \* 60 \* 60 \* 1000/);
  assert.match(serviceWorker, /X-BaitLogic-Source/);
  assert.match(serviceWorker, /offline-cache/);
});
