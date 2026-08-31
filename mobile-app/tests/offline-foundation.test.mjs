import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships an installable BaitLogic web app manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("../dist/client/manifest.webmanifest", import.meta.url), "utf8"));

  assert.equal(manifest.name, "BaitLogic — Local Outdoor Intelligence");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#061535");
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
});

test("ships the versioned app-shell service worker", async () => {
  const worker = await readFile(new URL("../dist/client/sw.js", import.meta.url), "utf8");

  assert.match(worker, /baitlogic-field-kit-v15/);
  assert.match(worker, /baitlogic-facebook-qr\.png/);
  assert.match(worker, /hero-sunset\.webp/);
  assert.match(worker, /pillar-fishing\.webp/);
  assert.match(worker, /precacheAppShell/);
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /cache\.match\("\/"\)/);
  assert.match(worker, /\/api\/barometer-snapshot/);
  assert.match(worker, /\/api\/water-snapshot/);
  assert.match(worker, /\/trails\.html/);
  assert.match(worker, /\/catches\.html/);
  assert.match(worker, /\/api\/catches/);
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
  assert.match(app, /Saved verified conditions are shown/);
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
  const interfaceSource = await readFile(new URL("../src/ApprovedDashboard.tsx", import.meta.url), "utf8");
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
  assert.match(interfaceSource, /OFFLINE \/ CACHED/);
  assert.doesNotMatch(interfaceSource, /Revision Status|Deployment Status|Offline Status|Fully Deployed|All systems online/i);
});

test("ships the weekly email sender with one-click unsubscribe", async () => {
  const sender = await readFile(new URL("../supabase/functions/send-baitlogic-weekly/index.ts", import.meta.url), "utf8");
  const unsubscribe = await readFile(new URL("../supabase/functions/unsubscribe-baitlogic-weekly/index.ts", import.meta.url), "utf8");

  assert.match(sender, /RESEND_API_KEY/);
  assert.match(sender, /List-Unsubscribe-Post/);
  assert.match(sender, /Exact locations are never included/);
  assert.match(unsubscribe, /status: "unsubscribed"/);
  assert.match(unsubscribe, /safeEqual/);
});


test("renders mobile and desktop as separate implementations and ships Community Catches", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const mobile = await readFile(new URL("../src/MobileDashboard.tsx", import.meta.url), "utf8");
  const desktop = await readFile(new URL("../src/DesktopDashboard.tsx", import.meta.url), "utf8");
  const catches = await readFile(new URL("../public/catches.html", import.meta.url), "utf8");

  assert.match(app, /MobileDashboard/);
  assert.match(app, /DesktopDashboard/);
  assert.match(app, /matchMedia/);
  assert.match(mobile, /CONSERVATION REPORTING · LOCAL/);
  assert.match(mobile, /href:"\/catches\.html"/);
  assert.doesNotMatch(mobile, />68°F</);
  assert.doesNotMatch(mobile, />74°F</);
  assert.match(desktop, /CONSERVATION REPORTING · LOCAL/);
  assert.match(desktop, /href:"\/catches\.html"/);
  assert.match(catches, /\/api\/catches/);
  assert.match(catches, /does not invent locations, weights, species, or notes/);
});
