# SEFGH shared agent instructions

These instructions are shared by Codex and Claude Code. User instructions take precedence.

## Read before working

1. `docs/coordination.md` for current scope, ownership, and handoff.
2. `docs/backend-map.md` for observed architecture and source pointers.
3. `docs/adr/0002-go-backend.md` for the accepted Go migration, how a route moves, and the gates.
4. `docs/claude-review.md` for review findings and reconciled differences.
5. `docs/bug-register.md` for known bugs and broken UI/UX (Phase 6).

`docs/adr/0001-rust-backend.md` is superseded and kept only as a record. Do not implement it.

Check `git status --short` and the current commit before editing. The architecture snapshot is based on commit `42759dd`; recheck affected source when it changes. The accepted ADR authorizes its staged plan. It does not authorize skipping a phase gate, cutting a route over, or deploying.

## Project facts

- Next.js App Router, JavaScript/JSX, React, Tailwind, Supabase.
- API handlers: `src/app/api/**/route.js`. Auth callback: `src/app/auth/callback/route.js`. Session refresh: `src/proxy.js`.
- Go backend: `backend/`, one Go module using only the standard library. Routes move there one at a time and stay off until enabled by environment variables. See `backend/README.md`.
- Contracts: `contracts/` holds fixtures that every implementation of a route must pass.
- Browser data access is substantial: `src/lib/supabase`, hooks, contexts, and playground components. Migrating API routes alone is not a full backend migration.
- Checks for the app: `npm run lint`, `npm run build`, and `npm run test:contracts` (fixtures against the Next.js handlers). There is no general `npm test` script. `npm run lint` fails on any error or warning (`--max-warnings 0`, since BUG-010); see `docs/backend-map.md`.
- Checks for Go, run inside `backend/`: `go test ./...`, `go vet ./...`, and `gofmt -l .`, which must print nothing.
- After fixture changes, use `go test -count=1 ./...`: `contracts/` is outside the Go module, so cached results are not verification of changed fixtures.
- Go is installed for the owner's Windows user at `%LOCALAPPDATA%\Programs\Go\bin`. A shell started before the install may not find `go`; add that folder to `PATH` for the command.
- Local secrets live outside shared documentation. Never copy `.env.local`, tokens, cookie values, or private agent transcripts into handoffs.

## Cooperation

- Use one writer in this checkout. The other agent reviews read-only. Record the active task, owner, files, and base commit in `docs/coordination.md` before implementation.
- For concurrent implementation, use separate branches/worktrees and assign non-overlapping tasks first. Create worktrees from the branch named in `docs/coordination.md`, so they inherit these documents. A Markdown ownership record is a coordination convention, not a filesystem lock.
- Before taking over, confirm the previous writer has released the task and re-read the diff. Do not reset, clean, stash, or overwrite another agent's work.
- Keep decisions in the ADR and current progress in the coordination file. Avoid separate conflicting plans in private agent memory.
- Handoffs must state changed files, actual checks/results, unverified dependencies, and the next bounded task. Claim a peer review only when it actually ran.
- When finishing a bounded task, update `docs/coordination.md` with the handoff record, release the writer role, and run `npm run handoff` to verify contracts and the production Go backend. Lesson checks are optional (see tutorial policy below). The Git Agent will automatically monitor, verify, and synchronize the repository.
- Before calling a bounded task finished, update `docs/coordination.md` in the same change with the task ID, owner/reviewer, base and resulting commit (or explicitly uncommitted state), changed files, checks and outcomes, remaining gates, next action, and writer release. Distinguish implementation complete, review complete, and deployed; none implies the others. Keep prior results attributed to the agent that ran them.
- Record new decisions or disagreements in the active ADR or `docs/claude-review.md`, and update `docs/backend-map.md` when architecture changes. Log outcomes and evidence, never secrets or private transcripts. The incoming agent must read the handoff; writing it does not notify or synchronize an already-running session.
- Keep the reviewer read-only unless the user or the current task explicitly assigns implementation. Do not recursively launch more agents by default.

## Bugs and broken UI/UX (Phase 6)

- When you find a bug or a broken UI/UX path, add it to `docs/bug-register.md` in the same change, even if you do not fix it. Take the next free ID; never renumber or reuse one.
- Fix entries in bounded `BUG-0NN` tasks. Fixing recorded bugs is approved. If an entry's Needs column says `owner`, write the options and ask before fixing. Only the owner defers an entry.
- A fix to contract-pinned behaviour follows "Change a contract" below. Every fix ships with something that would catch the bug again, and updates the entry's status with the task and commit.
- Fix each bug once (owner, 2026-10-14). Browser code stays in React, so UI bugs are fixed there. A backend bug is fixed in Go, after its route is cut over and the Next.js handler retired. A port first reproduces the Next.js behaviour, defects included, so the two can be compared before cutover; it does not fix them on the way. Do not fix a backend bug in a Next.js handler and then again in Go. The exception is a security, privacy or data-loss bug in live Next.js code, which is fixed where it is live, at once.
- Phase 7 (retiring old logic) does not start until Phase 6's gate in ADR-0002 is met.

## Low-capacity checkpoint (owner requirement)

- If the agent's visible remaining usage, token, or context budget reaches approximately **3–5%**, stop implementation immediately. Reserve that capacity for a durable handoff, not another code change or long test run. Also checkpoint when a usage-limit warning indicates that the session may end soon.
- Do not invent a remaining-usage percentage. If account usage is not visible, say so and use available context/budget warnings or the owner's low-usage notice. Do not promise automatic monitoring of an unavailable meter.
- Before stopping, update `docs/coordination.md` with the task ID, owner, branch and base/current commit, actual working-tree state and changed files, completed and unfinished work, exact checks run and their outcomes, tests not yet run, known failures, remaining gates, and the next concrete command or edit. Mark the task **paused / incomplete**, not complete. Never include secrets or private transcripts.
- Leave files in place. Do not reset, clean, stash, commit partial work merely to tidy it, or overwrite another agent's changes. Record any partial edit or currently failing check explicitly. Set **Active writer: none** after the checkpoint is written.
- If the bounded task is incomplete, do **not** run `npm run handoff` merely to signal completion: that script signals the Git Agent to synchronize. Use the documentation checkpoint and tell the owner the task needs pickup. Run the normal handoff only when the bounded task is actually complete and its checks can finish.
- The incoming agent must read the checkpoint, inspect Git status and the diff, then claim the writer role before continuing. A checkpoint does not notify a running agent; do not claim another agent has received or accepted it without evidence.

## The owner's Go tutorial

The owner is learning Go from this codebase. `learn-go/` is their tutorial, and it grows with the backend. Read `learn-go/README.md` before touching it.

- Every task that adds or changes Go in `backend/` adds or updates a lesson in the same branch. Explain the new Go ideas using the real code, add a small exercise with a test, and update the lesson index.
- When you change backend code that a lesson quotes or points to, update that lesson in the same commit.
- Generate/update lessons alongside Go changes; keep this work lightweight (owner, 2026-10-21). Lesson tests/vet/build are optional, requested explicitly rather than repeated during development or every handoff/CI run. Default `npm run handoff` records lessons as skipped, never passed; `npm run handoff -- --lessons` explicitly checks solutions. Manual CI has a `verify_lessons` option. Application/backend checks remain required.
- Exercises ship unfinished on purpose, so `go test ./...` inside `learn-go/` fails until the owner completes them. Do not complete them, and do not report those failures as application regressions. Optional solution checks use `go test -tags solution ./...`.
- Do not modify an existing `exercise.go`. It may hold the owner's work.
- Write for a JavaScript developer who is new to Go: plain words, short lessons, a JavaScript comparison where it helps.

## Migration constraints

- Preserve existing UI contracts on a port, including status codes, nulls, field names, and caching behavior. Record behavior that looks wrong as a `defect` fixture; do not silently fix or silently copy it.
- Change a contract only with the owner's approval, and change the fixtures and every implementation of that route in one commit.
- Read query strings and percent-encode with `backend/internal/jscompat` wherever a contract pins the result. Go's `net/url` behaves differently from the JavaScript the contracts were recorded from.
- Keep Supabase Auth, database, Storage, and Realtime initially. Preserve user-scoped authorization; a privileged database connection is not equivalent to the current user-scoped client.
- Do not hand-parse Supabase SSR cookies in Go. Design a verified bearer-token boundary while the existing Next.js session machinery remains.
- Do not infer live RLS, triggers, RPC bodies, or deployed services from source calls. Obtain and verify their definitions before migrating affected writes.
- Keep semantic-search embedding models, dimensions, vector columns, RPC signatures, and result formats consistent. Equal vector dimensions do not make different models compatible.
- Add a third-party Go dependency only when the standard library cannot reasonably do the job, and record why in the ADR.
- No performance or cost claims without measurements. Keep rollback per route/domain and avoid dual writes.
- For application changes, run relevant checks and report existing failures honestly. Documentation-only changes need link/reference and diff checks, not a production build.
