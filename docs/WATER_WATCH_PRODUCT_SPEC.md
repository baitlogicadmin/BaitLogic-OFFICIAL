# BaitLogic Water Watch — Product & Governance Specification

Status: **IN DEVELOPMENT** on `feature/water-watch-foundation`

Last source verification: **2026-08-22**

## Purpose

BaitLogic Water Watch turns environmental policy, official agency information, local outdoor conditions, and community observations into practical conservation intelligence for people who are actually on the water and in the field.

It is intentionally **nonpartisan and source-first**. BaitLogic may explain what a law, bill, permit rule, contamination issue, or conservation action means for anglers and outdoor users, but it must not convert source material into political endorsements.

Core promise:

> Government and scientific source → plain-language field meaning → safe observation → correct official reporting route → community follow-up → long-term waterbody knowledge.

## Why this belongs in BaitLogic

The current BaitLogic source of truth already defines conservation, local intelligence, free knowledge, field reporting, offline usefulness, and community stewardship as foundational. Water Watch connects those foundations into one durable system rather than another isolated conservation page.

## Product principles

1. **Official facts stay official facts.** Every legal/status claim must carry a source and a verification date.
2. **BaitLogic interpretation is labeled.** Plain-language summaries are never presented as agency language.
3. **Community reports are not government reports.** The UI must continue to say when a user still needs to contact an official agency.
4. **Exact spots stay private by default.** Public community intelligence uses general-area locations only.
5. **Offline still works.** The last verified Water Watch package should remain readable without connectivity.
6. **No fearbait.** Conservation information should be useful enough to act on without sensational wording.
7. **No political score manipulation.** Legislator voting records may be displayed when sourced, but BaitLogic does not endorse parties or candidates.
8. **Free conservation access.** Core Water Watch intelligence is not paywalled.

## Trust labels

Every Water Watch item must display one of these trust states:

- `OFFICIAL · CURRENT` — current information verified directly against an official government source.
- `SOURCE SUMMARY` — BaitLogic plain-language summary of a named source.
- `COMMUNITY · PENDING` — private/submission state awaiting moderation.
- `COMMUNITY · APPROVED` — community observation approved for general-area display.
- `SAVED OFFLINE` — previously verified information stored on the device; the saved timestamp is visible.
- `NEEDS RECHECK` — source is old, changed, unreachable, or status cannot be confirmed.

No item may silently move from one state to another.

## Initial Illinois Water Watch topics

### 1. Plastic pellets in stormwater — HB4418 / Public Act 104-0772

**Official status verified 2026-08-22:** Governor approved 2026-08-07; Public Act 104-0772; effective 2027-01-01.

Official ILGA source:
`https://www.ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB4418.html`

Official public act:
`https://ilga.gov/Legislation/PublicActs/View/104-0772`

Field meaning: Illinois is requiring development and implementation of stormwater pollution-prevention requirements addressing plastic pellets or other preproduction plastic materials for covered facilities.

BaitLogic action path:
- Teach users what preproduction plastic pellets look like.
- Allow a general-area `Water` or `Conservation` Field Check.
- Route pollution complaints to Illinois EPA.
- Never imply that a BaitLogic Field Check itself notifies Illinois EPA.

### 2. PFAS wastewater monitoring — SB3917 / Public Act 104-0747

**Official status verified 2026-08-22:** Governor approved 2026-07-31; Public Act 104-0747; effective 2027-01-01.

Official ILGA source:
`https://ilga.gov/Legislation/BillStatus?DocNum=3917&DocTypeID=SB&GAID=18&LegId=167376&SessionID=114`

Field meaning: the law adds PFAS-related wastewater sampling and characterization requirements to parts of Illinois' NPDES permitting framework.

BaitLogic action path:
- Track official implementation information when Illinois EPA publishes it.
- Explain what is known and what remains unknown at a specific waterbody.
- Never infer that PFAS is present in a lake, river, or stream without actual source data.

### 3. PFAS Wastewater Citizen Protection Act — HB2955

**Official status verified 2026-08-22:** passed both houses and was sent to the Governor on 2026-06-26. Current ILGA material available to BaitLogic did not yet show a Public Act number at verification time.

Official ILGA source:
`https://www.ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB2955.html`

Field meaning: the enrolled legislation creates a PFAS Wastewater Citizen Protection Committee and PFAS Action Plan process if it becomes law.

BaitLogic rule: display this as `AWAITING FINAL STATUS CHECK` until the official ILGA record changes. Do not describe it as enacted unless verified.

### 4. Mute swans — HB5309 / Public Act 104-0794

**Official status verified 2026-08-22:** Governor approved 2026-08-07; Public Act 104-0794; effective 2028-01-01.

Official ILGA source:
`https://ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB5309.html`

Field meaning: the legislation changes treatment of mute swans under the Illinois Wildlife Code. BaitLogic should focus on correct species identification, wetland/ecosystem context, and official IDNR guidance rather than encouraging users to handle wildlife themselves.

## Source provenance

The first Water Watch content set is derived from the **Illinois Environmental Council 2026 Environmental Scorecard** supplied to BaitLogic, then current legal status is checked against official Illinois General Assembly records before BaitLogic presents a current status.

The IEC scorecard describes, among other topics:
- HB2955 — PFAS Task Force / wastewater action-plan work.
- HB4418 — plastic pellet pollution controls for waterways.
- HB5309 — mute swan management under the Wildlife Code.
- SB3917 — PFAS testing tied to wastewater discharge permits.

The IEC document is an advocacy/public-education source, not the controlling legal record. **ILGA is the status authority for Illinois legislation.** Agency pages are the authority for reporting instructions and implementation guidance.

## V1 experience

Water Watch V1 should provide a compact entry point from the main BaitLogic experience and a full-screen/mobile sheet containing:

1. **What changed** — short sourced status.
2. **Why it matters outdoors** — BaitLogic field translation.
3. **What not to assume** — uncertainty guardrail.
4. **What you can do** — official agency route and optional BaitLogic Field Check.
5. **Source & checked date** — visible, not buried.

V1 is read-only conservation intelligence. It does **not** require a new public-write table.

## V2 — Follow My Water

A user can follow one or more named waterbodies and receive a consented email only when meaningful information changes.

Examples:
- new official advisory;
- confirmed pollution-response information;
- verified invasive-species notice;
- important waterbody access/regulation change;
- significant Water Watch legislation/implementation change;
- high-value BaitLogic community pattern after moderation.

Do not send exact community report coordinates in email.

### Proposed private data model

`water_follows`
- `id uuid`
- `email_hash or authenticated owner_id`
- `waterbody_id`
- `consent_at`
- `status`
- `created_at`

`water_watch_items`
- `id uuid`
- `jurisdiction`
- `topic_type`
- `title`
- `plain_summary`
- `source_url`
- `source_authority`
- `source_updated_at`
- `verified_at`
- `trust_state`
- `effective_at`
- `expires_at`

`water_watch_waterbody_links`
- `water_watch_item_id`
- `waterbody_id`
- `relationship`
- `confidence`

No public write grants. Public reads should expose only approved, publishable records through deliberate RLS or a controlled view. Subscription identity remains private/service-only.

## Security & privacy controls

Water Watch inherits and strengthens the existing BaitLogic rules:

- No `service_role` key in browser code.
- Public writes stay behind validated Edge Functions.
- Turnstile/rate limiting remain mandatory for anonymous submissions.
- New Supabase tables start closed: explicit grants + RLS before use.
- Community observations remain moderation-first.
- Public location precision remains general-area only.
- Never expose email lists, moderation queues, admin metadata, IP-derived fingerprints, or private analytics.
- Cache only public Water Watch content for offline use.
- Source URL, source authority, and verification timestamp are required fields for publishable legal/policy items.
- Any stale or unreachable source becomes `NEEDS RECHECK`; stale data is never silently displayed as current.

## Accuracy gate

A Water Watch legal/policy item cannot be labeled `OFFICIAL · CURRENT` unless all are true:

- source hostname is an approved authority;
- status was fetched or manually checked against that authority;
- `verified_at` is present;
- summary matches the official record;
- effective date is not guessed;
- BaitLogic interpretation is separated from official status;
- links resolve;
- no claim suggests a community report was sent to government.

For Illinois legislation, approved status authority begins with `ilga.gov` / `my.ilga.gov`.

## Moderation & safety

Water Watch should never encourage confrontation, trespass, handling hazardous material, or handling wildlife. The current BaitLogic reporting language — document safely, use a general location, contact the correct agency, do not confront — remains the standard.

For spills, fish kills, suspicious discharge, poaching, or other reportable events, official agency reporting should be visually clearer than the optional community Field Check.

## Long-term architecture

The strategic endpoint is a **BaitLogic Water Health Network**:

`Waterbody → live conditions → official advisories → source-verified policy → moderated field observations → reporting routes → historical pattern → conservation actions → consented alerts`

The network should eventually support multiple states while keeping jurisdiction-specific agencies and legal records separate.

## Ownership / continuity safeguards

- Canonical code remains in `baitlogicadmin/BaitLogic-OFFICIAL`.
- Product requirements remain inside the repository rather than only in chat history.
- Water Watch changes should enter `main` through reviewed pull requests and the existing deployment-readiness gate.
- Production deployment still requires founder approval of the exact preview.
- A source registry and verification date must travel with every future conservation data package.
- No external vendor should become the sole holder of essential BaitLogic conservation knowledge.

## Legal/IP decision intentionally NOT made here

The repository is public and currently does not show a root software `LICENSE` file. Choosing a software/content license, trademark strategy, nonprofit structure, or formal intellectual-property assignment is a legal decision and must not be silently decided by an engineering change.

Track those as explicit founder/legal decisions before adding a license or making exclusivity claims.

## Acceptance criteria for V1

- [ ] Water Watch is accessible from the production PWA on mobile.
- [ ] Four initial Illinois topics render with a visible source and checked date.
- [ ] HB2955 is not misrepresented as enacted while official status remains unresolved.
- [ ] Official agency reporting remains separate from BaitLogic Field Checks.
- [ ] Water Watch remains useful when offline using a timestamped cached copy.
- [ ] No exact user location is exposed by Water Watch.
- [ ] Keyboard and screen-reader users can open, navigate, and close the experience.
- [ ] Existing mobile runtime tests pass.
- [ ] New Water Watch interaction tests pass.
- [ ] Vercel preview is reviewed by the founder before merge/deployment.
