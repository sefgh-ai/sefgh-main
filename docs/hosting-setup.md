# Hosting configuration after Phase 7 retirement

Current source guidance, P7-10a, 2026-11-03, based on checkout `c236f71`.
Read the [current boundary inventory](migration-boundaries.md),
[cutover runbook](cutover.md) and latest [coordination](coordination.md) before
changing a hosted setting. The website is `sefgh-main`; Go is `sefgh-api` in the
dated production receipts. This document does not verify their current dashboard
configuration or authorize a deployment, activation or credential change.

The original 2026-10-14 setup guide assumed all handlers still existed in Next.js.
Use Git history for that guide. Its route-name rollback and first-language preview
instructions no longer apply after the corresponding handler retirements.

## Project boundary

The website builds the Next.js application at the repository root. The Go project
uses `backend/` with [backend/vercel.json](../backend/vercel.json)'s Go framework
setting and [backend/go.mod](../backend/go.mod)'s toolchain declaration. Verify the
actual repository, root directory, deployment revision, environment and platform
runtime support before making a deployment. Do not create replacement projects or
infer dashboard settings from source. Platform pricing, quotas and runtime support
are outside this source-only documentation check; consult current official platform
documentation before making an operational decision based on those values.

## Website settings

| Setting | Current source behavior |
|---|---|
| `SEFGH_GO_API_URL` | Required origin for all Go rewrites and server Go reads. Use an approved reachable origin, with no trailing slash. Rebuild/redeploy the website for changes to take effect. |
| `SEFGH_GO_ROUTES` | Only `ai-suggestions`, `ai-enhance-query`, `ai-chat` are recognized (comma-separated). Keep their deployment selection unchanged until P7-07/R-038/R-213 is cleared. |
| `NEXT_PUBLIC_SEFGH_KEYS_V1` | Exact `1` selects the new keys UI and v1 forwarding with the Go origin. This retained gate is independent of Go's runtime flag. Do not enable it as part of documentation/route-name cleanup. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public SDK configuration remains for managed Auth, Data API routing, Storage and Realtime. These do not replace the Go origin. |
| `NEXT_PUBLIC_SEFGH_GO_DATA` | No source reader remains after P7-08b. Obsolete after deploying that change; no environment variable is deleted by this documentation task. |

Public GitHub reads, shares, activity/starred, repository interactions, avatar,
topics, search history, onboarding and the nine data-proxy areas have fixed
origin-required routing. Their old route names, including `trending-topics` and
`playground-keys-v1`, are ignored. Contributions has no rewrite or implementation.
Deleting the origin breaks retired API paths (404), server proxy calls (503), and
repository-page enrichment (not-found behavior); it does not restore Next handlers.

## Go settings and separate gates

Use [backend/README.md](../backend/README.md) and the task's approved plan for the
full configuration. Ordinary user-scoped requests retain the verified user's token
and Supabase policies. Do not substitute a project-wide service credential.

- Authenticated endpoints need the existing Supabase public project configuration.
- Public GitHub reads use the credential rules in the
  [public access contract](../contracts/github-access/README.md); they do not borrow
  a private-capable token to enrich public pages.
- AI provider selection is implemented in
  [aiprovider/config.go](../backend/internal/aiprovider/config.go), including the
  owner's Gemini option. Old instructions naming only GitHub Models are historical.
  R-038's address/allowance verification and R-213's helper fallback diagnosis still
  block P7-07; a key's presence is not functional acceptance.
- Keys v1 requires exact `SEFGH_KEYS_V1=1`, accountant credentials and approved
  policy/capabilities separately from the website UI flag. See
  [hosted acceptance](database/keys-hosted-acceptance.md). Disabled runtime answers
  404/no-store; missing required configuration or policy fails closed with503/no-store.
  Signing remains stopped. No keys, users, JWTs or SQL are provisioned here.
- Worker activation and database consolidation retain their own gates in the
  [boundary inventory](migration-boundaries.md); route deployment does not activate them.

## Verification and rollback

Before a future deployment, identify the exact commit and environment. Use the
route's current contract and forwarding probe, then verify the deployed backend
marker/status, authentication, failure behavior and applicable hosted acceptance.
Record each observation with its date and scope in coordination. A local handoff
or a 404 alone does not establish deployment, configuration or acceptance.

For retired handlers, revert the bounded retirement commit and redeploy the
website and, where that step changed Go, the Go project. Restore any required
pre-retirement routing selection as part of that rollback. For the three retained
AI handlers only, removing their exact route name and rebuilding the website still
selects Next.js; this is not approval to bypass the open AI gates. Do not use route
names to try to restore retired handlers or introduce dual writes.

For future dashboard/environment/log/deployment work, the Vercel CLI is not installed
in this session. Installing it with `npm i -g vercel` is recommended to make
`vercel env pull`, `vercel deploy` and `vercel logs` available. Installation and
remote changes are separate from this documentation task; never copy pulled secrets
into shared docs or commit them.
