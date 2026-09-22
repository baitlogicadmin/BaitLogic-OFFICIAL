# BaitLogic Deployment Readiness Gate

This is the required release gate for the current BaitLogic production stack: React + TypeScript + Vite PWA in `mobile-app/`, Vercel production hosting, Supabase backend, public-write protection through Cloudflare Turnstile, and the repository's recovered BaitLogic feature routes.

## Run the automated gate

```bash
npm --prefix mobile-app run check:readiness
```

The command does not deploy, change production data, or print secret values.

## Automated PASS requirements

| Gate | PASS means |
|---|---|
| Front-end production build | TypeScript and Vite production build finish without errors |
| PWA/backend foundation tests | Offline shell, cache contracts, security/write-protection contracts, and current dashboard contracts pass |
| Trail API contract tests | Bounded trail query, GeoJSON conversion, fallback parsing, and trailhead contracts pass |
| Production file map | Required React build, PWA, feature-route, trail API, and active Supabase files are present |
| Front-end environment mapping | Supabase URL, publishable key, and Turnstile site key are mapped without exposing values |
| Authoritative production target | GitHub `main` → Vercel is the only approved production target |
| Database/Data API read | The configured Supabase Data API returns HTTP 200 for the readiness read |
| Submission API bot-protection guard | A write attempt without a Turnstile token is rejected with HTTP 403 |

## Current architecture rules

- The canonical application source is `mobile-app/`.
- `vercel.json` explicitly builds the Vite application from `mobile-app/` and publishes `mobile-app/dist/client`.
- `public/` remains a recovered feature-asset source used by `prepare-sites-build.mjs`; it is not a second application architecture.
- The root Express server and root `package.json` are legacy compatibility assets. Do not treat them as the canonical application or add new product behavior there.
- Email lifecycle/signup automation is retired and is **not** a release requirement.
- Resend, `RESEND_API_KEY`, weekly sender, welcome-email delivery, and unsubscribe delivery are not current BaitLogic release gates.
- Supabase RLS, Turnstile, rate limits, moderation, and location-privacy controls must not be weakened to make a test pass.

## Required human/live release gates

These cannot be honestly approved by a source-code-only script:

- The reviewed build is present in the authoritative `baitlogicadmin/BaitLogic-OFFICIAL` source connected to the existing Vercel project and `bait-logic.com` domains.
- Production API behavior is checked for Barometer, Water Watch, Trails, reporting, and offline/reconnect behavior.
- Android and iPhone physical-device tests pass online, in airplane mode, and after relaunch.
- Vercel production runtime errors/warnings are reviewed after the candidate build.
- Supabase security/performance advisors are reviewed.
- Amber reviews the corrected preview and explicitly approves production deployment.

## Verification rules

- **IMPLEMENTED** means the code/config exists.
- **VERIFIED** means the relevant automated or live test actually passed.
- **DEPLOYED** means the change reached the production environment.
- **VALIDATED** means production behavior was checked after deployment.
- A passing build is not proof of production behavior.
- A READY Vercel deployment is not proof that every feature works.
- Do not mark a release gate complete from source-code inspection alone.

## Release rule

Preview-ready is not production-ready. Production deployment requires a passing automated gate, completion of the required live gates, and Amber's explicit approval.
