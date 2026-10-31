# Migration closeout checkpoint - 2026-10-30

DB-CONSOLIDATE-001 owner update2026-11-01: Repo-DB application objects/data are to consolidate into corpus schema inside User-DB while preserving existing app behavior/data. This supersedes separate-project assumptions. Worker needs corpus-only capability, never User-DB service-role key. Live identity/inventory, backup/restore, reviewed additive scripts, reconciliation and rollback remain required; no transfer or cleanup executed. See docs/plans/database-consolidation.md.


Decision pack2 local implementation is complete:27/27 fixes. This is not a declaration that the complete migration or live cutover is finished. Main base/current f5c5640; prior work preserved, changes uncommitted, peer review/deployment pending.

## Verified local work

BUG-039 through BUG-065 implement the approved pack fixes. Final BUG-065 focused suggestions/API tests/vet and Node54/54 passed after initial regressions; three deliberate breaks detected type, trim and dedup regressions and source was restored. Original Next handlers remain unchanged as rollback references. UI lint/build passed in BUG-060; subsequent production browser code is unchanged. Full handoff follows, and only a matching signal/status proves its result. Lessons are updated, existing exercise.go files untouched, lesson checks skipped by policy.

## Remaining migration gates

| Gate | Evidence / next step |
|---|---|
| Playground keys hosted development acceptance | Existing exact replacement plan remains approved; SHA256 f212c12e9a17f88bec2137d3fd7da636e5a3e0d6d1d970237785d5092d10dde3 reverified. Fresh cua_repl inventory still returns browser access host unavailable. No key, password, user, token or run was created. Restore required browser access, then perform fresh approved preflight; do not repeat an ambiguous import or bypass the secret-form observation procedure. |
| Keys production activation/cutover | Not authorized by development approval. Review policy/credentials, two-user acceptance, recovery/cleanup, consumers, rollback and exact rollout settings before an owner production decision. |
| Avatar R-095 rollout | Local exclusive-lock/pagination/concurrency checks pass. Hosted non-overwrite and signed-in acceptance, all writers honoring the protocol and recovery review remain. R-209 manual recovery is accepted and automatic recovery owner-deferred until after Phase 7 (2026-10-31); never steal by age. |
| Phase6 register / walk-through | ADR-0002 requires every entry fixed or owner-deferred by name, lint passing and repeated walk-through with no new High/Medium issues. Pack2 completion alone does not meet it. Signed-in desktop/375px walk-through remains gated on owner-provided access without asking for passwords. |
| Phase7 retirement | Phase6 gate, caller audit and rollback observation period must pass. Only the already-approved narrow refresh deletion exception exists; do not generalize it. |
| Worker/data boundaries | Analysis/search lineage/schema and RepoSync deployment/acceptance remain separately gated. API route progress is not whole-backend migration progress. |
| Source/release | Git Agent commit/push/CI, independent review, deployment and live receipts are separate from local handoff; none is claimed here. |

## Current register census

There are209 entries. 160 statuses begin with fixed (including local/undeployed fixes), 12 begin with deferred, and 37 have other/open/partial/gated states. This is a literal status census, not a production-verification count.

Entries not beginning fixed or deferred:

- R-015 (Needs: contract): open (owner's lesson)
- R-017 (Needs: owner): decided part fixed (BUG-034, 2026-10-28): the search sends license, the date range (as `created=>=<date>`, computed by the browser), topics and forks (`src/lib/search/advanced-filters.js`, all three requests in `useGitHubSearch.js`); Go `githubsearch` validates each and adds `license:`, `created:`, `topic:`, `forks:` (contract `github-search` version 4, 13 new cases; the Next.js handler ignores them until retired). The navbar has inputs only for license and the date range today; topics and forks are supported once inputs exist. Wiki and issues stay visible but are not sent (no GitHub qualifier); deferred by the owner as a feature for later
- R-028 (Needs: schema): open
- R-032 (Needs: owner): open, decided (owner, 2026-10-28: A): retire the route in Phase 7
- R-033 (Needs: contract): approved pack parts fixed in Go (BUG-048, 2026-10-30, uncommitted): UTC range, user-only NOT_FOUND404 and today/yesterday anchored streak; contract v3 keeps rollback answers/variables. Other pinned reply-shape, bare-reply and token-status behaviors remain open; R-207 separate; deployment pending
- R-038 (Needs: owner, schema): open, decided (owner, 2026-10-28: B, key on the address Vercel sets; A only if abuse is seen). Checked 2026-10-28 (BUG-034 session): Go keys on `X-Forwarded-For`, which Vercel overwrites, so a caller cannot change it. Not verified: whether visitors who reach Go through `sefgh-main`'s rewrite are told apart (Vercel documents that a proxy in front of a deployment can overwrite the header). An outside probe cannot tell, because suggestions over the allowance answer 200 with the fallback. Verify once the AI keys are on `sefgh-api`: the Go project's logs, or 31 signed-in chat requests through the website from two addresses
- R-039 (Needs: schema, contract): open: owner chose real hashed, show-once keys with supported-endpoint validation and server accounting on 2026-10-18; database changes prepared for review before application. See `plans/playground-keys.md`; core/HTTP/SQL adapters and show-once UI built/reviewed/tested; KEYS-WIRING-001 adds default-off local runtime/forwarding and production localhost verification; hosted acceptance/provisioning/approved production SQL/policy/legacy transition/cutover remain
- R-065 (Needs: owner): open: the owner will renew the domain later (2026-10-24); meanwhile the site this repository deploys is `https://sefgh-main.vercel.app`
- R-066 (Needs: owner): open: owner chose A (2026-10-24): "from now all deployments will be done in this repo"; the domain moves to `sefgh-main` once renewed (R-065, OPS-004)
- R-127 (Needs: contract): open (KEYS-CORE-001): preserved in current route; proposed Go core requires explicit name bound, HTTP body bound still needed
- R-128 (Needs: contract): open (KEYS-CORE-001): characterize before approved lifecycle replacement
- R-129 (Needs: contract, schema): open (KEYS-CORE-001): existing route preserved; proposed core retries only explicit collisions and never reveals/retries ambiguous creation
- R-136 (Needs: cutover): open (KEYS-HTTP-001 discovery): original route fix follows its cutover gate; new public-key adapter suppresses this detailed logger and records fixed outcomes only
- R-143 (Needs: SQL review): open (KEYS-DB-001): tested supabase/proposals/keys_001_legacy_truncate.sql prepared for owner review; not applied live; preserves CRUD/rows
- R-177 (Needs: -): corrected proposal locally (KEYS-PROVISION-001a, uncommitted): server-acknowledged per-user logout first, independent cleanup flags, explicit retained password capability and conditional active-token evidence; no live provisioning or application defect claimed; operator helper still needs regression checks before execution
- R-182 (Needs: -): contained and corrected (KEYS-PROVISION-001b / BUG-022, c960e7c): original key stayed current, no users/sessions/JWT/run; exact local secret files removed after revocation. Control-presence-only CUA observer has5regressions and actual public-page check; private forms prohibit full snapshots/screenshots/raw errors. Further signing changes stopped by owner; receipt keys-provisioning-incident-2026-10-23.json
- R-116 (Needs: pipeline, schema): open (PHASE5-001): verify active corpus/provider before port/fix
- R-117 (Needs: pipeline, schema): open (PHASE5-001): terminal skip/retry/checkpoint behavior needs selected worker and reviewed schema
- R-118 (Needs: pipeline, schema): open (PHASE5-001): distinct failure outcomes and durable restart semantics required before Phase 4 replacement. REPOSYNC-001 (2026-10-24): pinned as case `insert-conflict-counted-duplicate` in `contracts/reposync`, reproduced by the Go port
- R-119 (Needs: pipeline, schema): open (PHASE5-001): record content/model provenance and atomic invalidation in selected Go worker
- R-120 (Needs: pipeline, schema): open (PHASE5-002): derive provenance from actual selected model/revision in the chosen worker
- R-121 (Needs: pipeline, schema): open (PHASE5-002): atomic completion or durable repair/retry required
- R-122 (Needs: pipeline, schema): open (PHASE5-002): separate missing-vector retry state from completed analysis
- R-123 (Needs: pipeline, deployment): open (PHASE5-002): verify exposure and protect the selected worker control plane before enabling
- R-189 (Needs: contract): open: reproduced by the Go port (REPOSYNC-001); fixed in Go after an approved cutover
- R-190 (Needs: contract): open: reproduced by the Go port as `ErrResetWaitCrash` so the two compare; fixed in Go after an approved cutover
- R-191 (Needs: contract): open: Phase 4 recovery gate; fixed in Go after an approved cutover
- R-192 (Needs: contract): open
- R-193 (Needs: owner, contract): open: covering more than 1,000 needs split queries (for example by creation date), a product choice
- R-194 (Needs: contract): open
- R-195 (Needs: contract): open
- R-196 (Needs: contract): open
- R-197 (Needs: —): open: the Go port writes monitoring rows inline (recorded difference)
- R-198 (Needs: contract): open
- R-199 (Needs: pipeline): open: only when the analyser is run; the proposed design reads README and file lists through GitHub's API instead (`docs/architecture/lld.md` 6.2)
- R-200 (Needs: pipeline, deployment): open: the proposed search route is user- or address-limited and calls one read-only function (`docs/architecture/lld.md` 8)
- R-201 (Needs: pipeline): open: the proposed job table keeps this state in the database (`docs/architecture/lld.md` 4)

## Pickup

Read AGENTS.md, the latest coordination checkpoint and current diff/status. No writer or verifier may be displaced. The owner cannot reconnect Browser. Hosted development acceptance remains pending; do not repeat the reconnection request absent changed circumstances. Owner decisions and Phase6 gates remain required for broader closure.

BUG-066 closes R-205/R-206 in React: trending errors show available wait seconds from Retry-After or reset metadata, and placeholder popular-repository labels have no navigation handler. Real repository names use keyboard-accessible buttons with validated paths. API contracts stay unchanged. Focused hook/component/helper checks18/18, lint and build passed. Component checks use the installed Next SWC compiler and inspect the actual React element handlers; they are not a live browser walk-through. Initial harness loadBindings and draft JSX marker errors were corrected before final checks.

BUG-067/R-207 enforces the existing39-character contributions login limit with an explicit length guard before the handler token check or GraphQL request. Interleaved hyphens cannot admit40/77-character names; valid39-character names still pass. Invalid400 text is unchanged, and Next rollback replies/calls are preserved. Focused Go tests/vet and Node112/112 passed; final full handoff follows. UI follow-up BUG-066 full handoff passed0a85bf3acd6f after final lint/build.

Overall migration remains **blocked / incomplete** at external and owner gates. No retirement, production SQL, key activation or deployment is inferred from the wrap-up request. Required browser reconnection is pending; the existing exact development approval remains valid.

## Resume2026-10-31: BUG-068/R-090

Browser host remains unavailable on fresh inventory. Independent non-mutating OPTIONS proof now satisfies the recorded share-route Go cutover condition. R-090 now updates all active shares matching both caller and conversation, then verifies an empty active-share list before reporting ok. Failed writes return the existing fixed400 error; failed, malformed or nonempty verification returns fixed500. No lookup failure can silently report deletion. Zero existing shares remain idempotent. Credentials/RLS scope stay user-bound. Focused Go tests/vet and Node73/73 passed, stateful tests cover multiple rows, owner isolation, silent no-update, verification outage/malformed reply. Two deliberate breaks detected lost ownership scope and skipped empty verification. Full handoff follows. No production share mutation, SQL, signing, activation, deployment, commit or push was performed. Authenticated hosted deletion acceptance and deployment of this privacy fix remain priorities after review.

## Public verification2026-10-31 (BUG-069)

BUG-069/R-077, 2026-10-31: owner-approved replacement/retirement is observed at the website. GET /api/trending/topics returns200 from Go with6 populated topics/30 repository entries; GET /api/trending/refresh returns404. No deployment was performed by this task. Helpers/table/data retained; external scheduler inventory and general Phase7 cleanup remain separate gates. Receipt ../verification/trending-retirement-2026-10-31.json records status/header/schema counts only, not raw repository data. OPTIONS204 alone did not establish absence; GET404 did. Source port/retirement scope is23 original routes ported, one retired and playground keys replacement still gated; this is not a whole-migration percentage. No production switch or deployment was changed.

## Owner recovery decision, 2026-10-31

Owner decision 2026-10-31 (CLOSEOUT-001): accept manual crash-lock recovery and defer R-209 automatic recovery until after Phase 7. An operator must verify the owning request/process stopped and remove only the exact user lock after inspecting the current profile. Never remove by age or steal a potentially active lock. Hosted lock permissions, insert atomicity, signed-in replacement and participation by all active upload writers remain rollout gates. This decision authorizes no activation or deployment. Browser is needed for the authenticated dashboard signing procedure and constrained private-form observation; local code verification does not require it. The owner cannot reconnect Browser; no new reconnection request is pending. Existing exact development approval remains recorded, execution pending.
