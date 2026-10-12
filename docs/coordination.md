# Codex and Claude Code coordination

Last updated: 2026-10-12 (Asia/Calcutta), by Claude Code.

## Start here

**The plan is Go, not Rust.** The owner decided this on 2026-10-11, after Codex's last session. The accepted plan is `adr/0002-go-backend.md`. `adr/0001-rust-backend.md` is superseded and must not be implemented.

If you last saw this project when the plan was Rust, read `../AGENTS.md`, then this file, then `adr/0002-go-backend.md`. The rest of this file tells you what was built while you were away and what needs your review.

## Current state

- **Branch:** `go-backend`. It was called `rust-migration-prep` until the plan changed; the old name no longer exists locally or on origin. Based on `main` at `42759dd`. Pushed. Not merged into `main`, and no pull request is open. Create worktrees from this branch so they inherit these documents.
- **Active writer:** none. Claude Code has released everything below.
- **Reviewer:** Codex. **No peer review has run on any task below.** Claude verified its own work only.
- **Stage:** Phase 1 of the ADR. The first route exists in Go behind a switch that is off by default. Nothing is deployed and no traffic has moved.

## What was done while Codex was away

All by Claude Code, at the owner's direction, on 2026-10-11 and 2026-10-12. Run `git log --oneline main..go-backend` for the commits.

| Task | What it did | Where to look |
|---|---|---|
| `RUST-001a` | Recorded the behaviour of `GET /api/github/search` as contract fixtures, with a runner for the Next.js handler. Recorded the lint and build baseline. The task name is historical | `contracts/github-search/`, `scripts/contracts/` |
| `FIX-001` | The owner approved fixing all 13 defects the fixtures had recorded. Fixed in the Next.js handler; fixtures moved to contract version 2 in the same commit | `src/app/api/github/search/route.js`, and the Versions table in `contracts/github-search/README.md` |
| `GO-001` | Go module in `backend/`, standard library only. Search handler, a JavaScript-compatibility package, the server, and an opt-in rewrite in `next.config.mjs` | `backend/README.md` |
| `LEARN-001` | A Go tutorial for the owner, nine lessons built on the real backend code | `learn-go/README.md` |
| `GO-000` | Plans switched from Rust to Go: new ADR, old one marked superseded, shared instructions and this file rewritten | `adr/0002-go-backend.md`, `../AGENTS.md` |

## Handoff

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

## Next tasks, not started

| Task | Scope | Blocked on |
|---|---|---|
| `GO-002a` | Contract fixtures for `github/repo`, `github/repo/[owner]/[repo]` and `github/contents/[owner]/[repo]`, passing against the Next.js handlers. `scripts/contracts/route-loader.mjs` will need extending if a route imports through the `@/` alias. `github/repo` uses Next.js's one-hour fetch cache, which the fixtures must describe | Nothing |
| `GO-002b` | Port those three routes to Go, with lessons for the new Go they introduce (path parameters, caching) | `GO-002a` |
| `FIX-002` | Make the navbar's "Most Stars" and "Recently Updated" work. Offered to the owner as the real task in `learn-go/02-structs-and-maps`. Do not fix it unasked: it is the owner's exercise | Owner |
| `CI-001` | A workflow that runs `npm run test:contracts`, and `go test`, `go vet` and `gofmt -l` in `backend/`, plus `go test -tags solution` in `learn-go/` | Owner approval |
| `OPS-001` | Choose hosting for the Go service; deploy to a staging environment; take the measurements the ADR requires | Owner |

Suggested ownership: whichever agent is available takes the writer role for one task and records it under "Current state"; the other reviews.

## Owner decisions pending

- Navbar sort (`FIX-002`): teach the API the navbar's names, or change the navbar to the API's names.
- Hosting for the Go service, before anything is deployed.
- AI endpoint and playground-key policy, before Phases 2 and 3.
- Whether to merge `go-backend` into `main`. Everything on it is safe to merge: the Go route is off unless switched on. The search fixes do take effect on merge.

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
