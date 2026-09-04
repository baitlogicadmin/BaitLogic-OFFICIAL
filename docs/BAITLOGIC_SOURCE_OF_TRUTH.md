# BaitLogic — Source of Truth

Last code-aligned review: 2026-09-04 (UTC)

This file records the product and production facts that must remain stable across BaitLogic work. It is intentionally concise. It is not an AI scratchpad, project diary, deployment log, or substitute for inspecting current code.

When this file conflicts with current `main`, verify the code and deployment before changing either one. Historical migrations and Git history remain historical evidence; they are not current product requirements.

---

## 1. Mission — LOCKED

**BaitLogic Outdoors is a woman-owned local outdoor intelligence platform built around useful local information, outdoor education, community knowledge, fishing, water, and conservation.**

Core outdoor safety, education, conservation, and local-intelligence information stays free and accessible.

BaitLogic should help people:

- understand local outdoor conditions
- find and use real trails and outdoor resources
- learn practical outdoor skills
- share useful community observations without exposing sensitive exact locations
- make better fishing and outdoor decisions
- report conservation concerns to the correct official authority

### Brand line

**Beyond the Bite. Powered by People and Purpose.**

---

## 2. Current product priority — LOCKED

The current homepage and primary discovery hierarchy is:

1. **Trails & Outdoor Education** — front and center
2. **Conservation Reporting Center** — direct, issue-appropriate official reporting routes
3. **Barometer / Local Conditions** — location-aware weather, pressure, water, freshness, and offline state
4. **Local Catches** — present but lower priority until real community usage grows

Supporting product areas include Water & Flow, Field Checks, Nature Check, camping preparedness, hiking, wildlife, fishing education, and other local outdoor intelligence.

Do not create duplicate competing page systems for the same feature.

---

## 3. Production architecture — LOCKED

- Canonical repository: `baitlogicadmin/BaitLogic-OFFICIAL`
- Authoritative production branch: `main`
- Production application source: `mobile-app/`
- Frontend: React + TypeScript + Vite PWA
- Production host: Vercel project `bait-logic-official`
- Production domains: `bait-logic.com` and `www.bait-logic.com`
- Data platform: Supabase
- Active Supabase project ref: `gibaaxzltpdizayvicgf`
- Public-write bot protection: Cloudflare Turnstile
- Production release path: GitHub `main` → Vercel

### Canonical runtime

```text
mobile-app/src/main.tsx
└── App.tsx
    └── Prototype.tsx
        ├── MobileDashboard.tsx
        └── DesktopDashboard.tsx
```

Active global/dashboard styles are the styles imported by this runtime. Do not restore retired visual experiments merely because their names remain in Git history.

### Active trail system

- Public trail experience: `mobile-app/public/trails.html`
- Trail UI/runtime: `mobile-app/public/trails-app.js`
- Trail API: `api/trails.js`
- Trail API contract tests: `tests/trails.test.js`
- Trail API responses are included in the PWA offline-cache strategy

BaitLogic renders its own cohesive trail experience. Generic park/agency landing pages are not the primary map experience. External official resources are supporting verification, closure, or reporting sources.

### Active submissions

- Field Check submission endpoint: `mobile-app/supabase/functions/submit-baitlogic-signal/index.ts`
- Public submissions must remain Turnstile-protected and rate-limited
- Field Check records remain moderation-controlled
- Exact/sensitive location privacy must be preserved
- Supported Field Check photo formats: JPEG, PNG, WebP
- Maximum photo payload: 1.5 MB
- Photo storage bucket: private `nature-checks`

### PWA / offline

- Manifest: `mobile-app/public/manifest.webmanifest`
- Service worker: `mobile-app/public/sw.js`
- Cached data must never be presented as live
- Offline, stale, unavailable, and reconnect states must be explicit

---

## 4. Retired / do not revive — LOCKED

The following are retired unless the founder explicitly re-approves them:

- `FeatureTools.tsx` and its retired styles
- `ApprovedDashboard.tsx` and its retired styles
- the old `RegionalExploreEnhancer.tsx` implementation and retired styles
- the unused React `TurnstileWidget.tsx`
- `mobile-dashboard-precision.css`
- the retired weekly-email client lifecycle
- weekly email sender/unsubscribe Edge Functions
- the retired `weekly_signup` branch inside the shared submission function
- stale AI-only Copilot repository instructions
- duplicate trail/map experiments superseded by the canonical trail system
- old ZIP snapshots or alternate repositories as production truth
- generic agency/park pages presented as if they were actual trail maps

Historical database migrations are not to be deleted merely because a feature has been retired. Database cleanup requires a deliberate forward migration, not history rewriting.

The root Express server and root `public/` tree remain legacy surfaces until their remaining test/runtime dependencies are fully audited. They are not the canonical Vercel frontend.

---

## 5. Brand / visual system — LOCKED

### Core palette

- Boysenberry `#630436` — primary page/map shell
- Mulberry `#4C0121` — deep panels and overlays
- Thyme `#5EDC1F` — primary lime/green action accent and trail emphasis
- Electric Plum `#D800F6` — bright secondary accent
- Egyptian Blue `#1034A6` — water / blue information accent
- Iris `#5D3FD3` — secondary route/UI differentiation
- Tiger Orange `#FC6A03` — warning / emphasis accent
- White / very light neutral — primary readable text

### Visual rules

- Keep the experience premium, vivid, readable, and outdoors-focused.
- Do not revert the product to the old navy/gold visual direction.
- “See something? Say something.” remains lime/Thyme green when used as a conservation call to action.
- The approved logo is locked. Do not redraw, recolor, simplify, replace, or disproportionately resize it unless explicitly requested.
- Use authentic outdoor imagery. Women anglers should be represented prominently where people are shown.
- Do not mix mobile and desktop mockups into one approval image unless explicitly requested.
- A visual change must be shown before deployment when founder approval is required.

---

## 6. Conservation / reporting — LOCKED

Conservation reporting must route people to the correct official intake or authority rather than vague agency homepages.

Current critical direct reporting destinations include:

- Illinois DNR Target Illinois Poachers reporting
- Missouri Department of Conservation fish-kill intake
- appropriate pollution/environmental complaint routes when applicable

BaitLogic community observations are not official reports and must never be presented as scientific or agency-confirmed findings.

---

## 7. Data truth / privacy — LOCKED

- Never fabricate weather, water, trail, closure, safety, catch, community, or conservation data.
- Never substitute a plausible value when verified data are unavailable.
- Never label stale/cached information as live.
- Preserve source and freshness information where materially relevant.
- Community exact spots stay private by default.
- Never expose service-role credentials, private moderation data, or private submission data in browser code.
- Browser-safe public keys require appropriate RLS/grants.
- Do not weaken Turnstile, RLS, rate limiting, moderation, or privacy controls merely to make a request succeed.

---

## 8. Product status language — LOCKED

Use status words literally:

- IDEA — concept only
- PLANNED — approved but not yet built
- IN DEVELOPMENT — actively being built
- IMPLEMENTED — code/config exists
- VERIFIED — relevant behavior has been tested successfully
- DEPLOYED — verified behavior has reached production
- VALIDATED — real user/data evidence demonstrates the intended outcome
- DEPRECATED — intentionally retired

A successful build alone does not mean deployed, validated, or safe.

---

## 9. Safety-critical release standard — LOCKED

BaitLogic may be used for outdoor field decisions. Weather, water, location, trails, closures, reporting, offline behavior, and safety context must therefore fail clearly rather than appear confidently wrong.

Release-blocking defects include:

- stale/cached data presented as live
- fabricated or silently substituted safety-relevant values
- broken launch-critical internal routes or assets
- dead/mislabeled official reporting or safety links
- broken mobile scrolling/navigation
- broken offline, reconnect, stale-state, or geolocation fallback behavior when the feature depends on it

For material visual or safety-critical work, use this sequence:

`approved requirement/reference → implementation → build → automated tests → rendered mobile review → link/asset verification → relevant offline/stale/reconnect verification → founder approval → deployment → live verification`

Do not call a safety-critical feature verified solely because automated tests passed.

---

## 10. Repository cleanup rule — LOCKED

The repository should contain one understandable implementation of each active product surface.

Remove obsolete scaffolding, duplicate implementations, abandoned visual experiments, stale AI notes, and retired runtime code after confirming the active product no longer imports or depends on them.

Keep:

- active production code
- tests that protect current behavior
- security/privacy controls
- source-of-truth documentation
- required deployment configuration
- historical migrations and Git history
- unique feature work that has not yet been safely reconciled

Do not retain dead files “just in case.” Git history is the archive.

---

## 11. Change management

Routine reversible cleanup and maintenance may proceed when the correct action is clear.

Founder approval is required before deploying a materially different visual direction, changing core mission/brand commitments, weakening privacy/security boundaries, changing the production architecture, or making destructive/irreversible data changes.

When an important product or production fact changes, update this file rather than creating another competing master/context document.

---

## Change log

- **2026-09-04 — Runtime/documentation cleanup:** aligned the Source of Truth to the canonical React runtime and live BaitLogic trail system; retired the obsolete weekly-email runtime, duplicate frontend implementations, stale AI-only instructions, and old navy/gold visual direction; preserved historical migrations and safety/security controls.
- **2026-09-03 — Trail system:** BaitLogic’s cohesive branded trail-map experience became the canonical trail surface, backed by bounded trail GeoJSON, trail contract tests, and offline API caching.
- **2026-08-31 — Safety-critical trust standard:** locked fail-closed field/safety behavior, explicit stale/offline states, direct authoritative destinations, founder visual approval for material changes, and live post-deploy verification.
