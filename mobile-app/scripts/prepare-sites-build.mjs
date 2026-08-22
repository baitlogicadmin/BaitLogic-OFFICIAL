#!/usr/bin/env node
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const index = path.join(client, "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");
const legacyPublic = path.join(repoRoot, "public");

for (const file of [index, worker, hosting, legacyPublic]) {
  if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
}

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
copyFileSync(worker, path.join(dist, "server", "index.js"));
copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));

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

console.log("Prepared production build with React shell + recovered BaitLogic feature routes.");
