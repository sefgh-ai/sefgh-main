# Codex and Claude Code coordination

Last updated: 2026-10-12 (Asia/Calcutta), by Claude Code (GO-005a handoff).

## Start here

**The plan is Go, not Rust.** The owner decided this on 2026-10-11, after Codex's last session. The accepted plan is `adr/0002-go-backend.md`. `adr/0001-rust-backend.md` is superseded and must not be implemented.

If you last saw this project when the plan was Rust, read `../AGENTS.md`, then this file, then `adr/0002-go-backend.md`. The rest of this file tells you what was built while you were away and what needs your review.

## Current state

- **Branch:** `main` (active default branch). Work from `go-backend` was merged into `main` at `030d875` and pushed to `origin/main`. Future branches/worktrees can branch off `main` or `go-backend` (which is kept fast-forwarded and in sync).
- **Active writer:** none. Claude Code completed `GO-005a` (contributions contract fixtures, no Go code) and released the role. Changes are uncommitted at handoff. No deployment or cutover.
- **Reviewer:** Claude Code has reviewed GO-002a/GO-002b (`REVIEW-002`) and GO-003/GO-004 (`REVIEW-003`), all on 2026-10-12. GO-003 accepted; GO-004 accepted with routing off. No route is approved to switch on. Details in `claude-review.md`. The SYNC-001 documentation diff was not reviewed as a separate item.
- **Stage:** Phase 2 of the ADR is under way; Phase 1 is built but none of its gates is closed. In Go behind off-by-default switches: search, repository summary, repository detail, contents (Phase 1) and languages (Phase 2). Recorded as a contract but not ported: contributions (Phase 2). Nothing is deployed and no traffic has moved.

## Handoff: GO-005a (Claude Code, 2026-10-12)

```text
Task / scope: GO-005a, characterize GET /api/github/contributions as contract
  fixtures, before any Go port. Second Phase 2 route.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed. No Go code.
Base commit / branch / worktree: 73429e1 / main / main checkout, clean at start.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files:
  contracts/github-contributions/{cases.json,README.md}: 95 cases, version 1.
  scripts/contracts/github-contributions.test.mjs: Node runner.
  docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}: state and findings.
  No handler, Go, routing, lesson or exercise file changed. No lesson is owed:
  the tutorial rule applies to Go changes in backend/, and there are none.
Contract or decision changes: none. New contract at version 1; the Next.js
  handler is unchanged. 18 cases are marked defect and await owner decisions.
How the fixtures were made: a one-off recorder ran the unchanged handler with
  a fixed clock, fixed time zone and stubbed GitHub replies, and wrote the file.
  The committed runner replays the file and never regenerates expectations.
  Date ranges for the leap-day, India, and three daylight-saving cases, and the
  statistics for the week, streak and rounding cases, were then checked by hand.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - node --test scripts/contracts/github-contributions.test.mjs: 96 pass
    (95 cases plus a well-formedness check).
  - npm run test:contracts: 274 passed, 0 failed.
  - Ten deliberate breaks of the handler, one at a time, each then restored and
    the file confirmed identical to HEAD: all 10 caught (364-day window, Sunday
    not moved to Monday, weekday in UTC, status not passed through, streak not
    sorted, two-decimal average, 40-character name, errors ignored, zero days
    counted active, extra upstream header).
  - npx eslint on the new runner: clean.
  - backend Go tests, vet, gofmt and learn-go solutions: run by npm run handoff
    at release; nothing in them changed.
Findings recorded (details in contracts/github-contributions/README.md):
  - No page or component in this checkout calls the route.
  - Its date range depends on the server's time zone and daylight saving.
  - It passes GitHub's status through, so a bad server token answers 401.
  - A real unknown user answers 400, not the 404 the handler intends. This
    follows GitHub's documented reply shape and was NOT observed live.
  - It is public, spends the server token's GraphQL allowance, and has no
    rate limit or cache.
Unverified: live GitHub GraphQL behaviour (needs a token; none was used);
  non-number counts and totals; undated days; methods other than GET.
Remaining gates: Codex peer review of GO-005a. Owner decisions below before a
  port changes any behaviour. All earlier cutover gates remain.
Next bounded action: GO-005b, port to Go against these fixtures with a lesson,
  routing off. Start only after the owner confirms the route is still wanted,
  since nothing calls it. If it is, port the 18 defect cases as recorded; do
  not fix them without an owner-approved contract change in both
  implementations. The contract README ends with notes for the port.
Writer released: yes
```

## Handoff: REVIEW-003 (Claude Code, 2026-10-12)

```text
Task / scope: REVIEW-003, peer review of GO-003 (cd8906c against 1e5d87f) and
  GO-004 (b0ef691 against cd8906c), including lessons 10, 11 and 12.
Owner / reviewer: Claude Code reviewed Codex's work. This record is unreviewed.
Status: review complete for both tasks. Not deployed.
Base commit / branch / worktree: b0ef691 / main / main checkout, clean at start.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files: docs/claude-review.md (review section added) and this file. Nothing else.
Contract or decision changes: none.
Verdicts: GO-003 accepted. GO-004 accepted with routing off. No route is
  approved to switch on; every earlier cutover gate remains.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - REVIEW-002 experiments repeated on the GO-003 code in a scratch copy:
    712 generated URLs against Node, 0 mismatches (was 72); 20 concurrent
    callers on one 404 key, 1 upstream call and 50 ms (was 20 calls, 1.0 s);
    panic in the loader releases the key; a cancelled fetching caller does not
    pass its cancellation to waiters; failures are logged without token or URL.
  - 28 deliberate breaks of handler.go, cache.go and fetchurl.go: 25 caught,
    3 not (listed in claude-review.md). All 11 missed in REVIEW-002 are caught.
  - Compiled server against live GitHub, no token, six requests: summary 200,
    repeat served from cache, renamed-repository redirect followed, contents 200.
  - GO-004: three catalog copies identical (565 names); 5 of 5 breaks caught.
  - learn-go lessons 11 and 12: exercises fail without panic or hang; go vet
    clean in both modes; gofmt -l empty.
  - npm run handoff: run at release; see .agent-signal.json for its result.
Unverified: race detector (no C compiler here); the Next.js rewrite for the
  languages route and for percent-encoded path segments; staging measurements.
Remaining gates before any route is switched on: REVIEW-002 findings 1, 7, 8
  and 11; the unverified items above; hosting and measurements.
Next bounded action: Claude Code continues with GO-005a as Codex's GO-004
  handoff specifies: characterize GET /api/github/contributions with
  deterministic GraphQL stubs before any Go port.
Writer released: yes
```

## Handoff: GO-004 (Codex, 2026-10-12)

```text
Task / scope: GO-004, first Phase 2 slice: GET /api/github/languages.
Owner / reviewer: Codex / independent reviewer pending; no agent was contacted.
Status: implementation complete, review pending, not deployed.
Base / branch / worktree: cd8906c / main / main checkout; clean at start.
Resulting commit: uncommitted at handoff; Git Agent owns synchronization.
Changed files:
  contracts/github-languages/{cases.json,response.json,README.md}
  scripts/contracts/{github-languages.test.mjs,route-loader.mjs,go-rewrites.test.mjs}
  backend/internal/githublanguages/{handler.go,catalog.json,contract_test.go}
  backend/cmd/api/main.go, backend/README.md, next.config.mjs
  learn-go/12-embedded-data/{README.md,lesson.go,sample.json,exercise.go,
    exercise_test.go,solution.go}, learn-go/README.md
  docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}
Behavior / decisions:
  - Captured version-1 fixtures against the unchanged Next.js handler BEFORE
    porting. Pins all 565 language strings in order, JSON array shape, status
    and headers; query parameters ignored, no upstream HTTP call.
  - Go embeds a separate production JSON artifact as an immutable string.
    Both implementations must match the independent approved snapshot.
  - Added github-languages opt-in rewrite; no route enabled by default.
  - Lesson 12 teaches go:embed and serving JSON text. Its exercise is unfinished;
    no existing owner exercise changed. Standard library only.
Actual checks (Codex):
  - Initial Node language characterization: 4 checks passed before Go code.
  - npm run test:contracts: 178 passed, 0 failed (173 cases plus integrity and
    rewrite checks). Existing search/repository contracts remain unchanged.
  - backend: go test -count=1 ./... passed all five packages; new fixture cases
    pass in memory and over local sockets.
  - Compiled api.exe smoke from an unrelated temporary working directory:
    catalog response, marker/security headers, HEAD, POST 405 all passed.
    The harness stopped only the Go server it started; no live GitHub call.
  - learn-go: all 13 solution packages pass; both vet modes clean; formatting
    clean. Default exercise tests were not run.
  - npm run build with SEFGH_GO_ROUTES and SEFGH_GO_API_URL empty: passed.
    Only existing browser-data/punycode warnings; no production deployment.
  - Targeted ESLint on next.config.mjs and the three changed contract scripts:
    passed. Full-project lint was not rerun; GO-003 recorded the baseline
    10 errors and 16 warnings in unchanged UI files.
  - Markdown link checks, git diff --check and existing-exercise preservation
    checks passed.
Release validation: npm run handoff is run after release; inspect its emitted
  .agent-signal.json for result. This text does not claim a Git commit or push.
Remaining gates:
  - GO-003 and GO-004 independent peer review. No self-review is labeled peer review.
  - Earlier Phase 1 URL-input/token-policy, race-detector, encoded-segment rewrite,
    production cache, hosting, measurement and rollback gates remain open.
  - New route opt-in config behavior is unit-tested, but an actual Next-to-Go
    language rewrite has not been exercised in staging. No traffic moved.
  - AI policy and user-data schema/RLS gates remain; FIX-002 stays owner-reserved.
Next bounded implementation: GO-005a, characterize GET /api/github/contributions
  with deterministic GraphQL stubs and fixtures before its Go port (GO-005b).
  Read the current source/callers, claim writer, preserve existing behavior,
  and record defects for owner decisions. No live credentials are needed.
Next review: Claude reviews GO-003 (cd8906c versus 1e5d87f) and GO-004 separately.
Writer released: yes.
```

## Owner instruction: low-capacity checkpoints

The owner requires every agent to stop implementation at approximately 3–5%
remaining visible capacity and leave a pickup record. See `../AGENTS.md`,
"Low-capacity checkpoint (owner requirement)". Account usage is not visible to
Codex in this session; no percentage is asserted. Incomplete work must be marked
paused, the writer released, and the next concrete action recorded. Do not emit
the normal completion signal for an incomplete task.

## Handoff: GO-003 (Codex, 2026-10-12)

```text
Task / scope: GO-003, REVIEW-002 findings 2–6 and 10, lesson clarification
  (finding 9), and the owner's low-capacity checkpoint rule.
Owner / reviewer: Codex / Claude Code intended, peer review NOT run.
Status: implementation complete; review pending; not deployed.
Base / branch / worktree: 1e5d87f / main / main checkout.
Resulting commit: uncommitted at handoff. Git Agent owns synchronization.
Changed files:
  AGENTS.md: owner-required low-capacity checkpoint rule, shared via CLAUDE.md.
  backend/internal/githubrepos/{cache.go,cache_test.go,cache_regression_test.go,
    handler.go,limits_test.go}: shared flights, cancellation/panic recovery,
    structured failure logs and targeted tests.
  backend/internal/jscompat/{fetchurl.go,fetchurl_test.go}: preserve wire paths.
  backend/cmd/api/main.go: wire the repository logger to the server logger.
  backend/README.md: operational behavior and tests.
  contracts/github-repositories/{cases.json,README.md}: five additive cases.
  scripts/contracts/github-repositories.test.mjs: Node wire_url assertion.
  learn-go/{README.md,09-path-parameters/README.md,10-shared-cache/README.md}:
    updated explanations and lesson index.
  learn-go/11-shared-results/{README.md,lesson.go,exercise.go,exercise_test.go,
    solution.go}: new unfinished owner exercise and separate tested solution.
  docs/{coordination.md,backend-map.md,claude-review.md,adr/0002-go-backend.md}:
    current implementation, review responses and remaining gates.
Contract / decision changes: no response contract changes; version remains 2.
  Standard library only. No routing switches changed. No existing exercise.go
  changed. Owner instructed all agents to checkpoint at 3–5% visible capacity;
  account quota is not visible to Codex and no percentage is asserted.
Checks and outcomes (Codex):
  - Before fixing: the new shared-failure test reproduced 20 upstream calls
    instead of one for 201/404/429/500/network errors. Expected red test.
  - npm run test:contracts: 174 passed, 0 failed (87 search cases,
    83 repository cases plus integrity/rewrite checks).
  - backend: go test -count=1 ./... passed all four packages; go vet ./...
    clean; gofmt -l . empty. Repository contracts run in memory and over sockets.
  - Cache tests: go test -count=20 ./internal/githubrepos -run TestCache passed.
  - Twelve deliberate mutations in a scratch copy outside the checkout:
    all 12 caught by test assertions; see claude-review.md for categories.
  - learn-go: go test -tags solution ./... passed all 12 packages (00–11);
    go vet ./... and go vet -tags solution ./... clean; gofmt -l . empty.
    Default exercise suite was not run and owner exercises remain unfinished.
  - npm run lint: existing 26 problems (10 errors, 16 warnings), all in
    unchanged UI files. No new lint findings in the modified runner.
  - git diff --check and local Markdown link checks passed; existing owner
    exercise files verified unchanged.
  - go test -race ./internal/githubrepos ./internal/jscompat: could not run;
    Go reported that -race requires cgo. No gcc/clang found on PATH.
Release verification: npm run handoff runs immediately after writer release.
  Its result is in .agent-signal.json; this record alone does not assert that
  the release script has passed or that Git Agent has committed/pushed.
Remaining gates / unverified work:
  - Claude peer review of GO-003. REVIEW-002 remains Claude's earlier work.
  - Finding 1: owner-approved validation contract in BOTH implementations,
    and verification that the server token is limited to public data.
  - Race detector with a supported C compiler; encoded-segment Next rewrite
    checks; production cache/hosting choice; staging measurements and rollback.
  - Findings 7 (malformed UTF-8), 8 (whole-handler deadline), and 11 (upstream
    identity policy) remain open; FIX-002 remains the owner's exercise.
  - No production build, live GitHub/Supabase audit or deployment performed.
Next bounded action: Claude reads git diff from this base and reviews GO-003
  against findings 2–6/10; include lesson 11. Then resolve remaining Phase 1
  gates before switching routes on. No live reviewer was contacted in this task.
Writer released: yes.
```

## Handoff: REVIEW-002 (Claude Code, 2026-10-12)

```text
Task / scope: REVIEW-002, peer review of GO-002a and GO-002b (commit 6e0753d):
  contracts/github-repositories/, backend/internal/githubrepos/,
  backend/internal/jscompat/fetchurl.go, their tests, and lessons 09 and 10.
Owner / reviewer: Claude Code reviewed Codex's work. This record is itself unreviewed.
Status: review complete. Implementation was already complete. Not deployed.
Base commit / branch / worktree: 43513d4 / main / main checkout
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files: docs/claude-review.md (review section added) and this file. Nothing else.
Contract or decision changes: none.
Verdict: acceptable as merged with routing off. NOT ready to switch any of the
  three repository routes on. Eleven findings are in claude-review.md under
  "GO-002 peer review by Claude Code".
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - All 97 fixture wire_url values recomputed with Node's URL parser: all match.
  - jscompat.FetchURL against Node on 712 generated URLs: 640 identical;
    72 differ, every one containing "|" or "^".
  - 27 deliberate code breaks in a scratch copy: 16 caught by tests, 11 not.
  - Cache, 20 concurrent callers, one 404 key, 50 ms upstream: 20 upstream calls
    one at a time; slowest caller waited 1.0 s.
  - Panic inside the cache loader: key stays pending; next caller times out.
  - Non-UTF-8 README bytes: JavaScript 2, 3, 1 replacement characters for three
    samples; Go 1, 1, 1.
  - learn-go lessons 09 and 10: solutions pass, exercises fail without panic,
    go vet clean.
  - Experiments ran in a copy outside the repository; git status showed only
    this file modified before the review section was written.
  - npm run handoff: run at release; see .agent-signal.json for its result.
Remaining gates before any repository route is switched on:
  - Findings 1 to 5 resolved (finding 1 needs an owner decision and a contract
    change in both implementations).
  - go test -race run on a machine with a C compiler.
  - Forwarding of percent-encoded path segments through the Next.js rewrite checked.
  - Codex's existing gates: production cache behaviour chosen and verified,
    outbound request measurements, peer review of any fixes.
Not reviewed: SYNC-001's documentation diff as a separate item, and CI-000
  beyond the handoff script's release check.
Next bounded action: Codex takes GO-003: fix findings 2 to 6 in Go, add the
  missing cache tests and "|" / "^" fixture cases, and add the wire_url
  assertion to the Node runner. No contract change is needed for those.
Writer released: yes
```

## What was done while Codex was away

All by Claude Code, at the owner's direction, on 2026-10-11 and 2026-10-12. Run `git log --oneline main..go-backend` for the commits.

| Task | What it did | Where to look |
|---|---|---|
| `RUST-001a` | Recorded the behaviour of `GET /api/github/search` as contract fixtures, with a runner for the Next.js handler. Recorded the lint and build baseline. The task name is historical | `contracts/github-search/`, `scripts/contracts/` |
| `FIX-001` | The owner approved fixing all 13 defects the fixtures had recorded. Fixed in the Next.js handler; fixtures moved to contract version 2 in the same commit | `src/app/api/github/search/route.js`, and the Versions table in `contracts/github-search/README.md` |
| `GO-001` | Go module in `backend/`, standard library only. Search handler, a JavaScript-compatibility package, the server, and an opt-in rewrite in `next.config.mjs` | `backend/README.md` |
| `LEARN-001` | A Go tutorial for the owner, nine lessons built on the real backend code | `learn-go/README.md` |
| `GO-000` | Plans switched from Rust to Go: new ADR, old one marked superseded, shared instructions and this file rewritten | `adr/0002-go-backend.md`, `../AGENTS.md` |

## Codex synchronization log — 2026-10-12

The owner supplied Claude's updated coordination handoff and asked Codex to read the changed plan and keep both agents synchronized after building. Codex read the attachment, AGENTS.md, CLAUDE.md, this file, backend-map.md, ADR-0002, the superseded notice in ADR-0001, claude-review.md, backend/README.md and learn-go/README.md. The accepted Go plan supersedes the earlier chat's proposed Rust scope and its historical "no implementation yet" status. The current checkout, not that old chat, is the source of truth.

```text
Task / scope: SYNC-001 — shared-plan readback, completion logging rules,
  documentation corrections, and verification of existing local test suites.
Owner / reviewer: Codex / Claude Code (this documentation diff not peer-reviewed)
Status: complete (synchronization only; implementation peer review remains pending)
Base commit / branch / worktree: 2b4f880 / go-backend / main checkout
Allowed files / interfaces: AGENTS.md, docs/coordination.md,
  docs/claude-review.md, docs/backend-map.md, docs/adr/0002-go-backend.md
Changes made:
  - Added an explicit end-of-task handoff requirement for either agent.
  - Recorded Go acceptance, existing implementation, and pending review separately.
  - Corrected unmeasured performance/merge-readiness claims and HEAD wording.
  - Distinguished the original source audit from Claude's later runtime checks.
Contract or decision changes: none. No application or exercise files changed.
Checks run and exact outcome (Codex, 2026-10-12):
  - Initial git status --short: empty; current branch go-backend, HEAD 2b4f880.
  - npm run test:contracts: exit 0; 88 passed, 0 failed.
  - Go version: go1.27.2 windows/amd64.
  - backend: go test ./... passes (githubsearch and jscompat cached);
    go vet ./... has no diagnostics; gofmt -l . prints nothing.
  - learn-go: go test -tags solution ./... passes all nine lesson packages;
    go vet ./... and go vet -tags solution ./... have no diagnostics;
    gofmt -l . prints nothing. Owner exercises were not edited or completed.
  - Documentation diff and local Markdown link checks: passed.
Unverified dependencies / blockers:
  - No full implementation/lesson peer review in this task. Passing existing
    tests is not proof of missing-case coverage or completion of the six review requests.
  - Build, lint, live GitHub, rewrite runtime and rollback checks were not rerun;
    the earlier results remain attributed to Claude, including baseline lint failure.
  - Remote branch/PR/deployment state was not refreshed. No deployment or cutover.
  - Hosting, staging measurements, database definitions and Python lineage remain open.
Next bounded action: Codex performs the six implementation review requests below,
  records findings, then GO-002a captures the three repository/contents contracts.
  GO-002b follows the fixtures and includes corresponding lessons.
Writer released: yes. Five documentation files changed locally; no commit or push.
```

Both agents must update this log at task completion using the handoff format. Reading this file is the synchronization step; no live Claude session was contacted or claimed to have acknowledged this update.

## Handoff: GO-002a and GO-002b (Codex -> Claude Code)

```text
Task / scope: GO-002a / GO-002b — contract fixtures for repository routes (summary, detail, contents), Go port with in-memory caching and path parameters, and owner tutorial lessons 09 & 10.
Owner / reviewer: Codex / Claude Code (peer review pending)
Status: review
Base commit / branch / worktree: 2b4f880 / go-backend / main checkout
Allowed files / interfaces: contracts/github-repositories/, scripts/contracts/, backend/, next.config.mjs, src/app/api/github/repo/route.js, learn-go/, shared docs
Changes made:
  - Added 78 contract fixtures in contracts/github-repositories/ covering summary, detail, and contents routes.
  - Implemented Go handlers in backend/internal/githubrepos/ with path parameter matching and bounded in-memory LRU cache (256 entries / 64 MiB).
  - Added backend/internal/jscompat/fetchurl.go for normalized wire URL handling.
  - Registered routes in backend/cmd/api/main.go and opt-in rewrites in next.config.mjs.
  - Normalized Next.js summary error text to 500 "Failed to fetch repository" for internal/transport failures.
  - Created lessons 09 (path parameters) and 10 (shared cache) in learn-go/.
Checks run and exact outcome (Windows, Go 1.27.2, Node 21.7.1):
  - npm run test:contracts: exit 0; 168 passed (88 search + 78 repository/contents + 2 rewrites), 0 failed.
  - backend: go test -count=1 ./... passes; go vet ./... clean; gofmt -l . clean.
  - learn-go: go test -tags solution ./... passes (all 11 packages 00-10); go vet -tags solution ./... clean; gofmt -l . clean.
  - npm run lint: baseline 26 problems (10 errors, 16 warnings), 0 in modified files.
Unverified dependencies / blockers:
  - Peer review by Claude Code pending.
  - Routing remains off by default; no production deployment or cutover.
  - Multi-instance cache persistence / sharing remains a cutover gate.
Next bounded action: Claude Code peer-reviews GO-002 diff; Owner decides on FIX-002 and production hosting.
Writer released: yes.
```

## Prior handoff (Claude Code -> Codex)

```text
Task / scope: FIX-001, GO-001, LEARN-001, GO-000 (described above)
Owner / reviewer: Claude Code / Codex (review not yet run)
Status: review
Base commit / branch / worktree: 42759dd / go-backend / main checkout
Allowed files / interfaces: backend/, learn-go/, contracts/, scripts/contracts/,
  the search route handler, next.config.mjs, .gitattributes, .gitignore, shared docs
Changes made: see the table above and the commit messages.
Contract or decision changes:
  - Backend language is Go (ADR-0002, accepted).
  - Search contract version 2: 13 defects fixed. See "Judgment calls" below.
Checks run and exact outcome (Windows, Node 21.7.1, Go 1.27.2):
  - npm run test:contracts: 88 tests pass (87 cases plus an id check).
  - backend: go test ./... passes. 174 contract subtests (87 cases, each run in
    memory and over real sockets), plus unit tests. go vet clean. gofmt -l empty.
  - The 87 new fixtures run against the OLD handler: 27 fail, all in the fixed
    areas. The 53 old fixtures run against the NEW handler: exactly the 13
    defect cases fail.
  - Deliberate breaks, each caught by exactly the expected cases, then reverted:
    page cap 999; Retry-After not forwarded; "+" not decoded as a space;
    a wrong expected Retry-After; a security header changed in next.config.mjs.
  - Go server against live GitHub, unauthenticated: a C# search answers 200.
  - Switch, in next dev: on, the route is served by Go with the security
    headers; off, by Next.js. Other routes unaffected.
  - Switch, in a production build: a build made with the switch on forwards to
    Go even when started without the variables, and a build made with it off
    does not forward even when started with them. It is fixed at build time.
  - npm run build: passes, with the switch off and with it on.
  - npm run lint: FAILS exactly as on the baseline, 10 errors and 16 warnings,
    all in UI files not touched here. The files changed here lint clean.
  - learn-go: go test -tags solution ./... passes; go vet passes with and
    without the tag; go test ./... fails in all nine lessons by design.
    Both "real tasks" in the lessons were carried out as written, behaved as
    the lessons say, and were reverted.
Unverified dependencies / blockers:
  - Not deployed. Hosting for the Go service is undecided.
  - GitHub's rate-limit replies (403 with zero remaining, Retry-After, 429) were
    not observed live. The mapping follows GitHub's documented behaviour.
    Observed live: quoted multi-word language and C# work; a blank query and
    a page past 1000 results both answer 422.
  - No latency, memory or cost measurement of either implementation.
  - Tested on one Windows machine only. No CI exists for Node or Go.
  - The Next.js runner depends on Node module hooks and on next/server.js
    resolving; verified on Node 21.7.1 only.
  - Deployed topology, live RLS, and Python service lineage: still unverified.
Next bounded action: Codex reviews (see "Review requests"), then GO-002a.
Writer released: yes
```

## Judgment calls made inside FIX-001

The owner approved fixing the 13 defects. Fixing them needed these specific choices, which the owner did not individually approve. Reviewer, please check each one. They are all pinned by fixtures.

| Choice | Why |
|---|---|
| `page` is capped at 1000 | GitHub serves only the first 1000 results, so no higher page can succeed. Without a cap, a 30-digit page would reach GitHub in exponent notation |
| `page` and `per_page` must match `^-?[0-9]+$` | Rejects fractions, exponents, hex and `Infinity`, as intended. It also rejects `+5` and `5` with a trailing space, which `Number()` used to accept |
| A blank query means no character outside Unicode `White_Space` | Catches a full-width space from an IME. Identical by construction in JavaScript (`\P{White_Space}`) and Go (`strings.TrimSpace`) |
| `language` allows `#` and single spaces between words; multi-word values are quoted upstream | The navbar offers C#. Quotes are never accepted in the value, so quoting cannot be escaped. Single-word values stay unquoted so existing URLs do not change |
| Rate limits answer 429 with `rate_limit` in the body, and `Retry-After` forwarded when GitHub sent it | The search page shows the error text in a toast and could not tell "slow down" from "broken" |
| GitHub's 422 answers 400 `GitHub could not process this search` | It is the caller's request that GitHub rejected |
| A 200 without a numeric `total_count` and an `items` array answers 500 | It used to answer 200 with both keys missing, which the page would show as "Found undefined repositories" |
| Other upstream failures still answer 500 | They were marked `preserve` in version 1; not part of the 13 |

## Review requests for Codex

1. `contracts/github-search/cases.json` against `route.js`: is any rule in the README wrong, or any case missing?
2. `backend/internal/githubsearch` against `route.js`, line by line. They are meant to be the same program in two languages.
3. `backend/internal/jscompat`: the query parser and the encoder. Invalid UTF-8 is knowingly left unspecified.
4. The switch in `next.config.mjs`, and Go sending the security headers itself with a drift test, instead of sharing one source.
5. The judgment calls above.
6. `learn-go/`: is anything in a lesson untrue about Go or about this codebase?

Record disagreements in `claude-review.md` or the ADR, as before.

## Active & Upcoming tasks

| Task | Scope | Status | Blocked on |
|---|---|---|---|
| `SYNC-001` | Readback, documentation synchronization and verification | Implementation complete | Claude peer review |
| `GO-002a` | Contract fixtures for `github/repo`, `github/repo/[owner]/[repo]` and `github/contents/[owner]/[repo]` | Implemented and reviewed in REVIEW-002 | Cutover gates remain |
| `GO-002b` | Go implementation of repo summary, detail, contents + lessons 09 & 10 | Implemented and reviewed in REVIEW-002 | Findings and cutover gates |
| `GO-003` | Cache/logging/URL fixes, regression coverage, wire URL checks and lesson 11 | Implemented at `cd8906c`; accepted in REVIEW-003 | Cutover gates remain |
| `GO-004` | First Phase 2 route: static `github/languages`, with lesson 12 | Implemented at `b0ef691`; accepted with routing off in REVIEW-003 | Cutover gates remain |
| `GO-005a` | Contract fixtures for `github/contributions`: 95 cases, 18 marked `defect` | Implementation complete, uncommitted at handoff | Codex peer review |
| `GO-005b` | Go port of `github/contributions` against those fixtures, with a lesson, routing off | Not started; unassigned | Owner confirms the route is still wanted (nothing calls it) |
| `FIX-002` | Make the navbar's "Most Stars" and "Recently Updated" work. Offered to the owner as the real task in `learn-go/02-structs-and-maps`. Do not fix it unasked: it is the owner's exercise | Reserved for Owner | Owner |
| `CI-001` | A workflow that runs `npm run test:contracts`, and `go test`, `go vet` and `gofmt -l` in `backend/`, plus `go test -tags solution` in `learn-go/` | Ready to implement | Owner approval |
| `OPS-001` | Choose hosting for the Go service; deploy to a staging environment; take the measurements the ADR requires | Not started | Owner |

Suggested ownership: whichever agent is available takes the writer role for one task and records it under "Current state"; the other reviews.

## Owner decisions pending

- Navbar sort (`FIX-002`): teach the API the navbar's names, or change the navbar to the API's names.
- Hosting for the Go service, before anything is deployed.
- AI endpoint and playground-key policy, before Phases 2 and 3.
- Contributions route (`GO-005a`): is it still wanted, given nothing calls it? If so, decide the seven groups of `defect` cases in `contracts/github-contributions/README.md`, the first being whether its date range should be computed in UTC.
- GO-002 is already merged. The URL-input validation contract and public-only
  token scope from REVIEW-002 finding 1 remain owner decisions before cutover.

## State of the owner's machine

- Go 1.27.2 is installed for the Windows user at `%LOCALAPPDATA%\Programs\Go`, from the official archive with its checksum verified, and its `bin` folder was appended to the user `PATH`. No administrator rights were used. To remove it, delete that folder and the `PATH` entry.
- A terminal or editor that was open before the install does not see `go` until it is restarted. Agents can prefix a command's `PATH` with that `bin` folder.
- At GO-003 start, `main` and `go-backend` both pointed to `1e5d87f` and matched
  their locally recorded origin refs. No remote fetch was performed by Codex.
  The earlier divergence was resolved before this task.

## Shared reading order

1. `../AGENTS.md`: cooperation and implementation rules.
2. This file: latest task and actual state.
3. `backend-map.md`: observed source architecture and unverified dependencies.
4. `adr/0002-go-backend.md`: the accepted plan, how a route moves, phases and gates.
5. `claude-review.md`: findings and reconciled differences from the original review.

`../CLAUDE.md` imports `AGENTS.md`, keeping one set of core instructions. Claude supports repository instruction files and imports; see [Claude Code's official memory documentation](https://code.claude.com/docs/en/memory). Existing sessions should explicitly read the updated files; changes are not a live message bus.

## Working agreement

A task has one writer and one reviewer, and the roles swap freely. Shared files carry facts and decisions; private chat context is not automatically synchronized.

Before an implementation task, the writer records its scope and base commit here. The reviewer reads the same files and reviews the bounded diff. Record disagreements in the ADR or review notes and resolve them before changing affected contracts. Release ownership before another agent edits. Concurrent feature work requires separate worktrees and explicit allocation; merely using different terminals does not isolate edits.

## Handoff format for future tasks

```text
Task / scope:
Owner / reviewer:
Status: proposed | active | review | complete | blocked
Base commit / branch / worktree:
Allowed files / interfaces:
Changes made:
Contract or decision changes:
Checks run and exact outcome:
Unverified dependencies / blockers:
Next bounded action:
Writer released: yes/no
```

## Prompt for an existing Codex or Claude Code session

> The backend plan changed from Rust to Go on 2026-10-11. Read AGENTS.md and docs/coordination.md, then docs/adr/0002-go-backend.md, docs/backend-map.md and docs/claude-review.md. Do not implement docs/adr/0001-rust-backend.md. Continue from the shared state: check `git status --short`, the current branch, and task ownership before editing. Unreviewed work is listed under "Review requests" in the coordination file; review it read-only unless you are assigned the writer role. Any task that changes Go in backend/ must also update learn-go/.
