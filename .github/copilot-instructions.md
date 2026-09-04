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
- Public-write protection: Cloudflare Turnstile verification in the submission backend

The root Express server and root `public/` remain legacy compatibility surfaces unless the Source of Truth explicitly reactivates them. Never implement a production frontend fix in legacy code merely because a matching file exists there.

## Active code map

Inspect the actual files before changing behavior. Do not rely on this summary alone.

- Runtime entry: `mobile-app/src/main.tsx` → `mobile-app/src/App.tsx` → `mobile-app/src/Prototype.tsx`
- Mobile product UI: `mobile-app/src/MobileDashboard.tsx`, `mobile-app/src/mobile-dashboard.css`, `mobile-app/src/mobile-dashboard-reference.css`
- Desktop product UI: `mobile-app/src/DesktopDashboard.tsx`, `mobile-app/src/desktop-dashboard.css`
- Conditions/data hook: `mobile-app/src/useBaitLogicConditions.ts`
- Product data/config and Field Check synchronization: `mobile-app/src/data/baitlogicData.ts`
- PWA/offline: `mobile-app/public/manifest.webmanifest`, `mobile-app/public/sw.js`
- Public submission validation: `mobile-app/supabase/functions/submit-baitlogic-signal/index.ts`
- Database truth: `mobile-app/supabase/migrations/` and Supabase SQL/function definitions under `mobile-app/supabase/`
- Release checks: `mobile-app/scripts/deployment-readiness.mjs`, `mobile-app/tests/`, root `tests/`, `.github/workflows/deployment-readiness.yml`
- Vercel mapping: root `vercel.json`

### Removed from the canonical runtime

Do not recreate or reference these retired frontend layers unless the founder explicitly authorizes a new implementation:

- `FeatureTools.tsx` / `feature-tools.css`
- `ApprovedDashboard.tsx` / `approved-dashboard.css`
- `TurnstileWidget.tsx`
- the old cleanup-branch `RegionalExploreEnhancer.tsx` / `regional-explore.css`

The separate trail-navigation work in PR #43 contains newer route/navigation functionality and must be reconciled deliberately rather than replaced by the retired RegionalExplore implementation.

## Current code-aligned facts — 2026-09-03

These statements describe the inspected repository state. They do not replace live verification.

- The active frontend runtime switches between `MobileDashboard` and `DesktopDashboard` through `Prototype.tsx` using the viewport breakpoint.
- Current condition UI distinguishes live, cached, and unavailable/check states; never label cached or stale data as live.
- Field Check writes remain routed through the validated Supabase submission function with Turnstile verification, rate limiting, RLS, moderation, and area-level location privacy.
- The retired weekly-email frontend/data lifecycle has been removed from the canonical cleanup branch. Do not revive weekly email state, signup sync, or email-captcha plumbing by copying stale files.
- PR #43 preserves newer actual-trail geometry, trailheads, offline route storage, and GPX work. Treat it as separate valuable feature work pending reconciliation.
- PostHog/analytics is not a validated production dependency. Do not claim adoption, active users, or behavioral evidence without real data.

## Product and brand locks

- BaitLogic is woman-owned, community-driven, rooted in fishing, and built for the wider outdoor community.
- Core knowledge and conservation information stay free and accessible.
- Exact/sensitive spots stay private; community reports are not official agency reports.
- Primary contribution language: “What did you notice?” and “No expertise needed. Exact spots stay private.”
- Follow the current Source of Truth for brand language and approved visual direction; do not infer design authority from retired components or screenshots.
- Represent women anglers and the broader outdoor world; do not default to male-only fishing imagery.

## Execution rules

- Use `Requirement → decision → implementation → verification → founder preview approval → deployment → documentation`.
- Use `IDEA → PLANNED → IN DEVELOPMENT → IMPLEMENTED → VERIFIED → DEPLOYED → VALIDATED` precisely.
- Make the smallest complete change. Preserve correct existing work.
- Never expose secrets, service-role credentials, subscriber data, exact locations, or private moderation/admin data.
- Do not weaken Turnstile, RLS, grants, authorization, or moderation to silence an error.
- For meaningful changes: work on a non-production branch, run the relevant readiness/tests, open or update the review PR, and use the exact candidate for founder review.
- Never merge/deploy a visual or production change without the founder’s explicit approval of that exact preview.
- Documentation-only context alignment may be prepared in a PR, but do not describe it as merged until it is merged.
- After a material fact changes, update `docs/BAITLOGIC_SOURCE_OF_TRUTH.md` and relevant operational documentation in the same workstream. Do not create another memory/context document.
