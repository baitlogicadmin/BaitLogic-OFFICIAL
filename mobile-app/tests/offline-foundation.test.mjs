import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships an installable BaitLogic web app manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("../dist/client/manifest.webmanifest", import.meta.url), "utf8"));

  assert.equal(manifest.name, "BaitLogic — Local Outdoor Intelligence");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#210918");
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
});

test("ships the versioned app-shell service worker", async () => {
  const worker = await readFile(new URL("../dist/client/sw.js", import.meta.url), "utf8");

  assert.match(worker, /baitlogic-field-kit-v20/);
  assert.match(worker, /baitlogic-facebook-qr\.png/);
  assert.match(worker, /hero-sunset\.webp/);
  assert.match(worker, /pillar-fishing\.webp/);
  assert.match(worker, /precacheAppShell/);
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /cache\.match\("\/"\)/);
  assert.match(worker, /\/api\/barometer-snapshot/);
  assert.match(worker, /\/api\/water-snapshot/);
  assert.match(worker, /\/trails\.html/);
  assert.match(worker, /\/trails-app\.js\?v=1/);
  assert.match(worker, /\/catches\.html/);
  assert.match(worker, /\/profile\.html/);
  assert.match(worker, /\/api\/catches/);
  assert.match(worker, /\/api\/trails/);
  assert.match(worker, /X-BaitLogic-Source/);
  assert.match(worker, /offline-cache/);
});

test("barometer location loading has a bounded Android-friendly fallback", async () => {
  const app = await readFile(new URL("../../public/barometer/app.js", import.meta.url), "utf8");
  const page = await readFile(new URL("../../public/barometer.html", import.meta.url), "utf8");

  assert.match(app, /enableHighAccuracy:false/);
  assert.match(app, /maximumAge:300000/);
  assert.match(app, /setTimeout\(\(\)=>\{/);
  assert.match(app, /Location took too long/);
  assert.match(app, /Location permission is blocked/);
  assert.match(app, /baitlogic-barometer-last-v1/);
  assert.match(app, /Saved conditions are shown for context only/);
  assert.match(page, /barometer\/app\.js\?v=13/);
  assert.match(page, /barometer\/connection-ui\.js\?v=3/);
});

test("ships the correct public BaitLogic contact address", async () => {
  const fieldIntel = await readFile(new URL("../../public/index.html", import.meta.url), "utf8");
  const outdoor = await readFile(new URL("../../public/outdoor.html", import.meta.url), "utf8");
  const siteCss = await readFile(new URL("../../public/site.css", import.meta.url), "utf8");

  for (const page of [fieldIntel, outdoor]) {
    assert.match(page, /mailto:baitlogicadmin@gmail\.com/);
    assert.doesNotMatch(page, /baitlogic@outlook\.com/);
  }
  assert.match(siteCss, /scroll-padding-top:92px/);
  assert.match(siteCss, /\.section\[id\]\{scroll-margin-top:92px\}/);
});

test("keeps public backend writes behind the validated submission function", async () => {
  const sql = await readFile(new URL("../supabase/field-checks.sql", import.meta.url), "utf8");
  const functionSource = await readFile(new URL("../supabase/functions/submit-baitlogic-signal/index.ts", import.meta.url), "utf8");
  const mobileSource = await readFile(new URL("../src/MobileDashboard.tsx", import.meta.url), "utf8");
  const dataSource = await readFile(new URL("../src/data/baitlogicData.ts", import.meta.url), "utf8");

  assert.match(sql, /alter table public\.field_checks enable row level security/i);
  assert.match(sql, /grant select on table public\.field_checks to anon, authenticated/i);
  assert.doesNotMatch(sql, /grant select, insert on table public\.field_checks to anon, authenticated/i);
  assert.match(sql, /moderation_status = 'approved'/i);
  assert.match(sql, /location_precision = 'area_only'/i);
  assert.match(sql, /claim_baitlogic_submission_slot/i);
  assert.match(functionSource, /TURNSTILE_SECRET_KEY/);
  assert.match(functionSource, /rate_limited/);
  assert.match(functionSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(dataSource, /captcha_token: captchaToken/);
  assert.match(mobileSource, /status === "cached"/);
  assert.match(mobileSource, /CACHED/);
  assert.doesNotMatch(mobileSource, /Revision Status|Deployment Status|Fully Deployed|All systems online/i);
});

test("renders mobile and desktop as separate implementations and ships Community Catches", async () => {
  const prototype = await readFile(new URL("../src/Prototype.tsx", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../src/MobileDashboard.tsx", import.meta.url), "utf8");
  const desktop = await readFile(new URL("../src/DesktopDashboard.tsx", import.meta.url), "utf8");
  const catches = await readFile(new URL("../public/catches.html", import.meta.url), "utf8");

  assert.match(prototype, /MobileDashboard/);
  assert.match(prototype, /DesktopDashboard/);
  assert.match(prototype, /matchMedia/);

  assert.match(mobile, /OUTDOOR CONDITIONS/);
  assert.match(mobile, /SEE SOMETHING\? SAY SOMETHING\./);
  assert.match(mobile, /WATER &amp; FLOW/);
  assert.match(mobile, /LOCAL CATCHES/);
  assert.match(mobile, /TRAILS &amp; MAPS/);
  assert.match(mobile, /OUTDOOR EDUCATION/);
  assert.match(mobile, /REPORT TO THE RIGHT AGENCY/);
  assert.match(mobile, /Offline Ready/);
  assert.match(mobile, /baitlogic-boysenberry-logo\.svg/);
  assert.match(mobile, /href="\/catches\.html"/);
  assert.match(mobile, /https:\/\/dnr2\.illinois\.gov\/OLETIPHotline\//);
  assert.match(mobile, /https:\/\/mdc12\.mdc\.mo\.gov\/Applications\/FishKillsIntake\/Intake/);
  assert.doesNotMatch(mobile, />68°F</);
  assert.doesNotMatch(mobile, />74°F</);

  assert.match(desktop, /CONSERVATION REPORTING · LOCAL/);
  assert.match(desktop, /href:"\/catches\.html"/);
  assert.match(catches, /\/api\/catches/);
  assert.match(catches, /does not invent locations, weights, species, or notes/);
});

test("locks safety-critical navigation, reporting destinations, and the canonical trail-map contract", async () => {
  const outdoor = await readFile(new URL("../../public/outdoor.html", import.meta.url), "utf8");
  const trails = await readFile(new URL("../public/trails.html", import.meta.url), "utf8");
  const trailsApp = await readFile(new URL("../public/trails-app.js", import.meta.url), "utf8");
  const fieldIntel = await readFile(new URL("../../public/index.html", import.meta.url), "utf8");

  assert.match(outdoor, /href="\/field-intel\.html#field-check"/);
  assert.match(outdoor, /href="\/field-intel\.html#conservation"/);
  assert.doesNotMatch(outdoor, /href="\/#reports"/);
  assert.doesNotMatch(outdoor, /href="\/#conservation"/);

  assert.match(trails, /EXPLORE LOCAL TRAILS/);
  assert.match(trails, /Real maps\. Real trails\. One BaitLogic experience\./);
  assert.match(trails, /id="trail-map-svg"/);
  assert.match(trails, /\/trails-app\.js\?v=1/);
  assert.doesNotMatch(trails, /MEPRD Actual Trail Map|MCT Interactive Trail Map|Carlyle Hiking Trail Guide/);
  assert.match(trailsApp, /\/api\/trails\?bbox=/);
  assert.match(trailsApp, /application\/gpx\+xml/);
  assert.match(trailsApp, /baitlogic-trails-ui-v1/);
  assert.match(trailsApp, /highlandil\.gov\/departments\/parks_and_recreation\/parks_and_silver_lake\/silver_lake\/index\.php/);
  assert.match(trailsApp, /meprd\.org\/community-maps\.html/);

  assert.match(fieldIntel, /https:\/\/dnr2\.illinois\.gov\/OLETIPHotline\//);
  assert.match(fieldIntel, /https:\/\/mdc12\.mdc\.mo\.gov\/Applications\/FishKillsIntake\/Intake/);
  assert.match(fieldIntel, /https:\/\/epa\.illinois\.gov\/pollution-complaint\/submit-a-complaint\.html/);
});

test("fails closed when weather-alert verification or cached conditions are unsafe", async () => {
  const api = await readFile(new URL("../../api/barometer-snapshot.js", import.meta.url), "utf8");
  const barometer = await readFile(new URL("../../public/barometer/app.js", import.meta.url), "utf8");
  const outdoor = await readFile(new URL("../../public/outdoor.html", import.meta.url), "utf8");
  const conditions = await readFile(new URL("../src/useBaitLogicConditions.ts", import.meta.url), "utf8");
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

  assert.match(api, /alertsAvailable/);
  assert.match(api, /NWS unavailable/);

  assert.match(barometer, /CHECK OFFICIAL WEATHER/);
  assert.match(barometer, /!cached&&d\.alertsAvailable!==false/);
  assert.match(barometer, /Saved conditions are shown for context only/);

  assert.match(outdoor, /CHECK OFFICIAL WEATHER/);
  assert.match(outdoor, /X-BaitLogic-Source/);
  assert.match(outdoor, /!stale&&d\.alertsAvailable!==false/);

  assert.match(conditions, /WEATHER_CACHE_MAX_AGE_MS = 90 \* 60 \* 1000/);
  assert.match(conditions, /WATER_CACHE_MAX_AGE_MS = 6 \* 60 \* 60 \* 1000/);

  assert.match(worker, /baitlogic-field-kit-v20/);
  assert.match(worker, /X-BaitLogic-Source/);
});