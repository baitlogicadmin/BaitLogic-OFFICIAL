> **CORRECTION — verified against the repository's Source of Truth and mobile-app runtime (2026-11-02):** The actual documented production application is `mobile-app/` (React/TypeScript/Vite), NOT the root Express `server.js` app. The documented production Supabase project is `gibaaxzltpdizayvicgf`, NOT the separately connected `khhishscjirjxhsulniq` project. Do not repoint production to the latter. Existing production deployment was documented as Vercel; migrating to Cloudflare requires a compatible hosting architecture and route/Edge Function audit. The release readiness document also contains stale email requirements and must be reconciled with current user-approved scope. No production credentials or database configuration were changed.

# BaitLogic production integration audit — 2026-11-02

Branch: `audit/approved-design-integration-2026-11-02`. The `main` branch is unchanged. **The following root-server observations are about a secondary/legacy runtime, not the documented production Vite application.**

## Verified current source
- `package.json` starts `node server.js`; build script is a no-op.
- `server.js` serves `public/` and uses a Supabase URL and publishable key fallback referring to a project **different** from the connected Supabase project `khhishscjirjxhsulniq`. Do not switch this blindly: first inventory tables, RLS policies, endpoints, and current production data on both projects.
- `public/index.html` is the current homepage, with `/site.css?v=3` and `/baitlogic-brand.css?v=1`.
- `public/site.css` defines navy/gold/light theme, while `public/baitlogic-brand.css` overrides it with plum/purple and `!important`. The current homepage does not match the user-approved screenshot.
- `public/app.js` expects `window.supabase` and `window.BAITLOGIC_CONFIG` and only wires a waitlist form. Do not assume it provides auth, chat, or catches.
- `vercel.json` targets `mobile-app/dist/client`, but `package.json` runs the Node server. Hosting architecture is inconsistent.
- `package.json` includes `@vercel/speed-insights`. Removing it requires a usage search and lockfile reconciliation.
- The connected Supabase Production project currently contains RLS-enabled `reports`, `catches`, `profiles`, `subscriptions`, `intel_posts`, `waitlist_signups`, and `users` tables. Existing catches/reports lack explicit authenticated user ownership columns in the inspected schema. Do not expose them by granting indiscriminate SELECT/INSERT access.

## Safe implementation order
1. Inventory full repository tree and all static routes/assets, exact logo, JS imports, Node API endpoints, and all Vercel references; establish baseline smoke tests.
2. Identify the exact original logo asset and the approved artwork's licensed source images. Preserve the original logo file unchanged.
3. Implement responsive, semantic HTML/CSS matching the approved screenshot; do not use a scaled screenshot with transparent hotspots as the final UI. Keep existing routes intact and update homepage only after side-by-side mobile/desktop visual checks.
4. Decide whether the existing Node API should move to Cloudflare Workers or be replaced by direct Supabase calls; map every API route before changing hosting.
5. Reconcile Supabase projects and schemas, implement auth and ownership-based RLS, then connect reports/catches/profiles/chat with tested permissions. Never embed service-role keys in browser code.
6. Integrate source-labeled water/weather feeds with time stamps, unavailable states, and geospatial station matching. Do not display illustrative metrics as live.
7. Test all routes, keyboard/mobile accessibility, auth/RLS isolation, failure handling, responsive layout, caching and performance.
8. Create a Cloudflare Pages/Workers preview deployment and test. Only then merge and point the production domain after explicit approval.

## Release status
**Not deployable as a verified complete production app.** No database schema, production DNS, or main-branch files changed during this audit. The screenshot-based static ZIP from chat is a prototype, not a replacement for the existing app.
