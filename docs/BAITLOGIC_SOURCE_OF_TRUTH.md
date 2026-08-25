# BaitLogic — Source of Truth

Last code-aligned review: 2026-08-25 (UTC)

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

BaitLogic has **four primary pillars**. These are the organizing structure for product UX, navigation, content, marketing, community, email, partnerships, and future feature decisions.

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
- Public-write protection: Cloudflare Turnstile
- Owned-email delivery: Resend through Supabase Edge Functions
- Production deployment rule: the founder reviews the exact production candidate and explicitly approves deployment

### Active code map

- Main product UI: `mobile-app/src/Prototype.tsx` and `mobile-app/src/prototype.css`
- Feature surfaces: `mobile-app/src/FeatureTools.tsx`, `mobile-app/src/RegionalExploreEnhancer.tsx`, and related CSS
- Product data/config: `mobile-app/src/data/baitlogicData.ts`
- Runtime composition: `mobile-app/src/App.tsx`, `mobile-app/src/main.tsx`, and `mobile-app/src/mobile/`
- PWA/offline: `mobile-app/public/manifest.webmanifest` and `mobile-app/public/sw.js`
- Public submissions / Field Check photos / signup welcome and admin email: `mobile-app/supabase/functions/submit-baitlogic-signal/index.ts`
- Weekly email and unsubscribe: `mobile-app/supabase/functions/send-baitlogic-weekly/index.ts` and `unsubscribe-baitlogic-weekly/index.ts`
- Database changes: `mobile-app/supabase/migrations/`
- Verification: `mobile-app/scripts/deployment-readiness.mjs`, `mobile-app/tests/`, `.github/workflows/deployment-readiness.yml`
- Vercel mapping: root `vercel.json`

### Important correction

The root Express server and root `public/` directory are legacy/deprecated production UI. They may remain for history or old routes, but they are **not evidence of the current production implementation**.

The active PWA **does have a service worker and offline architecture**. Do not repeat the obsolete claim that offline/PWA support is absent merely because the legacy root `public/` tree does not contain the active service worker.

---

## 4. Deprecated / do not revive by assumption

- Root Express server and root `public/` as the production UI
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
- web-app manifest and service worker
- cached/last-known conditions behavior in the production UI
- device-local Field Check storage and later synchronization
- protected Field Check and weekly-signup submissions through `submit-baitlogic-signal`
- Cloudflare Turnstile and database-backed rate limiting
- approved-only community Field Check feed
- Field Check photo support in code: JPEG/PNG/WebP up to 1.5 MB, private storage path, area-only place precision, pending moderation
- signup welcome/admin delivery-attempt tracking in code
- weekly sender and unsubscribe foundations
- Facebook and Instagram CTAs
- GitHub deployment-readiness workflow
- mobile barometer location-loading fix merged
- four-column mobile quick-tool layout fix merged

### Requires verification / hardening

- Android and iPhone physical-device tests: online, offline, relaunch, typing, install, reconnect, and synchronization
- confirm current location names on real devices and rural locations
- confirm production service worker behavior and cache freshness semantics
- confirm Field Check photo upload against live storage policies
- resolve `email_not_configured` by checking active Supabase Edge Function deployment plus `RESEND_API_KEY` and `BAITLOGIC_EMAIL_FROM`
- complete one real consented welcome email + admin notification + weekly send + unsubscribe loop
- confirm all official reporting links and phone routes on production mobile devices
- continue Supabase performance/security-advisor maintenance
- maintain deliberate grants and RLS on every public table
- production monitoring remains limited by current Vercel log retention

### Planned / incomplete strategic modules

- deeper live localized water intelligence
- complete issue-specific conservation routing
- species library
- bathymetry/depth intelligence
- expanded fishing reports and community discussion
- local business/partner ecosystem
- mature email nurture/segmentation
- native Android/iOS packages only if usage justifies them
- marketplace/commerce remains later priority

---

## 7. Current code-aligned blockers and cautions

### Email delivery

Signup welcome-email and admin-notification tracking are implemented in code. `submit-baitlogic-signal` saves the subscriber first, attempts both messages, and records provider IDs/timestamps/errors.

Founder-reported production blocker from 2026-08-24: signup paths recorded `email_not_configured`. In the current function this occurs when the active Supabase Edge Function runtime is missing `RESEND_API_KEY` or `BAITLOGIC_EMAIL_FROM`.

Status remains **BLOCKED / NOT VERIFIED** until the active deployment and secret mapping are checked and a real consented signup successfully receives the welcome email while the admin notification reaches `baitlogicadmin@gmail.com`.

### Sample/live claims

Any condition card or module that is still sample/demo data must remain clearly labeled. Do not market sample values as live intelligence.

### Analytics

PostHog or any other analytics platform is not automatically a validated production dependency. Do not claim active users, retention, adoption, or behavior without real evidence.

---

## 8. Brand and experience rules — LOCKED

- Woman-owned identity is core.
- Fishing is the foundation and strongest audience entry point.
- BaitLogic is broader than fishing only where broader outdoor information strengthens the local intelligence/conservation system.
- Free knowledge, local intelligence, conservation, community sharing, and stewardship are foundational.
- Core knowledge and conservation resources stay free; no premium knowledge paywall.
- Current approved visual direction: deep navy, premium gold, warm white, and controlled spectrum/rainbow accents, with strong contrast, outdoor richness, and premium readability.
- Teal/aqua and coral may remain supporting accents where appropriate.
- Approved logo direction: ornate/fancy gold ring and anchor, no compass star/starburst behind the anchor; do not restore the rejected neon-blue swoosh.
- Avoid oppressive darkness, generic fishing-template styling, flat generic minimalism, or an artificial “AI-generated” visual feel.
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

### Stage 3 — Conversion

A consented owned email audience for deeper value delivery, community continuity, grants/donations/partner support where appropriate, and sustainable mission-aligned monetization.

Conversion does **not** mean placing core knowledge behind a paywall.

Use Hub-and-Spoke production: one strong core topic should become short video, community/social content, email, website content, and supporting graphics/data where useful.

Baseline cadence remains 3 short-form videos/week, 2 community/report posts/week, and 1 consented value email/week unless real capacity/performance evidence supports a change.

---

## 10. Security / privacy rules — LOCKED

- Never expose service-role credentials to browser code or the public repository.
- Only browser-safe values may use `VITE_*`.
- Publishable Supabase keys require correct grants and RLS.
- Never grant anonymous SELECT to private analytics, signup, moderation, or admin data simply to make frontend requests work.
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

## Change log

- **2026-08-25 — Narrative consolidation:** locked BaitLogic around four primary pillars: Fishing Intelligence, Community Knowledge, Water & Environment, and Conservation Action. Locked the system flow `Conditions → Community Knowledge → Better Fishing/Outdoor Decisions → Conservation Action`. Clarified that hiking, paddling, camping, wildlife, trails, habitat, and access are supporting categories rather than competing top-level identities. Locked `Beyond the Bite. Protect What Matters.` and `Understand the water. Learn from the community. Fish smarter. Protect what matters.` as the primary message hierarchy.
- **2026-08-25 — Architecture correction:** explicitly recorded that `mobile-app/` is production, root `public/` is deprecated, and the active PWA includes `mobile-app/public/sw.js`; this supersedes any audit conclusion based only on the legacy root tree that claimed service-worker/offline architecture was absent.
- **2026-08-24 — AI/code context alignment:** recorded Field Check photo implementation, signup welcome/admin delivery tracking, the `email_not_configured` blocker, merged barometer location-loading fix, active code map, visual-direction reconciliation, funnel cadence, and runtime conflicts.
