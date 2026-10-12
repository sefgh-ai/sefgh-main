# Codex and Claude Code coordination

Last updated: 2026-10-12 (Asia/Calcutta), by Claude Code (REVIEW-002 handoff).

## Start here

**The plan is Go, not Rust.** The owner decided this on 2026-10-11, after Codex's last session. The accepted plan is `adr/0002-go-backend.md`. `adr/0001-rust-backend.md` is superseded and must not be implemented.

If you last saw this project when the plan was Rust, read `../AGENTS.md`, then this file, then `adr/0002-go-backend.md`. The rest of this file tells you what was built while you were away and what needs your review.

## Current state

- **Branch:** `main` (active default branch). Work from `go-backend` was merged into `main` at `030d875` and pushed to `origin/main`. Future branches/worktrees can branch off `main` or `go-backend` (which is kept fast-forwarded and in sync).
- **Active writer:** none. Claude Code completed `REVIEW-002`, the peer review of GO-002a and GO-002b, and released the role. Routing remains off by default; no deployment or cutover.
- **Reviewer:** Claude Code reviewed GO-002a/GO-002b on 2026-10-12. Verdict: acceptable as merged with routing off, not ready to switch on. Eleven findings are in `claude-review.md`; the handoff is below. The SYNC-001 documentation diff was not reviewed as a separate item.
- **Stage:** Phase 1 of the ADR. Search, repository summary, repository detail, and contents exist in Go behind opt-in switches that are off by default. Nothing is deployed and no traffic has moved.

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
| `GO-002a` | Contract fixtures for `github/repo`, `github/repo/[owner]/[repo]` and `github/contents/[owner]/[repo]` | Implementation complete (78 fixtures) | Claude peer review |
| `GO-002b` | Go implementation of repo summary, detail, contents + lessons 09 & 10 | Implementation complete | Claude peer review |
| `FIX-002` | Make the navbar's "Most Stars" and "Recently Updated" work. Offered to the owner as the real task in `learn-go/02-structs-and-maps`. Do not fix it unasked: it is the owner's exercise | Reserved for Owner | Owner |
| `CI-001` | A workflow that runs `npm run test:contracts`, and `go test`, `go vet` and `gofmt -l` in `backend/`, plus `go test -tags solution` in `learn-go/` | Ready to implement | Owner approval |
| `OPS-001` | Choose hosting for the Go service; deploy to a staging environment; take the measurements the ADR requires | Not started | Owner |

Suggested ownership: whichever agent is available takes the writer role for one task and records it under "Current state"; the other reviews.

## Owner decisions pending

- Navbar sort (`FIX-002`): teach the API the navbar's names, or change the navbar to the API's names.
- Hosting for the Go service, before anything is deployed.
- AI endpoint and playground-key policy, before Phases 2 and 3.
- Whether to merge `go-backend` into `main`. Merge readiness remains subject to the pending code review. The Go route is off unless switched on, but the search fixes do take effect on merge.

## State of the owner's machine

- Go 1.27.2 is installed for the Windows user at `%LOCALAPPDATA%\Programs\Go`, from the official archive with its checksum verified, and its `bin` folder was appended to the user `PATH`. No administrator rights were used. To remove it, delete that folder and the `PATH` entry.
- A terminal or editor that was open before the install does not see `go` until it is restarted. Agents can prefix a command's `PATH` with that `bin` folder.
- Local `main` and `origin/main` have diverged by one commit each: local has `42759dd`, and origin has an automated timestamp commit. This branch does not touch `main`. Reconciling it is the owner's call.

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
