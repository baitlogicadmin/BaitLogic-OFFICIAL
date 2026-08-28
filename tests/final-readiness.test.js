"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const dashboard = readFileSync(join(root, "mobile-app/src/ApprovedDashboard.tsx"), "utf8");
const signupApi = readFileSync(join(root, "api/signups.js"), "utf8");
const indexHtml = readFileSync(join(root, "mobile-app/index.html"), "utf8");

test("approved dashboard signup is wired to the live signup endpoint", () => {
  assert.match(dashboard, /fetch\("\/api\/signups"/);
  assert.doesNotMatch(dashboard, /onSubmit=\{e=>e\.preventDefault\(\)\}/);
  assert.match(signupApi, /if \(!validEmail\(email\)\)/);
});

test("approved brand and public contact links are current", () => {
  assert.match(dashboard, /Beyond the Bite\. Powered by People and Purpose\./);
  assert.match(indexHtml, /Beyond the Bite\. Powered by People and Purpose\./);
  assert.match(dashboard, /facebook\.com\/share\/1C3i4dL3vk\//);
  assert.match(dashboard, /mailto:baitlogicadmin@gmail\.com/);
});
