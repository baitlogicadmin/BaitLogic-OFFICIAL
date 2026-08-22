# Security Policy

## Reporting a vulnerability

Do **not** open a public GitHub issue containing credentials, private user data, exact sensitive locations, or an exploitable vulnerability.

Report security concerns privately to **baitlogic@outlook.com** with:

- affected BaitLogic URL/feature
- what you observed
- safe reproduction steps
- impact you believe is possible
- screenshots/log excerpts only after removing credentials and private user data

Do not send passwords, service-role keys, API secrets, private signing keys, or other people's personal information.

## Production security model

BaitLogic production is released only from GitHub `main` through Vercel. Public data access is constrained by Supabase RLS/policies and moderated Field Checks. Exact/sensitive community locations are not intended to be publicly exposed.

Operational release, rollback, secret-rotation, and incident-response procedures are maintained in `ops/DEPLOYMENT_SECURITY_RUNBOOK.md`.
