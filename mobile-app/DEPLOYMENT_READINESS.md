# BaitLogic Deployment Readiness Gate

This is the required release gate for the BaitLogic app. It checks the real stack: Vite/React PWA, ChatGPT Sites static worker, Supabase database, and Supabase Edge Functions.

## Run the automated gate

```bash
npm run check:readiness
```

The command never prints environment-variable values and never deploys or changes production data.

## Automated PASS requirements

| Gate | PASS means |
|---|---|
| Front-end build | TypeScript and Vite production build finish without errors |
| Worker/package | Static assets, app-route fallback, and Sites packaging tests pass |
| Offline foundation | Installable manifest, service worker, secured public writes, and unsubscribe contract pass |
| Environment | Supabase URL, publishable key, and Turnstile site key are mapped |
| Database | A live read against `field_checks` returns HTTP 200 |
| Submission API | A request without a Turnstile token is rejected with HTTP 403, proving the function and bot-protection secret are active |
| Weekly sender | An unauthenticated request is blocked with HTTP 401/403 |
| Unsubscribe | An invalid unsubscribe link is rejected with HTTP 400 |

## Required human/live release gates

These cannot be honestly approved by a source-code-only script:

- Supabase confirms `RESEND_API_KEY`, `BAITLOGIC_EMAIL_FROM`, and `BAITLOGIC_PUBLIC_SITE` are mapped.
- One real consented signup receives the welcome email.
- One authorized weekly send succeeds and its one-click unsubscribe works.
- Supabase security and performance advisors are reviewed.
- The reviewed build is integrated into the authoritative `baitlogicadmin/BaitLogic-OFFICIAL` source connected to the existing Vercel project and `bait-logic.com` domains.
- Android and iPhone physical-device tests pass online, in airplane mode, and after relaunch.
- Amber reviews the corrected preview and explicitly approves deployment.

## Release rule

Preview-ready is not production-ready. Deployment is blocked if any automated check fails or any required human/live gate remains unverified.
