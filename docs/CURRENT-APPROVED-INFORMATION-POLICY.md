# BaitLogic Current + Approved Information Policy

**Status:** Mandatory release governance  
**Applies to:** production, preview, desktop, mobile/PWA, online, offline, documentation, generated design references, and AI-assisted implementation.

## Core invariant

> **Current + verified + approved, or it does not ship.**

Only information that is both current and explicitly approved may appear in BaitLogic.

## Permanently excluded from active use

The following must not be reused, restored, resurfaced, or silently reintroduced:

- rejected visual concepts
- rejected informational panels
- outdated or superseded facts
- stale screenshots treated as current
- speculative or inferred claims
- placeholder values
- fabricated reports, catches, weather, water, community, or performance data
- old copy that has been replaced by newer approved copy
- cached content that no longer meets approval or accuracy requirements
- old mockups used as implementation references after they have been rejected

If any of the above is discovered in code, cache, documentation, preview artifacts, design references, or fallback content, it must be removed from active use.

## Approval rule

A visual, content, data, or architectural change must not be treated as approved merely because it was generated, coded, committed, previewed, or deployed.

Explicit approval is required before a material visual change becomes the new canonical design.

## Accuracy rule

When information cannot be verified as current:

- show it as unavailable, unknown, or cached
- show the last verified timestamp when appropriate
- never guess
- never fabricate continuity
- never convert an assumption into a displayed fact

## Offline rule

Offline mode must:

- preserve the approved visual design
- use only the last verified approved data available on-device
- display a clear offline/cached state
- preserve the timestamp of the last verified data
- queue eligible user submissions safely for later sync
- never substitute fabricated values for unavailable live data

## Cross-platform rule

The same approved information policy applies to:

- desktop
- mobile
- PWA
- online mode
- offline mode
- educational content
- barometer/weather/water surfaces
- community/report surfaces
- social and marketing surfaces
- documentation
- deployment references
- AI-assisted design/build instructions

## Supersession rule

When a newer approved source replaces an older source:

1. the newer approved source becomes canonical;
2. the older source becomes invalid for future implementation;
3. the older source must not be reintroduced through copied code, cached assets, screenshots, documentation, migrations, or generated designs.

## Release-gate expectation

Release checks should fail when required current/approved sources are missing or when clearly rejected/superseded content is detected in a production path.

## Visual lock

The current founder-approved BaitLogic desktop design is the canonical visual reference. Mobile and offline states must be responsive/state adaptations of that same design, not independent redesigns.

No material visual change may be deployed without explicit founder approval.
