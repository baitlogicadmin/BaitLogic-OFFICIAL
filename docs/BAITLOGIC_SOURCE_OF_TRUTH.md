# BaitLogic — Source of Truth

Last verified: 2026-08-21 (UTC)

This file is the authoritative handoff for humans and AI collaborators. When project facts conflict with older notes, screenshots, chats, ZIPs, branches, or deprecated infrastructure, this file and current `main` take precedence unless the founder explicitly changes a locked decision.

Operational detail lives in the root [`BAITLOGIC_INDEPENDENCE_PACK.md`](../BAITLOGIC_INDEPENDENCE_PACK.md).

## North Star

BaitLogic is a woman-owned, community-driven outdoor intelligence and conservation platform. It is rooted in fishing but built for the wider outdoor community. The product should help people understand current conditions, make better decisions outdoors, share useful knowledge, protect natural resources, and preserve practical knowledge for future generations.

Core knowledge and conservation information must remain accessible without a paywall.

## Locked infrastructure

- Canonical repository: `baitlogicadmin/BaitLogic-OFFICIAL`
- Authoritative branch: `main`
- Production source: `mobile-app/`
- Current frontend: Vite + React + TypeScript progressive web app
- Production host: Vercel
- Vercel project: `bait-logic-official`
- Production domains: `bait-logic.com` and `www.bait-logic.com`
- Current data platform: Supabase
- Active Supabase project ref: `gibaaxzltpdizayvicgf`
- Public-write protection: Cloudflare Turnstile
- Owned-email delivery: Resend through Supabase Edge Functions
- Production change rule: founder reviews the exact preview and explicitly approves deployment

## Deprecated / do not revive by assumption

- Root Express server and root `public/` as the production UI
- Simulated phone/device frames in the runtime UI
- `baitlogic.org` as the primary domain
- Name.com as current infrastructure unless reconfirmed by the founder
- Cloudflare Workers / Wrangler as required production infrastructure
- Older ZIP snapshots as a source of truth
- `baitlogicadmin/BaitLogic` as the canonical repository
- Older Supabase project references that conflict with `gibaaxzltpdizayvicgf`
- Native App Store/Play Store claims: the current product is a PWA, not native store binaries

Legacy files can remain for tests and history, but their presence is not evidence that they are active.

## Product status labels

- IDEA — concept only
- PLANNED — approved but not yet built
- IN DEVELOPMENT — actively being built
- IMPLEMENTED — code exists
- VERIFIED — behavior has been tested successfully
- DEPLOYED — verified in production
- LOCKED — approved source-of-truth decision
- DEPRECATED — must not be revived without an explicit decision

Never call a feature verified or deployed based only on code or a successful build.

## Current product reality

### Implemented / deployed foundation

- Responsive Vite/React PWA from `mobile-app/`
- GitHub `main` to Vercel production deployment
- `bait-logic.com` and `www.bait-logic.com` attached to the Vercel project
- Installable web-app manifest and service worker
- Device-local Field Check storage and later synchronization
- Protected Field Check and weekly-signup submissions through `submit-baitlogic-signal`
- Cloudflare Turnstile verification and database-backed rate limits
- Approved-only community Field Check feed
- Weekly sender and unsubscribe Edge Function foundations
- Facebook and Instagram CTAs
- GitHub pull-request readiness workflow

### Requires continuing verification / hardening

- Android and iPhone physical-device tests: online, offline, relaunch, typing, install, and reconnect synchronization
- One real consented welcome email, authorized weekly send, and one-click unsubscribe loop
- Supabase performance-advisor maintenance backlog
- Each new public table must have deliberate grants and RLS; never expose private data to make a frontend request work
- Current condition cards are labeled sample conditions; do not market them as live intelligence until connected and verified
- Runtime monitoring is limited by the current Vercel log-retention plan

### Planned / incomplete strategic modules

- Live localized conditions replacing sample cards
- Complete conservation reporting center with official agency routing
- Species library
- Bathymetry/depth intelligence
- Expanded community platform
- Local business/partner ecosystem
- Mature email nurture and segmentation
- Native Android/iOS store packages, only if usage justifies them
- Marketplace/commerce (later priority)

## Security rules

- Never expose service-role credentials to browser code or the public repository.
- Only browser-safe values may use the `VITE_*` prefix.
- Publishable Supabase keys may be used only with correct explicit grants and RLS policies.
- Do not grant anonymous SELECT access to private analytics, signup, moderation, or admin data.
- Treat Supabase security advisor warnings as defects unless a documented service-only design explains them.
- Validate and rate-limit public writes.
- Do not present community submissions as official agency reports.
- Secret values belong in Vercel or Supabase secret stores, never GitHub or screenshots.

## Brand / mission rules

- Woman-owned identity is core.
- BaitLogic serves fishing plus the broader outdoor community.
- Free knowledge, local intelligence, conservation, community sharing, and stewardship are foundational.
- Brand direction: bright teal/aqua, clean water-inspired blues, coral accents, strong contrast, premium but approachable.
- Avoid dark forest-green dominance and generic fishing-page styling.
- Use authentic outdoor imagery; women anglers should be represented prominently.
- Do not default to male-only angler imagery.

### Brand language hierarchy

- Master brand line: `Beyond the Bite.`
- Mission-facing extension: `Protect What Matters.`
- Supporting statement: `Powered by People and Purpose.`

## Funnel architecture — locked

1. Attraction — short-form vertical outdoor/fishing content
2. Retention — useful BaitLogic tools, reports, conservation, and community intelligence
3. Conversion — an owned, consented email audience

Use Hub-and-Spoke production: one strong core topic should become short video, social/community content, email, website content, and supporting graphics/data where useful.

## Execution and quality rules — locked

Use this operating sequence:

`Requirement → best defensible decision → implementation → verification → founder preview approval → deployment → documentation`

Proceed without routine approval for reversible repository work when the correct action is clear. Stop for subjective, high-risk, irreversible, legal, credential-dependent, or production-deployment decisions. The founder must approve the exact production candidate.

Every collaborator must self-critique before delivery. Do not hand off placeholder-quality work, avoidable ambiguity, unverified claims, or a weaker option simply to move faster.

## Change-management rule

When an imperative project fact changes, update this file and the Independence Pack in the same workstream. Do not create competing memory documents.

Record what changed, why, status, affected system/location, and exact date. The goal is one living source of truth.
