const base = (process.env.BAITLOGIC_PRODUCTION_URL || "https://www.bait-logic.com").replace(/\/$/, "");
const expectedSha = (process.env.EXPECTED_SHA || "").trim();
const pollSeconds = Number(process.env.PRODUCTION_VERIFY_TIMEOUT_SECONDS || 360);
const pollIntervalMs = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(path, options = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, {
      redirect: "follow",
      cache: "no-store",
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": "BaitLogic-Production-Verification/1.0", ...(options.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForExpectedRelease() {
  const deadline = Date.now() + pollSeconds * 1000;
  let last = "release endpoint not reached";

  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout("/api/release");
      const type = response.headers.get("content-type") || "";
      if (!response.ok || !type.includes("application/json")) {
        last = `HTTP ${response.status} ${type || "unknown content type"}`;
      } else {
        const release = await response.json();
        const sha = release?.git?.sha || "";
        const ref = release?.git?.ref || "";
        const target = release?.productionTarget || "";
        const environment = release?.deployment?.environment || "";

        if (!expectedSha || sha === expectedSha) {
          if (ref !== "main") throw new Error(`Production ref is ${ref || "unknown"}, expected main.`);
          if (target !== "vercel") throw new Error(`Production target is ${target || "unknown"}, expected vercel.`);
          if (environment && environment !== "production") throw new Error(`Vercel environment is ${environment}, expected production.`);
          console.log(`PASS release provenance: ${sha || "unavailable SHA"} on ${ref || "unknown ref"}`);
          return release;
        }
        last = `production SHA ${sha || "missing"}; waiting for ${expectedSha}`;
      }
    } catch (error) {
      last = error.message;
    }

    console.log(`WAIT ${last}`);
    await sleep(pollIntervalMs);
  }

  throw new Error(`Production never reached expected release within ${pollSeconds}s: ${last}`);
}

const checks = [
  { path: "/", statuses: [200], type: "text/html", contains: "BaitLogic Outdoors" },
  { path: "/barometer.html", statuses: [200], type: "text/html", contains: "BaitLogic" },
  { path: "/field-intel.html", statuses: [200], type: "text/html", contains: "BaitLogic" },
  { path: "/outdoor.html", statuses: [200], type: "text/html", contains: "BaitLogic" },
  { path: "/conservation-prairie.html", statuses: [200], type: "text/html", contains: "BaitLogic" },
  { path: "/nature-check.html", statuses: [200], type: "text/html", contains: "BaitLogic" },
  { path: "/manifest.webmanifest", statuses: [200], type: "application/manifest+json", contains: "BaitLogic Outdoors" },
  { path: "/sw.js", statuses: [200], type: "javascript", contains: "baitlogic-field-kit-" },
  { path: "/api/health", statuses: [200], type: "application/json", json: true },
  { path: "/api/reports", statuses: [200], type: "application/json", json: true },
  { path: "/api/release", statuses: [200], type: "application/json", json: true },
  { path: "/api/water-snapshot?lat=38.7395&lon=-89.6712", statuses: [200, 502], type: "application/json", json: true },
  { path: "/api/barometer-snapshot?lat=38.7395&lon=-89.6712", statuses: [200, 502], type: "application/json", json: true },
];

async function runCheck(check) {
  const response = await fetchWithTimeout(check.path);
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (!check.statuses.includes(response.status)) {
    throw new Error(`${check.path}: HTTP ${response.status}, expected ${check.statuses.join("/")}`);
  }
  if (!type.includes(check.type)) {
    throw new Error(`${check.path}: content-type ${type || "missing"}, expected ${check.type}`);
  }

  const body = await response.text();
  if (check.contains && !body.includes(check.contains)) {
    throw new Error(`${check.path}: expected marker ${JSON.stringify(check.contains)} not found`);
  }
  if (check.json) {
    try { JSON.parse(body); }
    catch { throw new Error(`${check.path}: response is not valid JSON`); }
  }
  console.log(`PASS ${check.path} -> ${response.status} ${type}`);
}

await waitForExpectedRelease();
for (const check of checks) await runCheck(check);
console.log(`\nProduction verification PASS — ${checks.length} live checks completed against ${base}.`);
