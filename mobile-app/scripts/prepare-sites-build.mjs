#!/usr/bin/env node
import { copyFileSync, cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const client = path.join(root, "dist", "client");
const index = path.join(client, "index.html");
const legacyPublic = path.join(repoRoot, "public");

for (const file of [index, legacyPublic]) {
  if (!existsSync(file)) throw new Error("Missing production build input: " + file);
}

const featureFiles = [
  ["barometer.html", "barometer.html"],
  ["conservation-prairie.html", "conservation-prairie.html"],
  ["nature-check.html", "nature-check.html"],
  ["outdoor.html", "outdoor.html"],
  ["site.css", "site.css"],
  ["site.js", "site.js"],
  ["premium.css", "premium.css"],
  ["launch.css", "launch.css"],
  ["field-check.css", "field-check.css"],
];

for (const [sourceName, outputName] of featureFiles) {
  const source = path.join(legacyPublic, sourceName);
  if (!existsSync(source)) throw new Error("Missing recovered feature asset: " + source);
  copyFileSync(source, path.join(client, outputName));
}

const fieldIntelSource = path.join(legacyPublic, "index.html");
if (!existsSync(fieldIntelSource)) throw new Error("Missing recovered Field Intelligence page: " + fieldIntelSource);
copyFileSync(fieldIntelSource, path.join(client, "field-intel.html"));

const barometerAssets = path.join(legacyPublic, "barometer");
if (!existsSync(barometerAssets)) throw new Error("Missing recovered Barometer assets: " + barometerAssets);
cpSync(barometerAssets, path.join(client, "barometer"), { recursive: true, force: true });

console.log("Prepared Vercel production build with React shell + recovered BaitLogic feature routes.");
