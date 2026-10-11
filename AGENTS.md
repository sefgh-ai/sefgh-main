# SEFGH shared agent instructions

These instructions are shared by Codex and Claude Code. User instructions take precedence.

## Read before working

1. `docs/coordination.md` for current scope, ownership, and handoff.
2. `docs/backend-map.md` for observed architecture and source pointers.
3. `docs/adr/0002-go-backend.md` for the accepted Go migration, how a route moves, and the gates.
4. `docs/claude-review.md` for review findings and reconciled differences.

`docs/adr/0001-rust-backend.md` is superseded and kept only as a record. Do not implement it.

Check `git status --short` and the current commit before editing. The architecture snapshot is based on commit `42759dd`; recheck affected source when it changes. The accepted ADR authorizes its staged plan. It does not authorize skipping a phase gate, cutting a route over, or deploying.

## Project facts

- Next.js App Router, JavaScript/JSX, React, Tailwind, Supabase.
- API handlers: `src/app/api/**/route.js`. Auth callback: `src/app/auth/callback/route.js`. Session refresh: `src/proxy.js`.
- Go backend: `backend/`, one Go module using only the standard library. Routes move there one at a time and stay off until enabled by environment variables. See `backend/README.md`.
- Contracts: `contracts/` holds fixtures that every implementation of a route must pass.
- Browser data access is substantial: `src/lib/supabase`, hooks, contexts, and playground components. Migrating API routes alone is not a full backend migration.
- Checks for the app: `npm run lint`, `npm run build`, and `npm run test:contracts` (fixtures against the Next.js handlers). There is no general `npm test` script. `npm run lint` already fails on the baseline; see `docs/backend-map.md`.
- Checks for Go, run inside `backend/`: `go test ./...`, `go vet ./...`, and `gofmt -l .`, which must print nothing.
- Go is installed for the owner's Windows user at `%LOCALAPPDATA%\Programs\Go\bin`. A shell started before the install may not find `go`; add that folder to `PATH` for the command.
- Local secrets live outside shared documentation. Never copy `.env.local`, tokens, cookie values, or private agent transcripts into handoffs.

## Cooperation

- Use one writer in this checkout. The other agent reviews read-only. Record the active task, owner, files, and base commit in `docs/coordination.md` before implementation.
- For concurrent implementation, use separate branches/worktrees and assign non-overlapping tasks first. Create worktrees from the branch named in `docs/coordination.md`, so they inherit these documents. A Markdown ownership record is a coordination convention, not a filesystem lock.
- Before taking over, confirm the previous writer has released the task and re-read the diff. Do not reset, clean, stash, or overwrite another agent's work.
- Keep decisions in the ADR and current progress in the coordination file. Avoid separate conflicting plans in private agent memory.
- Handoffs must state changed files, actual checks/results, unverified dependencies, and the next bounded task. Claim a peer review only when it actually ran.
- Keep the reviewer read-only unless the user or the current task explicitly assigns implementation. Do not recursively launch more agents by default.

## The owner's Go tutorial

The owner is learning Go from this codebase. `learn-go/` is their tutorial, and it grows with the backend. Read `learn-go/README.md` before touching it.

- Every task that adds or changes Go in `backend/` adds or updates a lesson in the same branch. Explain the new Go ideas using the real code, add a small exercise with a test, and update the lesson index.
- When you change backend code that a lesson quotes or points to, update that lesson in the same commit.
- Exercises ship unfinished on purpose, so `go test ./...` inside `learn-go/` fails until the owner completes them. Do not complete them, and do not report those failures as regressions. Check lessons with `go test -tags solution ./...`, which must pass.
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
