# BaitLogic Production PWA Agent Guide

This file governs work inside `mobile-app/`. It supplements, and never overrides, the repository hierarchy in:

1. `docs/COSMIC_CREATOR_CORE_DOCTRINE_BINDING.md`
2. `docs/BAITLOGIC_SOURCE_OF_TRUTH.md`
3. `docs/BAITLOGIC_FOUNDER_GUARDRAILS.md`
4. root `AGENTS.md`

Read those files before changing this application.

## Active production contract

- `mobile-app/` is the production source for the responsive Vite + React + TypeScript PWA deployed through Vercel.
- Production renders as a full-viewport responsive application. Do not wrap it in a simulated phone, device bezel, device picker, simulated status bar, simulated keyboard, camera cutout, or home indicator.
- `src/App.tsx` composes the active product through `FeatureTools` and `Prototype`.
- Files under `src/mobile/`, device assets, and runtime fixtures may remain for isolated test coverage or historical reference. Their presence does not authorize restoring simulated device chrome to production.
- Root `server.js`, root `public/`, and root API experiments are legacy and are not production UI sources.

## Locked product and design decisions

- Preserve the approved premium editorial outdoor-intelligence direction; BaitLogic is rooted in fishing but serves the wider outdoor community.
- Use the approved ornate gold-ring and anchor logo with no compass star/starburst and no rejected neon-blue swoosh.
- Preserve deep navy, premium gold, warm white, controlled spectrum/rainbow accents, strong contrast, authentic outdoor richness, and prominent representation of women outdoors.
- Do not flatten BaitLogic into generic minimalism, a generic fishing page, or a template-looking SaaS product.
- Primary contribution language is “What did you notice?” with the privacy reassurance “No expertise needed. Exact spots stay private.”
- Official agency reporting must remain clearly separate from optional BaitLogic community Field Checks.
- Use real live/cached/unavailable labels. Never replace missing information with sample conditions or fabricated community activity.

## Editing boundaries

- Product UI: `src/Prototype.tsx` and `src/prototype.css`
- Supporting tools: `src/FeatureTools.tsx`, `src/feature-tools.css`, `src/RegionalExploreEnhancer.tsx`, and `src/regional-explore.css`
- Data and synchronization: `src/data/baitlogicData.ts`
- PWA/offline: `public/manifest.webmanifest` and `public/sw.js`
- Backend functions and migrations: `supabase/`

Preserve accessibility, readable mobile typography, native browser text input, safe-area padding, no horizontal overflow, reliable offline states, and truthful error handling. A runtime test fixture must not dictate production layout.

## Field Check photo contract

- Photo attachment is optional.
- Accept only JPEG, PNG, and WebP.
- Client-side processing must keep the submitted image at or below 1.5 MB.
- Queued offline photo data belongs in IndexedDB, not localStorage.
- Exact coordinates must never be embedded in the public Field Check record.
- New reports and photos remain pending moderation.
- Failed photo uploads must remain retryable and must not be reported as successfully submitted.
- Do not display private storage paths directly. Public display requires an approved moderation and signed-delivery design.

## Required verification

Before handoff:

1. Run `npm run check:runtime`.
2. Run `npm run test:runtime` for interaction/runtime changes.
3. Run `npm run check:readiness`.
4. Verify the responsive app without a simulated phone frame.
5. Check Android-width layout, keyboard entry, online/offline states, Field Check submission, optional photo preview/removal, and reconnect retry behavior.
6. Report implemented, tested, previewed, deployed, and production-verified states separately.

Use a branch and pull request for meaningful changes. A production deployment requires the founder to review and approve the exact preview candidate.
