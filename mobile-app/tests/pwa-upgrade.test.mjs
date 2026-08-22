import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("new service worker replaces the prior BaitLogic cache and claims installed clients", async () => {
  const source = await readFile(new URL("../dist/client/sw.js", import.meta.url), "utf8");
  const cacheMatch = source.match(/const CACHE = "([^"]+)"/);
  assert.ok(cacheMatch, "service worker must declare a versioned CACHE name");
  const currentCache = cacheMatch[1];
  assert.match(currentCache, /^baitlogic-field-kit-v\d+$/);

  const currentVersion = Number(currentCache.match(/v(\d+)$/)?.[1]);
  assert.ok(Number.isInteger(currentVersion) && currentVersion > 1, "cache version must be incrementable");
  const previousCache = `baitlogic-field-kit-v${currentVersion - 1}`;

  const handlers = new Map();
  const deleted = [];
  let claimed = false;

  const context = vm.createContext({
    self: {
      location: { origin: "https://www.bait-logic.com" },
      addEventListener(name, handler) { handlers.set(name, handler); },
      clients: { async claim() { claimed = true; } },
      async skipWaiting() {},
    },
    caches: {
      async keys() { return [previousCache, currentCache]; },
      async delete(key) { deleted.push(key); return true; },
      async open() { throw new Error("not used by activate test"); },
      async match() { return undefined; },
    },
    fetch,
    URL,
    Response,
    Headers,
    Request,
    setTimeout,
    clearTimeout,
    Promise,
    console,
  });

  vm.runInContext(source, context, { filename: "sw.js" });
  const activate = handlers.get("activate");
  assert.equal(typeof activate, "function", "service worker must register activate handler");

  let activation;
  activate({ waitUntil(promise) { activation = promise; } });
  assert.ok(activation, "activate handler must extend lifetime with waitUntil");
  await activation;

  assert.ok(deleted.includes(previousCache), `old cache ${previousCache} should be removed`);
  assert.ok(!deleted.includes(currentCache), `current cache ${currentCache} must be preserved`);
  assert.equal(claimed, true, "new worker must claim existing installed-app clients immediately");
});
