# BaitLogic Independence Pack

Last code-aligned review: 2026-08-24 (UTC)

Last full production-readiness verification recorded here: 2026-08-21 (UTC)

This is the owner-first operating manual for BaitLogic. Its purpose is simple: the founder must be able to recover, test, hand off, and deploy the product without paying for a particular AI, developer, or project-management add-on.

This document is public-safe. It names secret variables but never contains secret values.

## Owner alert — email delivery blocker recorded 2026-08-24

The current signup code saves the subscriber, then attempts a welcome email and an admin notification to `baitlogicadmin@gmail.com`. The founder reported that both delivery fields recorded `email_not_configured` in production.

In the current `submit-baitlogic-signal` code, that exact value is written only when the active Edge Function runtime does not have both `RESEND_API_KEY` and `BAITLOGIC_EMAIL_FROM`. The smallest safe verification path is:

1. In Supabase project `gibaaxzltpdizayvicgf`, confirm both secret names exist for Edge Functions without exposing their values.
2. Confirm `submit-baitlogic-signal` is deployed from the current repository version.
3. Confirm the Resend sender in `BAITLOGIC_EMAIL_FROM` is verified and allowed to send to the intended addresses.
4. Submit one real, consented test signup.
5. Confirm the subscriber receives the welcome email, `baitlogicadmin@gmail.com` receives the admin notification, and `weekly_signups` records sent timestamps/provider IDs with cleared errors.

Until all five succeed, email delivery is **BLOCKED / NOT VERIFIED**. Do not change browser security, RLS, or public database access to fix this server-side configuration problem.

## The five facts that prevent most mistakes

1. The canonical source is [`baitlogicadmin/BaitLogic-OFFICIAL`](https://github.com/baitlogicadmin/BaitLogic-OFFICIAL), branch `main`.
2. The production app is the Vite/React progressive web app in `mobile-app/`.
3. Vercel hosts production at [www.bait-logic.com](https://www.bait-logic.com/).
4. Supabase project `gibaaxzltpdizayvicgf` provides the database and Edge Functions.
5. Nobody deploys to production until the founder has reviewed the preview and explicitly approved it.

The root Express server and `public/` directory are legacy. They remain for history and legacy tests; they are not the current production UI.

## What exists today

| Capability | Honest status |
|---|---|
| Mobile web app | DEPLOYED as a responsive PWA |
| Android installation | Available through the browser's **Install app/Add to Home screen** flow; not a Play Store binary |
| iPhone installation | Available through Safari's **Add to Home Screen** flow; not an App Store binary |
| Offline shell | IMPLEMENTED through `manifest.webmanifest` and `sw.js` |
| Offline Field Checks | IMPLEMENTED: unsent checks persist on the device and retry when connected |
| Production build | VERIFIED on 2026-08-21: Vercel READY and readiness script PASS 10/10 |
| Supabase backend | ACTIVE_HEALTHY on 2026-08-21 |
| Field Check submission | IMPLEMENTED through `submit-baitlogic-signal`, Turnstile, rate limits, moderation, and area-only location precision |
| Field Check photos | IMPLEMENTED END-TO-END IN CODE: active camera/gallery UI, validation/compression, IndexedDB offline queue, retry-aware upload, private `nature-checks` storage, and moderation; automated/live physical-device verification still required |
| Approved community notes | IMPLEMENTED through the `field_checks` approved feed |
| Weekly signup | IMPLEMENTED through the same protected Edge Function; the subscriber record is saved before email attempts |
| Welcome/admin email delivery | BLOCKED / NOT VERIFIED on 2026-08-24: founder reported `email_not_configured`; verify active function deployment and Supabase email secrets |
| Weekly email/unsubscribe | Code exists; one authorized live send and one-click unsubscribe test remain human release gates |
| Barometer mobile location fix | IMPLEMENTED/MERGED at `a8885f2`; live mobile production verification still required |
| Main conditions cards | Active code requests current location-based weather, labels successful responses live, labels stored responses saved/offline, and shows honest blanks on failure; physical-device production verification remains required |
| Native Android/iOS store apps | NOT BUILT |
| Real-device offline verification | REQUIRED before claiming full Android/iPhone offline support |

## System map

```text
GitHub main
    |
    | merge after founder approval
    v
Vercel build -> Vite/React PWA -> bait-logic.com
                                  |
                                  | publishable client key only
                                  v
                              Supabase
                         database + Edge Functions
                           |                  |
                           v                  v
                 Cloudflare Turnstile      Resend
                 verifies public writes    sends owned email
```

## Repository map

| Path | Purpose | Status |
|---|---|---|
| `mobile-app/src/` | Current React product code | ACTIVE |
| `mobile-app/public/manifest.webmanifest` | PWA install metadata | ACTIVE |
| `mobile-app/public/sw.js` | Offline shell and asset caching | ACTIVE |
| `mobile-app/supabase/migrations/` | Versioned database changes | ACTIVE |
| `mobile-app/supabase/functions/` | Supabase Edge Functions | ACTIVE |
| `mobile-app/scripts/deployment-readiness.mjs` | Automated production-readiness gate | ACTIVE |
| `mobile-app/DEPLOYMENT_READINESS.md` | Release requirements | ACTIVE |
| `vercel.json` | Vercel install/build/output configuration | ACTIVE |
| `.github/workflows/deployment-readiness.yml` | Pull-request readiness check | ACTIVE |
| `.github/workflows/create-release-zip.yml` | Owner-downloadable release ZIP workflow | ACTIVE |
| `.github/copilot-instructions.md` | Thin GitHub AI adapter pointing to the authoritative doctrine, source of truth, guardrails, code map, and release rules | ACTIVE after the AI-context PR is merged |
| `server.js`, root `public/`, root `.env.example` | Earlier Express/static system | LEGACY—do not revive by assumption |

## Account and ownership map

The founder should control recovery email, password, and two-factor authentication for every service below.

| Service | What it controls | Direct link |
|---|---|---|
| GitHub | Source, history, issues, pull requests, release ZIPs | [Repository](https://github.com/baitlogicadmin/BaitLogic-OFFICIAL) |
| Vercel | Builds, previews, production domains, rollback | [Project dashboard](https://vercel.com/cosmiccreation/bait-logic-official) |
| Supabase | Database, policies, migrations, functions, backups | [Project dashboard](https://supabase.com/dashboard/project/gibaaxzltpdizayvicgf) |
| Cloudflare Turnstile | Human/bot verification for public forms | [Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) |
| Resend | Welcome and weekly email delivery | [Resend dashboard](https://resend.com/home) |
| Domain registrar/DNS | `bait-logic.com` ownership and DNS | Record the current registrar in the private worksheet below |

### Private owner worksheet — never commit completed values

Keep the completed copy in a password manager or secure offline file, not GitHub.

- [ ] GitHub recovery email and 2FA recovery codes stored
- [ ] Vercel recovery email and 2FA recovery codes stored
- [ ] Supabase recovery email and 2FA recovery codes stored
- [ ] Cloudflare recovery email and 2FA recovery codes stored
- [ ] Resend recovery email and 2FA recovery codes stored
- [ ] Domain registrar, account ID, renewal date, and recovery method recorded
- [ ] Payment method and renewal alerts recorded for any paid service
- [ ] One trusted emergency contact knows where the recovery record is stored

## Secrets and environment variables

### Vercel: browser-safe values only

Set these for Production and Preview:

| Variable | Purpose | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser publishable key constrained by grants/RLS | No, but do not casually redistribute |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile client widget key | No |
| `BAITLOGIC_PRODUCTION_TARGET` | Must equal `vercel` | No |

Never put a Supabase service-role/secret key or Turnstile secret in a `VITE_*` variable. Vite exposes every `VITE_*` value to the browser.

### Supabase Edge Function secrets: server-side only

| Variable | Purpose |
|---|---|
| `TURNSTILE_SECRET_KEY` | Validates Turnstile tokens server-side |
| `RESEND_API_KEY` | Sends welcome and weekly email |
| `BAITLOGIC_EMAIL_FROM` | Verified sender address |
| `BAITLOGIC_PUBLIC_SITE` | Must be `https://www.bait-logic.com` |
| `SUPABASE_URL` | Supabase-provided function runtime value |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase-provided server-only runtime value |

Never place these values in GitHub, screenshots, chat, frontend code, or a release ZIP.

### Rotate a leaked secret

1. Revoke/rotate it at the service that issued it.
2. Replace it only in the correct Vercel or Supabase environment.
3. Redeploy the affected function/app.
4. Run the readiness gate and a real form test.
5. Search Git history and public screenshots for exposure. Removing a later copy does not erase Git history.

## Set up a local test copy

Requirements: Git and Node.js 22.

```bash
git clone https://github.com/baitlogicadmin/BaitLogic-OFFICIAL.git
cd BaitLogic-OFFICIAL
cp mobile-app/.env.example mobile-app/.env.local
npm --prefix mobile-app ci
npm --prefix mobile-app run dev -- --host 0.0.0.0
```

Fill `mobile-app/.env.local` with the three browser-safe values. Do not use service-role or other secret keys locally in the frontend.

Open the URL printed by Vite. On a phone connected to the same network, use the printed network URL and allow the connection through the computer firewall if prompted.

## Run the deployment-readiness gate

```bash
npm --prefix mobile-app run check:readiness
```

PASS means the production build, package/worker tests, offline foundation, environment mapping, Supabase read, submission guard, weekly sender authorization guard, and unsubscribe validation passed. It does not replace the human tests below.

The same gate runs automatically on pull requests to `main` in [GitHub Actions](https://github.com/baitlogicadmin/BaitLogic-OFFICIAL/actions/workflows/deployment-readiness.yml).

## Safe change and preview workflow

1. Create an issue that states the user problem and acceptance tests.
2. Create a branch from current `main`; never experiment directly on `main`.
3. Make the smallest complete change.
4. Run `npm --prefix mobile-app run check:readiness`.
5. Push the branch and open a pull request.
6. Open the Vercel preview from the pull request.
7. Test every changed control on mobile-width and desktop-width layouts.
8. Founder reviews the exact preview and says **approved for production**.
9. Merge to `main`; Vercel creates production automatically.
10. Verify [www.bait-logic.com](https://www.bait-logic.com/) after deployment.

No Linear Coding Sessions subscription is required. Linear can track issues, but GitHub holds the code and Vercel builds it.

## Human release checklist

### Core interaction

- [ ] Navigation changes tabs and back/close controls work
- [ ] Search accepts typing, filters results, clears, and shows an empty state
- [ ] Save/bookmark state survives reload
- [ ] Field Check accepts typing and category selection
- [ ] Field Check submission gets a Turnstile token online
- [ ] A submitted Field Check reaches moderation and is not publicly visible before approval
- [ ] Weekly signup accepts a real consented address
- [ ] Welcome email arrives from the verified BaitLogic sender
- [ ] Unsubscribe succeeds and prevents future sends
- [ ] Facebook and Instagram links open the correct BaitLogic destinations
- [ ] No button looks active while doing nothing

### Android Chrome

- [ ] Responsive layout works with no simulated phone frame
- [ ] Keyboard opens for search, report, and email fields
- [ ] Install app/Add to Home screen succeeds
- [ ] Installed app launches standalone
- [ ] Load once online, enable airplane mode, relaunch, and confirm shell loads
- [ ] Save a Field Check offline, reconnect, complete Turnstile if requested, and confirm synchronization

### iPhone Safari

- [ ] Responsive layout works with no simulated phone frame
- [ ] Keyboard opens for search, report, and email fields
- [ ] Share → Add to Home Screen succeeds
- [ ] Home-screen app launches standalone
- [ ] Load once online, enable airplane mode, relaunch, and confirm shell loads
- [ ] Save a Field Check offline, reconnect, complete Turnstile if requested, and confirm synchronization

### Accessibility and failure states

- [ ] Controls have readable labels and visible keyboard focus
- [ ] Text and controls retain usable contrast
- [ ] 200% browser zoom remains operable
- [ ] Slow connection shows a useful state rather than a frozen screen
- [ ] Backend failure keeps device-saved content and explains that sync is pending
- [ ] No browser console errors during the tested journey

## Supabase backend map

The current PWA directly depends on only this narrow surface:

| Object | Role |
|---|---|
| `field_checks` | Moderated community observations; public reads are approved-only |
| `weekly_signups` | Private email subscription records; no public direct access |
| `submission_rate_limits` | Service-only abuse-control records |
| `submit-baitlogic-signal` | Public submission entry point; Turnstile + rate limits |
| `send-baitlogic-weekly` | Authorized batch sender |
| `unsubscribe-baitlogic-weekly` | Public unsubscribe endpoint |

Other tables/functions exist from earlier experiments and adjacent modules. Do not delete or expose them merely because they are not listed above. Classify and migrate them deliberately.

Every exposed table must use both explicit privileges and row-level security. A policy does not create a grant, and a grant does not replace a policy. Never solve a frontend failure by granting anonymous access to private email, analytics, moderation, or admin data.

Current hosted-project review on 2026-08-21:

- Project status: `ACTIVE_HEALTHY`
- Security advisor: two informational `RLS enabled no policy` notices on the intentionally service-only `submission_rate_limits` and `weekly_signups` tables
- Performance advisor: 31 warnings and 15 informational items; track this as maintenance work rather than ignoring it
- Supabase's 2026 API-grant change means new tables may require explicit grants in addition to RLS before browser/API access works

References: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [backups](https://supabase.com/docs/guides/platform/backups), [function secrets](https://supabase.com/docs/guides/functions/secrets), [2026 table-grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

## Backup and recovery

### Source-code backup

- GitHub is the authoritative history.
- Use **Code → Download ZIP** for an immediate owner copy.
- Use the repository's **Create release ZIP** workflow for a named handoff package.
- Keep at least one recent ZIP outside GitHub in owner-controlled storage.

### Database backup

1. Open [Supabase Backups](https://supabase.com/dashboard/project/gibaaxzltpdizayvicgf/database/backups).
2. Confirm the available backup/point-in-time recovery window for the current plan.
3. Keep migrations in Git for every schema change.
4. Before a high-risk migration, create/export a backup appropriate to the plan.
5. Test restoration in a separate non-production project before depending on it.

Database backups do not replace Git migrations, and Git migrations do not contain production records.

### Production rollback

1. Stop making new changes.
2. Open the [Vercel deployments list](https://vercel.com/cosmiccreation/bait-logic-official/deployments).
3. Select the last known-good production deployment.
4. Use Vercel's rollback/promote action.
5. Verify the custom domain, core navigation, Field Check, weekly signup, and offline shell.
6. Open a GitHub issue explaining the failure before attempting another release.

Rollback the app and database separately. Never assume a frontend rollback reverses a database migration.

## Incident playbook

| Symptom | First checks | Safe immediate action |
|---|---|---|
| Site will not load | Vercel deployment status, custom domain, build log | Roll back to last known-good deployment |
| Buttons/typing do nothing | Confirm current domain, console errors, responsive CSS overlays, latest commit | Do not redeploy repeatedly; reproduce on a branch and add a regression test |
| Field Check will not submit | Online status, Turnstile widget, Edge Function log, function secret mapping | Preserve local item; verify Turnstile site/secret pair and hostname |
| Approved feed is empty | Supabase read status, moderation state, RLS/grants | Do not grant broad anonymous access; test approved-only policy |
| Weekly email does not arrive | Resend domain, sender, API key, function log, spam folder | Stop batch sends until one consented test succeeds |
| Offline app is blank | Service-worker registration/cache, manifest scope, first online load | Roll back if regression is production-wide; retest on physical devices |
| Database issue | Supabase status, advisors, recent migrations | Pause writes and restore only from a verified backup plan |

## Current proof and open risks

### Code-aligned changes inspected on 2026-08-24

- Baseline canonical `main` inspected through `9601af2977acaf5d4674d29fa414a44c4e60d630`; the correction branch reconciles documentation, runtime instructions, root commands, and the active photo flow.
- Field Check photo code, offline photo retry work, signup confirmation/admin tracking, contact/mobile-overlap correction, the barometer location-loading fix, and the four-column mobile quick-tools overflow fix are present in repository history.
- Presence in `main` is evidence of implementation/merge only. Live production verification was not independently completed as part of this documentation update.
- The simulated-device-frame instruction conflict is resolved: production is the responsive full-viewport PWA; phone-frame components are fixtures/history only.
- Product analytics/PostHog is not validated as an active production dependency; do not infer users, adoption, or retention.


Last fully verified on 2026-08-21:

- Vercel production deployment is READY at commit `2b80a6731f86b7196d0f12d36ea3336c39548584`.
- Vercel build log reports PASS 10/10 for the automated readiness gate.
- Supabase reports `ACTIVE_HEALTHY`.
- Required Edge Functions are active.
- RLS is enabled on the public-schema tables inspected.

Not yet honestly verified:

- A complete Android physical-device online/offline/relaunch test
- A complete iPhone physical-device online/offline/relaunch test
- A real welcome email and admin notification after resolving the 2026-08-24 `email_not_configured` result
- An authorized weekly send and one-click unsubscribe loop
- A physical-device production test of live location-based conditions, cached/offline labeling, refresh timing, and failure behavior
- Native App Store and Play Store packages
- Zero runtime errors outside the host plan's available log-retention window

## Cost-control rules

- Do not pay for Linear Coding Sessions to maintain this app.
- Keep GitHub as the source of truth and use its existing Actions checks.
- Use Vercel previews before production.
- Stay on free/low-cost service tiers until real usage justifies an upgrade.
- Do not add a new paid service unless it removes a documented blocker or has a measurable return.
- Export owner-controlled backups before changing providers.

## Handoff definition of done

A new developer or AI has not completed a handoff until they can:

- identify `mobile-app/` as production source
- run the readiness command
- open a pull request and Vercel preview without touching production
- name every browser-safe and server-only variable without revealing values
- explain Field Check moderation and offline synchronization
- roll back Vercel without changing the database
- locate Supabase backups, migrations, functions, policies, and advisors
- state the current gaps without calling sample or untested behavior complete
- obtain the founder's explicit preview approval before production

## Independence promise

The product must remain understandable and recoverable from the repository, service dashboards, migrations, and this document. Chat history, screenshots, a particular AI, and a paid coding feature are conveniences—not dependencies.
