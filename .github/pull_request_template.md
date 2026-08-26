## What changed

Describe the user-visible or operational change and why it is needed.

## Release safety

- [ ] This PR is based on the current `main` branch.
- [ ] No credentials, service-role keys, private tokens, or private user data are committed.
- [ ] BaitLogic Deployment Readiness passes on Node 24.
- [ ] Mobile interaction tests pass.
- [ ] If PWA files changed, the installed-app upgrade path remains safe and the cache version is intentional.
- [ ] If API/routes changed, JSON endpoints cannot fall through to the React/HTML shell.
- [ ] If Supabase schema/RLS changed, the change is a named migration and public access was re-checked.
- [ ] Public/community copy does not claim unverified participation, partnerships, scientific validation, or impact.
- [ ] Exact/sensitive outdoor locations are not newly exposed.
- [ ] No secondary production host/binding was added.
- [ ] A rollback path is clear for this change.

## Production contract

Authoritative release path: **GitHub `main` → Vercel production → `bait-logic.com` / `www.bait-logic.com`**.

After merge, `BaitLogic Production Verification` must match the live Vercel Git SHA to the merged `main` SHA and pass the live route/API/PWA smoke suite.
