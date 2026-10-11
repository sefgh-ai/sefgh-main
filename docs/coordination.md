# Codex and Claude Code coordination

Last updated: 2026-10-11 (Asia/Calcutta).

## Current scope and state

User request: understand the codebase, assess a move of all backend work to Rust, and coordinate with Claude Code in this same local repository.

- **Stage:** architecture assessment and shared documentation. Rust proposal is not yet accepted.
- **Baseline:** `42759dd`; clean working tree before this documentation pass.
- **Active writer:** none; Codex completed this documentation pass and released it.
- **Reviewer:** local Claude Code; independent architecture review and shared-document readback both completed successfully.
- **Application changes:** none. No Rust crate, deployment, database mutation, package/toolchain install, or production benchmark performed.
- **New files:** root `AGENTS.md`, root `CLAUDE.md`, this file, `backend-map.md`, `claude-review.md`, and `adr/0001-rust-backend.md` under `docs`.
- **Git state:** all six files are new and untracked; no commit was made. Include them in the shared branch before creating worktrees that must inherit this context.
- **Verification:** documentation reference/whitespace checks passed; all 25 inventory paths exist and all 38 documented methods match source; tracked application diff is empty. No app lint/build/test baseline was run.
- **Readback result:** Claude agrees with the proposed boundaries. Its sort-edge-case finding, contract clarifications, worktree caveat, and task split were incorporated; see `claude-review.md`.

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

## Proposed next task, not started

`RUST-001a`: capture existing GitHub search fixture contracts and lint/build baseline, using controlled upstream fixtures. Useful regardless of the final language decision.

`RUST-001b`: implement an opt-in Rust search read path after the user chooses the Rust direction and required tooling is available.

Suggested ownership: Codex implements the bounded fixtures/service/adapter; Claude reviews response compatibility, failure handling, token boundaries, and rollback. This allocation is a proposal; neither agent has a running implementation task.

Pending evidence: current lint/build baseline, deployed topology, live database/RLS definitions for later stateful phases, active Python service lineage/corpus, and meaningful latency/cost measurements.

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
