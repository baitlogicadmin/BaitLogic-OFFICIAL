import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];

function addCheck(name, passed, notes, fix = "") {
  checks.push({ name, status: passed ? "PASS" : "FAIL", notes, fix });
}

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function run(name, command, args, failureLocation, fix) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    stdio: "pipe",
  });
  const passed = result.status === 0;
  const detail = passed
    ? "Command completed cleanly."
    : `${failureLocation}\n${(result.stderr || result.stdout || "Unknown command failure").trim().slice(-1600)}`;
  addCheck(name, passed, detail, passed ? "" : fix);
}

function probe(name, url, expectedStatuses, init = {}) {
  const args = ["--silent", "--show-error", "--output", "/dev/null", "--write-out", "%{http_code}", "--max-time", "12"];
  if (init.method) args.push("--request", init.method);
  for (const [header, value] of Object.entries(init.headers ?? {})) args.push("--header", `${header}: ${value}`);
  if (init.body) args.push("--data", init.body);
  args.push(url);

  const result = spawnSync("curl", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  const status = Number(result.stdout.trim());
  if (result.status !== 0 || !Number.isInteger(status)) {
    addCheck(name, false, (result.stderr || "Live HTTP probe failed.").trim(), "Confirm network access and the configured Supabase project URL.");
    return;
  }

  const passed = expectedStatuses.includes(status);
  addCheck(name, passed, `HTTP ${status}; expected ${expectedStatuses.join(" or ")}.`, passed ? "" : "Confirm the deployed Supabase function, CORS policy, and required secrets.");
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

process.env.VITE_SUPABASE_URL ||= process.env.SUPABASE_URL || "https://gibaaxzltpdizayvicgf.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_oUyldV6BybbdjH3GhVRzqw_uVLKl_xN";

run(
  "Front-end production build",
  "npm",
  ["run", "build"],
  "package.json: scripts.build",
  "Fix the first TypeScript, import, Vite, or production packaging error and rerun npm run check:readiness.",
);
run(
  "PWA and backend foundation tests",
  process.execPath,
  ["--test", "tests/offline-foundation.test.mjs"],
  "tests/offline-foundation.test.mjs",
  "Repair the failing PWA, database-security, or email-delivery contract.",
);

const requiredFiles = [
  "dist/client/index.html",
  "dist/client/sw.js",
  "dist/client/manifest.webmanifest",
  "dist/client/barometer.html",
  "dist/client/field-intel.html",
  "dist/client/trails.html",
  "dist/client/catches.html",
  "dist/client/conservation-prairie.html",
  "supabase/functions/submit-baitlogic-signal/index.ts",
  "supabase/functions/send-baitlogic-weekly/index.ts",
  "supabase/functions/unsubscribe-baitlogic-weekly/index.ts",
];
const missingFiles = requiredFiles.filter((file) => !existsSync(path.join(root, file)));
addCheck(
  "Vercel production and backend file map",
  missingFiles.length === 0,
  missingFiles.length ? `Missing: ${missingFiles.join(", ")}` : "All required production, recovered feature, PWA, and Supabase files are present.",
  missingFiles.length ? "Restore the listed file(s) from the authoritative source before deployment." : "",
);

const requiredEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_TURNSTILE_SITE_KEY"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());
addCheck(
  "Front-end environment mapping",
  missingEnv.length === 0,
  missingEnv.length ? `.env.local (missing key; compare .env.example)\nMissing keys: ${missingEnv.join(", ")}` : "Required public runtime keys are mapped; values were not printed.",
  missingEnv.length ? "Add the missing key(s) to Vercel preview/production and rerun the gate." : "",
);

const productionTarget = (process.env.BAITLOGIC_PRODUCTION_TARGET ?? "vercel").trim().toLowerCase();
addCheck(
  "Authoritative production target",
  productionTarget === "vercel",
  productionTarget === "vercel" ? "GitHub main → Vercel is the only approved production target." : `Invalid production target: ${productionTarget}.`,
  productionTarget === "vercel" ? "" : "Set BAITLOGIC_PRODUCTION_TARGET=vercel; do not deploy BaitLogic production through a second host.",
);

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (supabaseUrl && publishableKey) {
  const authHeaders = { apikey: publishableKey, authorization: `Bearer ${publishableKey}` };
  probe("Database/Data API read", `${supabaseUrl}/rest/v1/field_checks?select=client_id&limit=1`, [200], { headers: authHeaders });
  probe(
    "Submission API bot-protection guard",
    `${supabaseUrl}/functions/v1/submit-baitlogic-signal`,
    [403],
    { method: "POST", headers: { ...authHeaders, "content-type": "application/json" }, body: JSON.stringify({ kind: "readiness_missing_captcha" }) },
  );
  probe("Weekly sender authorization guard", `${supabaseUrl}/functions/v1/send-baitlogic-weekly`, [401, 403]);
  probe("Unsubscribe endpoint validation", `${supabaseUrl}/functions/v1/unsubscribe-baitlogic-weekly`, [400]);
} else {
  for (const name of ["Database/Data API read", "Submission API bot-protection guard", "Weekly sender authorization guard", "Unsubscribe endpoint validation"]) {
    addCheck(name, false, "Live probe skipped because Supabase public environment keys are missing.", "Map the public Supabase URL and publishable key.");
  }
}

const passed = checks.filter((check) => check.status === "PASS").length;
const failed = checks.length - passed;

console.log("\nBaitLogic Deployment Readiness\n");
for (const check of checks) {
  console.log(`${check.status.padEnd(4)}  ${check.name}`);
  console.log(`      ${check.notes.replace(/\n/g, "\n      ")}`);
  if (check.fix) console.log(`      Fix: ${check.fix}`);
}
console.log(`\nResult: ${failed === 0 ? "PASS" : "FAIL"} — ${passed}/${checks.length} checks passed.`);
console.log("Production source: GitHub main → Vercel.");

if (failed > 0) process.exitCode = 1;
