# BaitLogic — Source of Truth

Last code-aligned review: 2026-09-03 (UTC)

This file is the authoritative handoff for humans and AI collaborators. When project facts conflict with older notes, screenshots, chats, ZIPs, branches, legacy root files, or deprecated infrastructure, this file and current `main` take precedence unless the founder explicitly changes a locked decision.

Operational detail lives in the root [`BAITLOGIC_INDEPENDENCE_PACK.md`](../BAITLOGIC_INDEPENDENCE_PACK.md).

---

## 1. North Star — LOCKED

**BaitLogic is a woman-owned local outdoor intelligence platform built around fishing, water, community knowledge, and conservation.**

BaitLogic connects verified local conditions, practical fishing intelligence, firsthand community observations, environmental context, and direct conservation action so people can make better decisions outdoors and help protect the places they use.

### Master brand line

**Beyond the Bite. Protect What Matters.**

### Core value statement

**Understand the water. Learn from the community. Fish smarter. Protect what matters.**

### What “Beyond the Bite” means

Fishing is the foundation and primary entry point, but catching fish is not the whole system. BaitLogic connects the bite to the water, weather, habitat, local observations, resource health, and the responsibility to protect the places that make outdoor life possible.

Core knowledge and conservation information must remain accessible without a paywall.

---

## 2. Product hierarchy — LOCKED

BaitLogic has **four primary pillars**. These are the organizing structure for product UX, navigation, content, marketing, community, partnerships, and future feature decisions.

### Pillar 1 — Fishing Intelligence

Purpose: help anglers make better local decisions using real conditions and practical context.

Includes:
- barometric pressure and pressure trends
- weather, wind, temperature, and safety context
- water conditions and available public water data
- patterns, catches, tactics, presentations, depth/cover thinking, and species context
- location-aware tools and saved/offline field intelligence

### Pillar 2 — Community Knowledge

Purpose: preserve useful firsthand local knowledge without pretending community observations are official measurements.

Includes:
- Field Checks
- catches and fishing reports
- local observations
- practical experience
- community discussion and approved community intelligence
- privacy-safe place context

### Pillar 3 — Water & Environment

Purpose: help people understand the larger system around the fishing and outdoor experience.

Includes:
- water health
- streamflow, gage height, water temperature, and other verified public measurements where available
- habitat
- wildlife
- access and closures
- environmental conditions
- trails, paddling, camping, hiking, and other outdoor categories when they strengthen the local-intelligence picture

These supporting categories are **not separate competing brand identities**. They support the central BaitLogic system.

### Pillar 4 — Conservation Action

Purpose: turn awareness into responsible action.

Includes:
- what to notice
- how to document safely
- which official authority to contact
- Illinois and Missouri reporting routes
- pollution, fish kills, wildlife violations, invasive species, habitat damage, and other resource concerns
- education that clearly separates community observations from official reports

### Product flow

The product should feel like one connected system:

`Conditions → Community Knowledge → Better Fishing/Outdoor Decisions → Conservation Action`

Do not present every outdoor subject as a separate top-level identity. Supporting topics must reinforce this hierarchy.

### Education placement rule — LOCKED

**Camping education must be a front-and-center education option alongside fishing education.**

Whenever BaitLogic presents primary educational choices, featured learning categories, homepage learning entry points, or mobile learning navigation, **Camping** must be visibly available next to **Fishing** at the same first-line discovery level. Camping education must not be buried behind generic outdoor categories or treated as an afterthought.

This rule does **not** create a fifth primary product pillar. It governs the prominence and discoverability of education within the existing four-pillar BaitLogic system.

---

## 3. Current production architecture — LOCKED

- Canonical repository: `baitlogicadmin/BaitLogic-OFFICIAL`
- Authoritative branch: `main`
- Production source: `mobile-app/`
- Frontend: Vite + React + TypeScript progressive web app
- Production host: Vercel
- Vercel project: `bait-logic-official`
- Production domains: `bait-logic.com` and `www.bait-logic.com`
- Data platform: Supabase
- Active Supabase project ref: `gibaaxzltpdizayvicgf`
- Public-write protection: Cloudflare Turnstile in the validated submission path
- Production deployment rule: the founder reviews the exact production candidate and explicitly approves deployment

### Active code map

- Runtime entry: `mobile-app/src/main.tsx`
- App composition: `mobile-app/src/App.tsx`
- Responsive runtime switch: `mobile-app/src/Prototype.tsx`
- Mobile implementation: `mobile-app/src/MobileDashboard.tsx` with `mobile-dashboard.css` and `mobile-dashboard-reference.css`
- Desktop implementation: `mobile-app/src/DesktopDashboard.tsx` with `desktop-dashboard.css`
- Live/cached conditions: `mobile-app/src/useBaitLogicConditions.ts`
- Product data/config and Field Check synchronization: `mobile-app/src/data/baitlogicData.ts`
- PWA/offline: `mobile-app/public/manifest.webmanifest` and `mobile-app/public/sw.js`
- Validated public submission function: `mobile-app/supabase/functions/submit-baitlogic-signal/index.ts`
- Database changes: `mobile-app/supabase/migrations/`
- Verification: `mobile-app/scripts/deployment-readiness.mjs`, `mobile-app/tests/`, `.github/workflows/deployment-readiness.yml`
- Vercel mapping: root `vercel.json`

### Removed from the canonical frontend path

The following retired layers are not active runtime dependencies and must not be revived by assumption:
- `FeatureTools.tsx` / `feature-tools.css`
- `ApprovedDashboard.tsx` / `approved-dashboard.css`
- `TurnstileWidget.tsx`
- the older `RegionalExploreEnhancer.tsx` / `regional-explore.css` implementation
- the removed weekly-email lifecycle in `baitlogicData.ts`

The trail/navigation work in PR #43 is separate feature work with newer route/offline logic. It is not production truth until reconciled, verified, approved, and merged through the canonical release path.

### Important correction

The root Express server and root `public/` directory are legacy/deprecated production UI. They may remain for legacy API/server behavior and tests, but they are **not evidence of the current Vercel frontend implementation**.

The active PWA **does have a service worker and offline architecture**. Do not repeat the obsolete claim that offline/PWA support is absent merely because the legacy root `public/` tree does not contain the active service worker.

---

## 4. Deprecated / do not revive by assumption

- Root Express server and root `public/` as the production frontend
- `baitlogicadmin/BaitLogic` as the canonical repository
- simulated phone/device frames in the production runtime UI
- `baitlogic.org` as the primary domain
- Name.com as current infrastructure unless reconfirmed
- Cloudflare Workers / Wrangler as required production infrastructure
- old ZIP snapshots as source of truth
- older Supabase projects that conflict with `gibaaxzltpdizayvicgf`
- native App Store / Play Store claims; the current product is a PWA
- marketing BaitLogic as multiple unrelated outdoor brands or feature silos
- “everything outdoors” messaging that obscures fishing, water, community, and conservation as the core hierarchy
- the retired weekly-email lifecycle unless the founder explicitly re-approves it

---

## 5. Product status labels — LOCKED

- IDEA — concept only
- PLANNED — approved but not yet built
- IN DEVELOPMENT — actively being built
- IMPLEMENTED — code/config exists
- VERIFIED — relevant behavior has been tested successfully
- DEPLOYED — verified behavior has been confirmed in production
- VALIDATED — real user/data evidence shows the intended outcome works
- LOCKED — approved source-of-truth decision
- DEPRECATED — must not be revived without an explicit decision

Never call something verified, deployed, live, successful, scientifically validated, or adopted based only on code presence or a successful build.

---

## 6. Current product reality

### Implemented foundation

- responsive Vite/React PWA from `mobile-app/`
- separate mobile and desktop dashboard implementations selected by `Prototype.tsx`
- web-app manifest and service worker
- cached/last-known conditions behavior in the active UI
- device-local Field Check storage and later synchronization
- protected Field Check submissions through `submit-baitlogic-signal`
- Cloudflare Turnstile verification and database-backed rate limiting in the submission path
- approved-only community Field Check feed
- Field Check photo support exists in separate unreconciled feature work and is not part of the cleanup branch’s canonical runtime until integrated and verified
- Facebook and Instagram CTAs where present in the active shell
- GitHub deployment-readiness workflow
- mobile barometer/location handling and offline status contracts

### Requires verification / hardening

- Android and iPhone physical-device tests: online, offline, relaunch, typing, install, reconnect, and synchronization
- confirm current location names on real devices and rural locations
- confirm production service-worker behavior and cache freshness semantics
- confirm official reporting destinations on production mobile devices
- reconcile and verify trail-navigation work before making production claims
- reconcile and verify Field Check photo work before making production claims
- continue Supabase performance/security-advisor maintenance
- maintain deliberate grants and RLS on every public table
- verify the exact Vercel candidate before any merge to `main`

### Planned / incomplete strategic modules

- deeper live localized water intelligence
- complete issue-specific conservation routing
- species library
- bathymetry/depth intelligence
- expanded fishing reports and community discussion
- local business/partner ecosystem
- native Android/iOS packages only if usage justifies them
- marketplace/commerce remains later priority

---

## 7. Current code-aligned blockers and cautions

### Submission security

Field Check synchronization must remain behind the validated Supabase submission function. The server-side function verifies Cloudflare Turnstile, fails closed when the secret is unavailable, applies rate limiting, and uses privileged database access server-side rather than exposing service-role credentials to the browser.

Do not weaken this path merely because a retired React Turnstile wrapper was removed. That wrapper was unused; the security contract lives in the validated submission function and associated data path.

### Sample/live claims

Any condition card or module that is still sample/demo data must remain clearly labeled. Do not market sample values as live intelligence.

Cached or stale values must be labeled cached/stale and never presented as live.

### Analytics

PostHog or any other analytics platform is not automatically a validated production dependency. Do not claim active users, retention, adoption, or behavior without real evidence.

---

## 8. Brand and experience rules — LOCKED

- Woman-owned identity is core.
- Fishing is the foundation and strongest audience entry point.
- BaitLogic is broader than fishing only where broader outdoor information strengthens the local intelligence/conservation system.
- Free knowledge, local intelligence, conservation, community sharing, and stewardship are foundational.
- Core knowledge and conservation resources stay free; no premium knowledge paywall.
- Current approved visual direction remains governed by founder-approved references and exact visual review; do not silently substitute a new aesthetic.
- Use authentic outdoor imagery; women anglers should be represented prominently.
- Do not default to male-only imagery.

### Brand language hierarchy

1. **Master line:** `Beyond the Bite.`
2. **Mission-facing extension:** `Protect What Matters.`
3. **Core statement:** `Understand the water. Learn from the community. Fish smarter. Protect what matters.`
4. `Powered by People and Purpose.` may be used only as optional supporting legacy/community language when it does not compete with the primary hierarchy.

### Messaging rule

Do not lead with a long list of fishing, hiking, paddling, camping, wildlife, habitat, access, trails, weather, conservation, and community as though they are all separate equal products.

Lead with the four-pillar system, then show supporting categories underneath it.

---

## 9. Funnel architecture — LOCKED

### Stage 1 — Attraction

Short-form fishing/outdoor content with strong visual hooks. Fishing remains the strongest broad entry point because it gives BaitLogic a clear audience and practical reason to care about local conditions.

### Stage 2 — Retention

BaitLogic tools, fishing intelligence, water/environment context, Field Checks, community knowledge, and conservation action.

### Stage 3 — Sustainable support

Mission-aligned sponsorships, local-business partnerships, grants/donations where appropriate, and other founder-approved channels may support the platform without putting core knowledge behind a paywall.

The prior weekly-email lifecycle is not part of the current canonical product and must not be reintroduced by assumption.

---

## 10. Security / privacy rules — LOCKED

- Never expose service-role credentials to browser code or the public repository.
- Only browser-safe values may use `VITE_*`.
- Publishable Supabase keys require correct grants and RLS.
- Never grant anonymous SELECT to private analytics, moderation, or admin data simply to make frontend requests work.
- Validate and rate-limit public writes.
- Treat Supabase security-advisor warnings as defects unless a documented service-only design explains them.
- Do not present community submissions as official reports or scientific measurements.
- Preserve area-level community location privacy; exact spots should not be exposed by default.
- Secret values belong in Vercel/Supabase secret stores, never GitHub, chats, or screenshots.

---

## 11. Execution and quality rules — LOCKED

Use this operating sequence:

`Requirement → best defensible decision → implementation → verification → founder preview approval → deployment → documentation`

For routine reversible repository work, act when the correct action is clear instead of repeatedly asking permission.

Stop/escalate for materially subjective, irreversible, legal, financially consequential, credential-dependent, partnership-binding, mission-changing, or production-deployment decisions.

The founder must approve the exact production candidate before deployment when a material visual/product direction changes.

### Completion rule

Do not present a plan as progress when the requested task was implementation.

When connected tools can inspect, test, edit, create, or verify the work, use them before giving generic instructions.

Always distinguish:

`IDEA → PLANNED → IN DEVELOPMENT → IMPLEMENTED → VERIFIED → DEPLOYED → VALIDATED`

---

## 12. AI / CPXO operating mandate — LOCKED

For BaitLogic work, the primary AI collaborator should operate, as capabilities permit, across product, experience, engineering coordination, QA, analytics, growth, security, and product marketing while the founder remains CEO/final authority.

Treat BaitLogic as **one continuous product system**, not a queue of disconnected features.

### Continuous loop

`Vision → Evidence → Priorities → UX → Engineering → QA → Production → Launch → Analytics → User behavior → Improvement → Growth`

### Anti-drift rules

The collaborator must not:

- reduce BaitLogic to fishing-only
- broaden BaitLogic into an unfocused “everything outdoors” brand
- substitute generic advice for execution when connected tools can perform the work
- ask the founder to re-decide routine reversible decisions already resolved by source-of-truth rules
- call code presence “verified” or “deployed”
- revive deprecated infrastructure or stale historical decisions as authoritative
- optimize aesthetics while ignoring usability, performance, accessibility, truthfulness, security, or mission
- optimize growth in ways that weaken free knowledge, conservation, privacy, trust, or long-term value
- silently change locked mission, brand, architecture, security, or infrastructure decisions
- leave known regressions or misleading status claims unaddressed simply because the literal request was narrower

### Self-audit before completion

1. Does this support the four-pillar BaitLogic hierarchy?
2. Is the user experience clear, useful, accessible, and visually coherent?
3. Is the implementation technically sound, secure, privacy-safe, and maintainable?
4. Were relevant failure states, mobile/offline behavior, and regressions considered?
5. Is the production/source-of-truth state accurate?
6. Are success/analytics claims evidence-based?
7. Is anything represented as live, verified, scientific, partnered, populated, or successful without evidence?
8. Did the work create duplicate systems, deployment drift, or technical debt that should be resolved now?
9. Is there an obvious adjacent action required for the work to actually succeed?

If a meaningful defect is exposed, address it before calling the work complete unless a genuine blocker requires founder action.

---

## 13. Change-management rule

When an imperative product, brand, infrastructure, security, or mission fact changes, update this file and the relevant operational documentation in the same workstream. Do not create competing “memory” or “master” documents that can drift independently.

---

## 14. Safety-critical trust standard — LOCKED 2026-08-31

The founder has explicitly designated BaitLogic as a product where people may eventually rely on information while outdoors and where errors in conditions, navigation, closures, reporting, offline behavior, or safety context could have serious consequences.

Therefore:

- correctness, provenance, freshness, uncertainty, and clear failure states outrank launch speed or cosmetic completion
- no safety-relevant value may be fabricated or silently substituted
- unavailable verified data must be labeled unavailable/unknown; stale or cached data must be labeled stale/cached and never presented as live
- broken internal routes, dead CTAs, missing assets, mislabeled destinations, and unverified authoritative external links are release blockers
- launch-critical internal links/assets must be checked twice: built candidate and deployed/live candidate
- official reporting, trail, closure, water, and safety destinations must resolve to the intended authoritative resource
- mobile scrolling, fixed-nav obstruction, offline/stale behavior, reconnect behavior, and geolocation fallback are release-blocking when broken
- a build/readiness PASS does not by itself establish production readiness
- the founder-approved mobile visual is an acceptance specification; approximations or substitute visuals require explicit founder approval
- production requires exact-candidate founder preview approval followed by live post-deploy verification
- when evidence is incomplete, fail closed and surface the uncertainty rather than guessing

For safety-critical/mobile launch work, the mandatory sequence is:

`approved requirement/reference → implementation → build → automated verification → rendered phone-width review → internal link/asset verification → authoritative external-link verification → offline/stale/reconnect verification where relevant → founder approval of exact candidate → deployment → live verification`

This standard is additive to all existing security, privacy, conservation, source-of-truth, and founder-alert rules and must not be weakened by a later convenience shortcut unless the founder explicitly changes this locked decision.

## Change log

- **2026-09-03 — Canonical frontend cleanup alignment:** documented `main.tsx → App.tsx → Prototype.tsx → MobileDashboard/DesktopDashboard` as the active runtime path; marked `FeatureTools`, `ApprovedDashboard`, the older `RegionalExploreEnhancer`, unused `TurnstileWidget`, and the weekly-email lifecycle as retired; preserved server-side Turnstile submission protection; recorded trail-navigation PR #43 as separate unreconciled feature work.
- **2026-08-31 — Safety-critical trust standard:** locked BaitLogic field/safety information, mobile release verification, double link/asset checks, fail-closed unknown/stale handling, founder-approved visual parity, and live post-deploy verification as mandatory production gates.
- **2026-08-28 — Camping education prominence:** locked Camping as a front-and-center education option alongside Fishing.
- **2026-08-25 — Narrative consolidation:** locked BaitLogic around four primary pillars: Fishing Intelligence, Community Knowledge, Water & Environment, and Conservation Action.
- **2026-08-25 — Architecture correction:** explicitly recorded that `mobile-app/` is production, root `public/` is deprecated as the production frontend, and the active PWA includes `mobile-app/public/sw.js`.
