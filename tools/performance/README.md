# Reusable mobile performance check

Copy `mobile-readiness.mjs` into any Node.js project. Install Playwright:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

Start your app locally or use a reachable staging URL, then run:

```bash
TEST_SELECTOR=".primary-action" TEST_BUDGET_MS=3000 node mobile-readiness.mjs http://localhost:4173
```

Override settings using `TEST_WIDTH`, `TEST_HEIGHT`, `TEST_LATENCY_MS`, `TEST_DOWNLOAD_KBPS`, `TEST_UPLOAD_KBPS`, `TEST_REPORT`. Defaults: 360x780, 120ms latency, 1600 Kbps download, 750 Kbps upload, 3000ms budget, `main` selector.

The script produces a JSON report, exits nonzero on failure, checks visibility, horizontal overflow and uncaught page exceptions. It does **not** guarantee full feature usability or field performance. Add project-specific click/navigation tests and real-device measurements.

For BaitLogic: run from `mobile-app/` after starting a server and point the selector at `.bl-primary-cta`. Example:

```bash
TEST_SELECTOR=".bl-primary-cta" node ../tools/performance/mobile-readiness.mjs http://localhost:4173
```

Use in CI by starting the built app server and running the same command.
