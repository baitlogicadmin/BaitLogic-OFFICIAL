# Production recovery — 2026-08-22

BaitLogic production must be deployed from the authoritative GitHub `main` branch for `baitlogicadmin/BaitLogic-OFFICIAL`.

Incident: production aliases were overwritten by Vercel import deployments that did not carry GitHub commit metadata, causing the live site to diverge from the repository source of truth and hide previously shipped features.

Recovery action: this no-code operational commit forces a fresh Git-backed deployment from `main` without changing application behavior.

Source-of-truth rule: GitHub `main` -> Vercel production -> `bait-logic.com` / `www.bait-logic.com`.
