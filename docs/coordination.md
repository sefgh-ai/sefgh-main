# Codex and Claude Code coordination

Last updated: 2026-10-11 (Asia/Calcutta).

## Current scope and state

User request: understand the codebase, assess a move of all backend work to Rust, and coordinate with Claude Code in this same local repository. On 2026-10-11 the user asked Claude Code to continue as writer while Codex was rate limited, and to commit the work.

- **Stage:** contract preparation complete for the first read path. Rust proposal is still not accepted; no Rust code exists.
- **Branch:** `rust-migration-prep`, created from `main` at `42759dd`. Run `git log --oneline main..rust-migration-prep` for the commits. Create worktrees from this branch, not from `main`, so they inherit these documents.
- **Active writer:** none. Claude Code completed `RUST-001a` and released it.
- **Reviewer:** Codex, on return. **No peer review of `RUST-001a` has run.** Claude verified its own work only.
- **Application changes:** one line in `package.json` adding the `test:contracts` script. No handler, component, dependency, database, or deployment change. No Rust crate or toolchain install.
- **Push state:** check with `git status -sb`. The branch is not merged into `main` and no pull request has been opened.

## Handoff: RUST-001a

```text
Task / scope: RUST-001a, GitHub search contract fixtures and lint/build baseline
Owner / reviewer: Claude Code / Codex (review not yet run)
Status: review
Base commit / branch / worktree: 42759dd / rust-migration-prep / main checkout
Allowed files / interfaces: contracts/, scripts/contracts/, package.json scripts, shared docs
Changes made:
  - Committed Codex's six shared documents unchanged as the first commit.
  - contracts/github-search/cases.json: 53 cases, 13 marked defect.
  - contracts/github-search/README.md: fixture format and matching rules.
  - scripts/contracts/github-search.test.mjs and route-loader.mjs: runner.
  - package.json: test:contracts script.
  - AGENTS.md, backend-map.md, ADR next-task section, this file: updated facts.
Contract or decision changes: none. Fixtures record current behavior, including defects.
Checks run and exact outcome:
  - npm run test:contracts: 54 tests pass (53 cases plus an id-uniqueness check).
  - Corrupting two expectations made exactly those two cases fail; restored.
  - npx eslint scripts/contracts: clean.
  - npm run lint: FAILS on baseline, 10 errors and 16 warnings, all in UI files
    that this task did not touch. Detail in backend-map.md.
  - npm run build: passes, exit 0.
Unverified dependencies / blockers:
  - Owner has not chosen the Rust direction; RUST-001b stays blocked on that.
  - cargo and rustc are not on PATH in this environment.
  - Owner decision needed on which of the 13 defect cases a port should fix.
  - The runner depends on Node module hooks and on next/server.js resolving;
    verified on Node 21.7.1 only.
  - Timeouts, caching and live GitHub behavior are not covered by fixtures.
  - Deployed topology, live RLS, Python service lineage: still unverified.
Next bounded action: Codex reviews the fixtures against route.js, then either
  RUST-001b (after owner approval and toolchain) or RUST-002a below.
Writer released: yes
```

## Shared reading order

1. `../AGENTS.md` — cooperation and implementation rules.
2. This file — latest task and actual state.
3. `backend-map.md` — observed source architecture and unverified dependencies.
4. `adr/0001-rust-backend.md` — proposed target, sequencing, and acceptance gates.
5. `claude-review.md` — findings and reconciled differences.

`../CLAUDE.md` imports `AGENTS.md`, keeping one set of core instructions. Claude supports repository instruction files and imports; see [Claude Code's official memory documentation](https://code.claude.com/docs/en/memory). Existing sessions should explicitly read the updated files; changes are not a live message bus.

## Working agreement

Codex coordinates the current assessment; Claude supplies independent review. Future roles can swap. A task has one writer and one reviewer. Shared files carry facts and decisions; private chat context is not automatically synchronized.

Before an implementation task, the current writer records its scope and base commit here. The reviewer reads the same files and reviews the bounded diff. Record disagreements in the ADR/review notes and resolve them before changing affected contracts. Release ownership before another agent edits. Concurrent feature work requires separate worktrees and explicit allocation; merely using different terminals does not isolate edits.

## Proposed next tasks, not started

`RUST-001b`: implement an opt-in Rust search read path that passes `contracts/github-search/cases.json`, after the user chooses the Rust direction and the toolchain is available. Blocked on both.

`RUST-002a`: record the same style of fixtures for `github/repo`, `github/repo/[owner]/[repo]`, and `github/contents/[owner]/[repo]`, the remaining Phase 1 routes. Not blocked; useful whichever language is chosen. Reuse `scripts/contracts/route-loader.mjs`; routes that import through the `@/` alias will need the loader extended.

Suggested ownership: whichever agent is available takes the writer role for one task and records it above; the other reviews. This allocation is a proposal.

Pending evidence: deployed topology, live database/RLS definitions for later stateful phases, active Python service lineage/corpus, and meaningful latency/cost measurements.

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

## Prompt for an existing Claude Code session

> Read CLAUDE.md and docs/coordination.md, then docs/backend-map.md, docs/adr/0001-rust-backend.md, and docs/claude-review.md. Continue from the shared state. The Rust migration is proposed, not started. Check the current Git diff and task ownership before editing. Work as Codex's reviewer unless assigned the writer role, and record substantive disagreements in the shared decision record.
