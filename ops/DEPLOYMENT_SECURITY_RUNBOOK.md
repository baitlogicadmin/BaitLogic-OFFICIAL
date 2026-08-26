# BaitLogic Deployment & Security Runbook

**Authority:** GitHub `main` is the only production source of truth.

**Production chain:** `baitlogicadmin/BaitLogic-OFFICIAL` `main` → Vercel production → `https://bait-logic.com` / `https://www.bait-logic.com`.

A deployment is not considered successful merely because Vercel says `READY`. It is successful only when the live-domain production verification matches the deployed Git SHA to GitHub `main` and the live smoke suite passes.

---

## 1. Release rule

Use this path for every production change:

1. Create a feature/fix branch from current `main`.
2. Open a pull request into `main`.
3. Pass **BaitLogic Deployment Readiness** on Node 24.
4. Pass mobile interaction tests and security checks.
5. Review the PR release-safety checklist.
6. Merge into `main` (squash is preferred for a single reversible production commit).
7. Vercel deploys from GitHub `main`.
8. **BaitLogic Production Verification** waits for the public domain, then verifies release provenance, routes, content types, APIs, manifest, and service worker.
9. If live verification fails, treat the release as failed even if the Vercel deployment state is `READY`.

Never deploy production from a ZIP, local import, alternate host, secondary hosting binding, preview project, or unrelated deployment tool.

---

## 2. One-time GitHub `main` protection (account-level setting)

The connected GitHub tooling used to create this runbook does not expose branch-protection/ruleset writes. Turn this on once in GitHub after the hardening PR is merged:

**Repository → Settings → Rules → Rulesets** (or **Branches → Branch protection rules**, depending on GitHub UI) → protect `main`.

Recommended settings for a solo owner:

- Require a pull request before merging.
- Do **not** require another person's approval if that would make a solo repository impossible to merge; the goal is PR + checks, not self-lockout.
- Require status checks before merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Block force pushes to `main`.
- Block deletion of `main`.
- Do not allow direct pushes/bypass except a deliberately retained emergency owner bypass if GitHub requires one for account recovery.

Required pre-merge check:

- `BaitLogic Deployment Readiness / readiness`

GitHub **CodeQL default setup is already enabled** for this repository. Do not add a second advanced CodeQL workflow; GitHub rejects simultaneous default + advanced configuration. If you choose to make CodeQL blocking in the ruleset, select the actual CodeQL status check name GitHub displays in the repository after its default-setup scan runs.

**Do not require `BaitLogic Production Verification` before merge**; it is intentionally a post-merge live-production check.

---

## 3. Runtime contract

BaitLogic production runtime is **Node 24.x**.

It is pinned in:

- Vercel project runtime
- root `package.json`
- `mobile-app/package.json`
- `.nvmrc`
- GitHub Actions readiness workflow
- production verification workflow

A release must fail if the runtime major is not 24.

---

## 4. Production provenance and drift protection

`/api/release` exposes only safe deployment metadata (Git SHA/ref, production target, Vercel environment, Node runtime). It does not expose credentials.

After every `main` push and every six hours, `scripts/verify-production.mjs` requires:

- production Git ref is `main`
- production target is `vercel`
- live Git SHA matches the expected GitHub `main` SHA
- HTML routes return HTML
- JSON APIs return JSON (not the React shell)
- core recovered feature routes return `200`
- manifest and service worker are live
- health/reports/release APIs are valid
- Barometer and water API routes return JSON even when an upstream provider is temporarily unavailable

Any production deployment that cannot be tied to GitHub `main` is production drift and must be investigated before further releases.

---

## 5. Rollback procedure

### Normal rollback — preferred

Use **Actions → Prepare BaitLogic Rollback → Run workflow**.

Provide the bad production commit SHA and a short reason. The workflow:

1. verifies the commit exists on `main`
2. creates a rollback branch
3. creates a Git revert commit
4. opens a rollback PR
5. sends the rollback through normal readiness checks

After merge, the normal Vercel deployment and production-verification workflow must pass.

This is preferred because GitHub and production remain aligned.

### Emergency rollback — site actively harmful/broken

If an immediate Vercel rollback is necessary, use a known-good Vercel rollback candidate only as a temporary emergency action. Then immediately create/merge the matching Git revert so GitHub `main` becomes identical to intended production again.

Never leave Vercel rolled back while GitHub `main` points at a different release.

### Never rollback by

- force-pushing `main`
- deleting commits
- uploading an old ZIP
- switching the domain to another host
- restoring an old database over production without a verified data-recovery plan

---

## 6. Secret and environment rules

### Safe browser/public configuration

These values are intentionally browser-visible and may be configured in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TURNSTILE_SITE_KEY`
- `BAITLOGIC_PRODUCTION_TARGET=vercel`

A Supabase **publishable/anon** key is not a service-role secret. Its safety depends on correct RLS and API policies.

### Server-only secrets

Never commit, paste into public issues, screenshots, client JavaScript, or public documentation:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- any private API/token key
- private signing keys or access tokens

Supabase Edge Functions also use:

- `SUPABASE_URL` (platform-provided/runtime)
- `BAITLOGIC_EMAIL_FROM`
- `BAITLOGIC_PUBLIC_SITE` — canonical value should be `https://www.bait-logic.com`

Public submissions now **fail closed** if `TURNSTILE_SECRET_KEY` is absent; missing bot protection must never silently disable validation.

### Rotation rule

If a secret may have been exposed:

1. rotate/revoke it first at the provider
2. update the authorized environment
3. redeploy/retest
4. then remove the exposed value/history where appropriate
5. never assume deleting a Git commit revoked a credential

The PR readiness workflow runs `scripts/scan-secrets.mjs` against tracked files and refuses common high-risk credential patterns without printing secret values.

---

## 7. Supabase/database safety

### Permanent rules

- All schema, RLS, grants, indexes, and function changes go through named migrations.
- Do not make undocumented production-only schema changes in the dashboard.
- Public tables use RLS or an explicitly reviewed public-read policy.
- Service-only tables must deny `anon`/`authenticated` access explicitly.
- Community Field Checks are public only when `moderation_status = 'approved'`.
- Exact/sensitive outdoor locations must not be exposed by Field Check.
- Service-role keys remain server-side only.

### Hardening completed 2026-08-22

Migration `harden_service_only_tables_and_safe_policy_cleanup`:

- added explicit deny-all browser policies to `submission_rate_limits` and `weekly_signups`
- removed only provably redundant RLS policies
- added covering indexes for existing collaboration foreign keys

After this migration, the Supabase **security advisor returned zero security lints**.

Remaining Supabase performance warnings are primarily `auth.uid()` RLS initialization-plan optimizations and two ambiguous overlapping catch-write policies. They are not treated as security failures and must not be changed until catch/water ownership semantics are tested, because an apparently simple policy cleanup could change who is allowed to write data.

### Backup/restore rule

Before any destructive or high-risk data migration:

- confirm a current Supabase backup/restore point is available in the account
- prefer testing the migration against a Supabase development branch or non-production database first
- record the migration name and intended rollback/recovery behavior
- never test destructive SQL against production data first

The connected Supabase tooling in this session does not expose account backup-retention settings, so backup-plan/retention must be verified in the Supabase account dashboard before a destructive migration is approved.

---

## 8. PWA/offline release safety

BaitLogic is an installed/offline-capable application, so a successful website deploy is not enough.

Rules:

- service-worker cache names are versioned
- old cache generations are deleted on activation
- the new worker claims existing clients
- scripts/styles prefer fresh network content and use cached content only as fallback
- Barometer/USGS data clearly identify offline cached data
- app-shell navigation falls back only when network navigation actually fails
- a PWA release must not overwrite `/` with whatever route a user happened to visit

`tests/pwa-upgrade.test.mjs` simulates upgrading an already-installed BaitLogic worker and verifies the prior cache is removed while the current cache survives and the new worker claims clients.

---

## 9. Monitoring and security automation

### Every PR

- tracked-secret scan
- Node 24 runtime check
- production build
- PWA/backend contract tests
- PWA upgrade migration test
- Supabase public API/security probes
- mobile Playwright interaction tests
- GitHub CodeQL default-setup analysis (managed by repository Code Security, not a duplicate workflow file)

### Every production merge

- GitHub `main` deploys through Vercel
- live production provenance must match the merged SHA
- live route/API/content-type/PWA smoke suite runs

### Every six hours

- production verification reruns against `www.bait-logic.com`

### Weekly/monthly

- Dependabot groups safe npm updates
- GitHub Actions dependencies are reviewed monthly
- GitHub-managed CodeQL/default Code Security scanning remains enabled
- Supabase security/performance advisors should be checked after database migrations
- Vercel runtime errors should be reviewed after releases and before declaring a production incident closed

---

## 10. Production incident response

### Bad release or missing features

1. Check `/api/release` against current GitHub `main` SHA.
2. Check Vercel production deployment source/provenance.
3. If SHA differs: treat as deployment drift; restore Git-backed production.
4. If SHA matches but behavior is wrong: use the rollback workflow to revert the bad commit.
5. Verify the public domain with production smoke checks.
6. Check installed PWA behavior/cache if desktop web is correct but phones are stale.

### API returning HTML

This is a routing failure even when HTTP status is `200`. Production verification explicitly checks content type and JSON parsing for APIs.

### Database/security incident

1. protect data/credentials first
2. rotate potentially exposed secrets
3. stop or fail closed on unsafe public writes
4. inspect RLS/grants and recent migrations
5. preserve evidence/logs before deleting anything
6. restore service only after public-access tests pass

### External data provider outage

Do not fabricate data. Barometer/water endpoints may return a truthful JSON `502` if verified upstream data cannot be retrieved. The app should explain that live data is unavailable rather than silently substituting invented values.

---

## 11. Repository hygiene

- `node_modules/` must never be tracked; dependencies are reconstructed from lockfiles.
- `.env` and `.env.*` are ignored except safe examples.
- generated Playwright/test output is ignored.
- dependency upgrades arrive by reviewed PR, not automatic production mutation.
- protected runtime files must be intentionally re-approved when their integrity lock changes.

---

## 12. Release definition of done

A BaitLogic release is complete only when all are true:

- [ ] change came through a PR
- [ ] readiness and security checks passed
- [ ] production is GitHub-backed `main`
- [ ] Vercel reports READY
- [ ] `/api/release` SHA equals GitHub `main` SHA
- [ ] production live smoke suite passed
- [ ] no new Vercel runtime error cluster was introduced
- [ ] database migration (if any) is recorded and security advisor checked
- [ ] installed/offline behavior was tested when PWA/runtime changed
- [ ] rollback commit is identifiable
- [ ] user-facing data/copy is truthful and privacy-safe

If any item is unknown, the release is **not yet verified**.
