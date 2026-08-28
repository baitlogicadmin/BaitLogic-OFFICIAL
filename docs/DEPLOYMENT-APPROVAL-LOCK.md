# BaitLogic Deployment Approval Lock

## Mandatory rule

**No explicit founder approval = no production deployment.**

The following phrases do **not** authorize deployment:

- fix it
- implement it
- update it
- make it ready
- show revision
- finish it
- continue
- build it
- test it

Deployment approval must be explicit and unambiguous, for example:

- DEPLOY
- deploy this
- push this live

## Required release workflow

1. Prepare the change.
2. Verify it in a non-production environment or preview.
3. Show the preview/results.
4. Receive explicit founder approval.
5. Deploy only after that approval.
6. Verify production after release.

Build success, test success, code completion, or preview approval do not automatically grant deployment permission.

If approval is uncertain, do not deploy.

## Scope

This applies to:

- desktop UI
- mobile/PWA UI
- online/offline behavior
- copy/content
- data integrations
- infrastructure changes
- visual changes
- service worker/cache changes
- Vercel production releases
- GitHub actions or automated release workflows
- assistant/agent actions

## Automation rule

No assistant, agent, automation, CI workflow, or integration may infer deployment approval from implementation language.

Any technical deployment gate must default to **blocked** unless explicit approval is present.

## Production invariant

**Preview first. Approval second. Production last.**
