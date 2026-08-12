# BaitLogic — Source of Truth

Last verified: 2026-08-12 (America/Chicago)

This file is the authoritative handoff for humans and AI collaborators. When project facts conflict with older notes, screenshots, chats, ZIPs, branches, or deprecated infrastructure, this file and the current `main` branch take precedence unless the founder explicitly changes a locked decision.

## North Star

BaitLogic is a woman-owned, community-driven outdoor intelligence and conservation platform. It is rooted in fishing but built for the wider outdoor community. The product should help people understand current conditions, make better decisions outdoors, share useful knowledge, protect natural resources, and preserve practical knowledge for future generations.

Core knowledge and conservation information must remain accessible without a paywall.

## Locked infrastructure

- Canonical repository: `baitlogicadmin/BaitLogic-OFFICIAL`
- Authoritative branch: `main`
- Production host: Vercel
- Vercel project: `bait-logic-official`
- Production domains: `bait-logic.com` and `www.bait-logic.com`
- Current server framework: Node.js + Express
- Current data platform: Supabase
- Active Supabase project ref: `gibaaxzltpdizayvicgf`
- Live weather/pressure source used by Barometer: Open-Meteo
- Weather alerts: National Weather Service
- Water observations: USGS Water Data for the Nation where available

## Deprecated / do not revive by assumption

- `baitlogic.org` as the primary domain
- Name.com as current infrastructure
- Cloudflare Workers / Wrangler as required production infrastructure
- Older ZIP snapshots as a source of truth
- `baitlogicadmin/BaitLogic` as the canonical repository
- Older Supabase project references that conflict with `gibaaxzltpdizayvicgf`
- React-first architecture descriptions that conflict with the current Express/static implementation

Legacy files can remain temporarily for forensic/history purposes, but collaborators must not treat their presence as evidence that the legacy system is active.

## Product status labels

Use only these labels:

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

- Express production application
- Static mobile-first web UI under `public/`
- Production deployment from GitHub `main` to Vercel
- `bait-logic.com` and `www.bait-logic.com` attached to the Vercel project
- Health endpoint
- Community report read/write API
- Public catch read/write API
- Signup capture API
- Nature-Check submission and approved-feed API
- Barometer live snapshot endpoint using Open-Meteo + NWS alerts
- USGS water snapshot endpoint
- Offline-first/service-worker work across current public features
- Facebook and Instagram CTAs in current conservation campaign work

### Requires continuing verification / hardening

- Every offline path must be tested on real mobile devices and poor/no connectivity
- Community writes must be tested end-to-end against production Supabase policies
- Signup capture must be connected to a reliable owned-email automation workflow before calling the conversion funnel complete
- Admin access must remain unavailable unless a real `ADMIN_KEY` is configured
- Barometer must continue to be tested for location, current-day timing, pressure trend accuracy, stale-cache behavior, and failure states
- Analytics collection must never require anonymous read access to analytics data

### Planned / incomplete strategic modules

- Complete conservation reporting center with official agency routing
- Species library
- Bathymetry/depth intelligence
- Expanded community platform
- Local business/partner ecosystem
- Automated email nurture and segmentation
- Marketplace/commerce (later priority)

## Security rules

- Never expose service-role credentials to browser code or the public repository.
- Publishable Supabase keys may only be used with correct grants and RLS policies.
- Do not grant anonymous SELECT access to private analytics, signup, moderation, or admin data just to make an endpoint work.
- `ADMIN_KEY` must come from the production environment; there is no insecure fallback value.
- Treat Supabase security advisor warnings as imperative defects unless there is a documented reason not to.
- Validate and rate-limit public write endpoints.
- Do not present community submissions as official agency reports.

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
- Mission-facing extension currently used on the website: `Protect What Matters.`
- Supporting statement: `Powered by People and Purpose.`

Do not merge or replace these casually; treat them as a hierarchy unless the founder explicitly changes it.

## Funnel architecture — locked

1. Attraction — short-form vertical outdoor/fishing content (Reels, TikTok, Shorts)
2. Retention — BaitLogic tools, reports, conservation, community intelligence and deeper discussion
3. Conversion — owned email audience for deep value, alerts, partner opportunities and sustainable monetization

Use Hub-and-Spoke production: one strong core topic should be repurposed into short video, social/community post, email, website content, and supporting graphics/data when useful.

## Execution rule — locked

For anything imperative to BaitLogic structure, security, accuracy, reliability, deployment, data integrity, or outcome, proceed without waiting for routine approval when the correct action is reasonably clear.

Operating sequence:

`Requirement → best defensible decision → implementation → verification → deployment → documentation`

Stop only when a choice is genuinely subjective, high-risk/irreversible, legally consequential, requires unavailable credentials/information, or multiple materially different options cannot be resolved from evidence.

## Quality rule — locked

Every collaborator must self-critique before delivery and put forward the strongest defensible version first. Do not knowingly hand off placeholder-quality work, avoidable ambiguity, unverified claims, or a weaker option simply to move faster.

Perfection cannot be guaranteed, but the working standard is maximum practical quality: research where needed, challenge assumptions, test important behavior, correct defects proactively, and clearly distinguish what is known from what is inferred.

## Change-management rule

When an imperative project fact changes, update this file in the same workstream. Do not create competing memory documents.

Record:

- what changed
- why
- status
- affected system/location
- exact date

The goal is one living source of truth, not accumulating contradictory handoff documents.
