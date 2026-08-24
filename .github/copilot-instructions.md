# GitHub Copilot instructions for BaitLogic

This file is a thin adapter for GitHub-hosted AI tools. It is not a competing source of product truth and must not be expanded into one.

## Mandatory reading order

Before planning, editing, reviewing, or generating BaitLogic code, read these files in full and follow their hierarchy:

1. `docs/COSMIC_CREATOR_CORE_DOCTRINE_BINDING.md`
2. `docs/BAITLOGIC_SOURCE_OF_TRUTH.md`
3. `docs/BAITLOGIC_FOUNDER_GUARDRAILS.md`
4. root `AGENTS.md`
5. the nearest scope-specific `AGENTS.md`; for production app work, this includes `mobile-app/AGENTS.md`
6. `BAITLOGIC_INDEPENDENCE_PACK.md` and `mobile-app/DEPLOYMENT_READINESS.md`

If instructions conflict, obey the higher-ranked document and surface the conflict. Never silently choose a lower-ranked or older rule.

## Canonical system

- Repository: `baitlogicadmin/BaitLogic-OFFICIAL`
- Authoritative branch: `main`
- Production source: `mobile-app/`
- Frontend: Vite + React + TypeScript PWA
- Production host: Vercel project `bait-logic-official`
- Domains: `bait-logic.com` and `www.bait-logic.com`
- Backend: Supabase project ref `gibaaxzltpdizayvicgf`
- Public-write protection: Cloudflare Turnstile
- Email delivery: Resend from Supabase Edge Functions
- Founder/admin email target used by signup notifications: `baitlogicadmin@gmail.com`

The root Express server, root `public/`, and root API experiments are legacy unless the Source of Truth explicitly reactivates them. Root `npm start` and `npm run dev` must route to `mobile-app/`; use `npm run start:legacy` only for deliberate legacy testing. Never implement a production fix in legacy code merely because a matching file exists there.

## Active code map

Inspect the actual files before changing behavior. Do not rely on this summary alone.

- Product UI: `mobile-app/src/Prototype.tsx`, `mobile-app/src/prototype.css`
- Supporting feature UI: `mobile-app/src/FeatureTools.tsx`, `mobile-app/src/feature-tools.css`
- Regional/local exploration: `mobile-app/src/RegionalExploreEnhancer.tsx`, `mobile-app/src/regional-explore.css`
- Product data/config: `mobile-app/src/data/baitlogicData.ts`
- App/runtime composition: `mobile-app/src/App.tsx`, `mobile-app/src/main.tsx`, `mobile-app/src/mobile/`
- PWA/offline: `mobile-app/public/manifest.webmanifest`, `mobile-app/public/sw.js`
- Public submissions, photo handling, signup confirmation, and admin notification: `mobile-app/supabase/functions/submit-baitlogic-signal/index.ts`
- Weekly email: `mobile-app/supabase/functions/send-baitlogic-weekly/index.ts`
- Unsubscribe: `mobile-app/supabase/functions/unsubscribe-baitlogic-weekly/index.ts`
- Database truth: `mobile-app/supabase/migrations/`
- Release checks: `mobile-app/scripts/deployment-readiness.mjs`, `mobile-app/tests/`, `.github/workflows/deployment-readiness.yml`
- Vercel mapping: root `vercel.json`

## Current code-aligned facts — 2026-08-24

These statements describe the inspected repository state. They do not replace live verification.

- Field Check photo support is implemented end-to-end in the active PWA code: accessible camera/gallery selection, client validation/compression to 1.5 MB, IndexedDB offline queueing, retry-aware submission, private `nature-checks` upload, area-only location precision, and pending moderation. Treat it as unverified until automated and physical-device/live storage checks pass.
- Signup records are saved before email attempts. The function attempts both a subscriber welcome email and an admin notification, then records provider IDs, timestamps, or errors in `weekly_signups`.
- The code writes `email_not_configured` when the active Edge Function runtime lacks either `RESEND_API_KEY` or `BAITLOGIC_EMAIL_FROM`. On 2026-08-24 the founder reported this exact production result for both welcome and admin notification. Treat email delivery as BLOCKED/UNVERIFIED until Supabase secrets and the deployed function are checked and a real consented end-to-end test succeeds.
- A barometer mobile location-loading fix is merged on `main` at commit `a8885f222c95343022cf00cfbaca8d1af85dfeab`; do not call it production-verified without a live mobile test.
- The four home quick tools were changed to a four-column no-overflow small-screen layout at `16003538bb2766de5fbfea4c2985cd2b9def4577`; preserve that latest `main` change when working on this branch.
- Main condition cards use `/api/barometer-snapshot` for location-based current weather, saved verified data for offline fallback, and honest blanks on failure. Do not call the production chain verified without a real-device live check.
- PostHog/analytics is not a validated production dependency. Do not claim adoption, active users, or behavioral evidence without real data.

## Product and brand locks

- BaitLogic is woman-owned, community-driven, rooted in fishing, and built for the wider outdoor community.
- Core knowledge and conservation information stay free and accessible.
- Exact/sensitive spots stay private; community reports are not official agency reports.
- Primary contribution language: “What did you notice?” and “No expertise needed. Exact spots stay private.”
- Brand language: “Beyond the Bite.” / “Protect What Matters.” / supporting line “Powered by People and Purpose.”
- Current approved visual direction is deep navy, premium gold, warm white, and controlled spectrum/rainbow accents, with authentic outdoor richness and strong readability. Do not recolor or flatten the approved product without explicit review.
- Use the approved ornate gold-ring/anchor identity with no compass star or starburst behind the anchor and no rejected neon-blue swoosh.
- Represent women anglers and the broader outdoor world; do not default to male-only fishing imagery.

## Execution rules

- Use `Requirement → decision → implementation → verification → founder preview approval → deployment → documentation`.
- Use `IDEA → PLANNED → IN DEVELOPMENT → IMPLEMENTED → VERIFIED → DEPLOYED → VALIDATED` precisely.
- Make the smallest complete change. Preserve correct existing work.
- Never expose secrets, service-role credentials, subscriber data, exact locations, or private moderation/admin data.
- Do not weaken Turnstile, RLS, grants, authorization, or moderation to silence an error.
- For meaningful changes: create an issue, branch from current `main`, run `npm --prefix mobile-app run check:readiness`, open a PR, and use the exact preview for founder review.
- Never merge/deploy a visual or production change without the founder’s explicit approval of that exact preview.
- Documentation-only context alignment may be prepared in a PR, but do not describe it as merged until it is merged.
- After a material fact changes, update `docs/BAITLOGIC_SOURCE_OF_TRUTH.md` and `BAITLOGIC_INDEPENDENCE_PACK.md` in the same workstream. Do not create another memory/context document.
