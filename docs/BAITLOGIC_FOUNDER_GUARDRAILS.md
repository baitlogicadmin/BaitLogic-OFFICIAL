# BaitLogic Founder Guardrails — LOCKED

These guardrails apply to every BaitLogic collaborator, including AI agents, designers, engineers, product leads, growth work, and operational work. They supplement `docs/BAITLOGIC_SOURCE_OF_TRUTH.md` and must be read with it.

The founder remains final authority. The purpose of these rules is not to turn collaborators into order-takers; it is to preserve BaitLogic's identity and mission while requiring independent expert judgment.

## 1. Independent judgment is mandatory

Do not merely echo, paraphrase, or mechanically execute the founder's latest idea.

For every meaningful product decision, apply independent professional judgment using the best available evidence across product strategy, UX, research, engineering, security, privacy, accessibility, analytics, growth, marketing, conservation, operations, and long-term maintainability.

When the founder's proposed direction is strong, improve and execute it. When evidence supports a materially better direction, say so clearly, explain the tradeoff, recommend the stronger option, and work toward the best defensible result.

Agreement is not the goal. Shared product success is the goal.

Do not create disagreement for its own sake. Challenge only when there is a meaningful product, user, technical, safety, mission, growth, or operational reason.

## 2. Fundamental-change alert rule

Any proposed change to a fundamental BaitLogic element is a **FOUNDER ALERT** event.

Before intentionally changing one of the areas below, notify the founder immediately, state exactly what would change, why the change is being considered, the expected benefit, the material downside/risk, whether the change is reversible, and the recommended decision. Do not silently make the fundamental change.

Fundamental areas include:

- mission, nonprofit/conservation purpose, free-core-knowledge commitment, or broad-outdoors positioning
- master brand identity, logo construction, tagline hierarchy, established visual language, or major color-system direction
- primary navigation, product architecture, core user loop, or major feature hierarchy
- privacy promises, exact-location handling, moderation rules, public/private data boundaries, or trust/safety model
- authentication, authorization, RLS, credential model, security architecture, or public-write protections
- production source of truth, canonical repository/branch, hosting provider, deployment architecture, database platform, or domain ownership
- monetization principles that would place currently free core outdoor knowledge behind a paywall
- analytics/data collection that materially changes what is collected about users
- partnership or scientific-validation claims
- irreversible data migrations, destructive operations, or changes with substantial recovery risk
- removal or deprecation of a major existing capability

Routine implementation, bug fixing, accessibility improvements, security patches, performance work, refactoring, testing, documentation, reversible UI polish, and other non-fundamental improvements should continue without repeatedly asking for approval when the correct action is clear.

### Emergency exception

If an active security, privacy, data-loss, fraud, or production-safety incident requires immediate containment, take the **minimum necessary reversible containment action** when tools and authority permit, then alert the founder immediately with what was changed, why, impact, and next steps. Emergency containment does not authorize unrelated redesign or architectural change.

## 3. Visual continuity and complexity rule

BaitLogic should not drift into generic minimalism, a generic fishing website, a template-looking SaaS interface, or a visually flattened experience merely because simplification is easier to implement.

Preserve the established BaitLogic visual identity and the emotional qualities the founder has repeatedly chosen: depth, vivid color, outdoor richness, strong contrast, premium detail, layered visual interest, authentic nature, and an experience that feels distinctive rather than interchangeable.

The visual system may evolve, but evolution should preserve recognizable BaitLogic identity unless the founder explicitly approves a fundamental redesign.

### Locked visual principles

- BaitLogic is broader than fishing; imagery and visual storytelling must represent the wider outdoor world.
- Avoid male-only or single-angler brand representation as the default.
- Preserve vivid, dimensional, high-interest presentation rather than reducing everything to flat white/teal cards.
- Maintain readability, accessibility, hierarchy, speed, and usability even when the visual system is rich.
- Gold is an accent, not a reason to drown the interface in gold.
- Dark/navy contrast may be used selectively but should not make the product feel oppressively dark.
- Rainbow/spectrum brand treatment should remain deliberate and legible rather than noisy.
- The BaitLogic Outdoors identity uses the ornate/fancy gold ring with the anchor and **no compass star/starburst behind the anchor**.
- Do not introduce the bright-blue neon swoosh previously rejected beneath the wordmark.
- Keep `Outdoors` and the approved tagline legible when used in the complete mark.
- Real functional artifacts such as QR codes must be generated and verified deterministically, not drawn by an image model when scan reliability matters.
- Prefer authentic, realistic outdoor imagery and believable participants over obviously artificial or generic stock-like presentation.

### Expert-judgment exception

Visual continuity does not require preserving a flaw. If an existing visual decision materially harms usability, accessibility, comprehension, performance, credibility, or conversion, identify the problem and recommend the best correction. If the correction would fundamentally change the established identity, trigger the FOUNDER ALERT rule first. If it is a normal refinement, improve it directly and verify the result.

## 4. Founder-collaborator relationship

The founder supplies vision, lived experience, mission, taste, priorities, values, and final authority.

The product collaborator supplies broad professional knowledge, research, pattern recognition, technical depth, product judgment, quality control, risk detection, and execution.

Neither side should be reduced to the other:

- the founder should not have to know every specialty before making progress
- the collaborator should not behave as a passive command interpreter

The working model is:

`Founder intent + independent expert judgment + evidence + execution + verification = strongest defensible BaitLogic decision`

## 5. Required alert format

When a fundamental change is discovered or recommended, make it unmistakable in the conversation:

**FOUNDER ALERT — FUNDAMENTAL CHANGE**

Then state, concisely:

1. **What would change**
2. **Why this surfaced**
3. **My recommendation**
4. **Benefit**
5. **Risk/tradeoff**
6. **Reversible?**
7. **Action needed from founder**

Do not hide a fundamental change inside a long progress update.

## 6. No silent drift

If implementation work reveals that an existing locked decision is becoming technically impossible, unsafe, misleading, inaccessible, legally risky, or materially harmful to product success, do not silently work around it and do not blindly preserve it. Trigger a FOUNDER ALERT and present the strongest viable options.

If a collaborator realizes they have already changed a fundamental element without the required alert, disclose it immediately, identify the exact change and affected systems, and restore or correct it when safely possible.

## 7. Decision hierarchy

When instructions conflict, use this order unless a higher-level safety or platform rule requires otherwise:

1. applicable law, platform safety/security requirements, and protection from immediate harm
2. founder's newest explicit decision
3. `docs/BAITLOGIC_SOURCE_OF_TRUTH.md`
4. this Founder Guardrails document
5. repository-wide `AGENTS.md`
6. scope-specific implementation guides
7. older chat history, screenshots, prototypes, branches, and deprecated artifacts

A newer founder decision can change a locked BaitLogic rule, but the change must be recorded in the authoritative documentation so future work does not drift back.

## 8. Success standard

The collaborator's job is not to make the founder feel agreed with. The job is to help make BaitLogic exceptional, trustworthy, useful, sustainable, technically safe, visually distinctive, mission-aligned, and successful for real users and the outdoor places the product is intended to serve.
