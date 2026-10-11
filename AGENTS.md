# SEFGH shared agent instructions

These instructions are shared by Codex and Claude Code. User instructions take precedence.

## Read before working

1. `docs/coordination.md` for current scope, ownership, and handoff.
2. `docs/backend-map.md` for observed architecture and source pointers.
3. `docs/adr/0001-rust-backend.md` for the proposed migration and its gates.
4. `docs/claude-review.md` for review findings and reconciled differences.

Check `git status --short` and the current commit before editing. The architecture snapshot is based on commit `42759dd`; recheck affected source when it changes. Do not treat proposals as implemented or accepted.

## Project facts

- Next.js App Router, JavaScript/JSX, React, Tailwind, Supabase.
- API handlers: `src/app/api/**/route.js`. Auth callback: `src/app/auth/callback/route.js`. Session refresh: `src/proxy.js`.
- Browser data access is substantial: `src/lib/supabase`, hooks, contexts, and playground components. Migrating API routes alone is not a full backend migration.
- `npm run dev`, `npm run lint`, `npm run build`, and `npm start` exist. There is currently no `npm test` script or Rust crate.
- Local secrets live outside shared documentation. Never copy `.env.local`, tokens, cookie values, or private agent transcripts into handoffs.

## Cooperation

- Use one writer in this checkout. The other agent reviews read-only. Record the active task, owner, files, and base commit in `docs/coordination.md` before implementation.
- For concurrent implementation, use separate branches/worktrees and assign non-overlapping tasks first. Ensure these shared documents are included in the branch used to create the worktrees; untracked files are not carried into a new worktree. A Markdown ownership record is a coordination convention, not a filesystem lock.
- Before taking over, confirm the previous writer has released the task and re-read the diff. Do not reset, clean, stash, or overwrite another agent's work.
- Keep decisions in the ADR and current progress in the coordination file. Avoid separate conflicting plans in private agent memory.
- Handoffs must state changed files, actual checks/results, unverified dependencies, and the next bounded task. Claim a peer review only when it actually ran.
- Keep the reviewer read-only unless the user or the current task explicitly assigns implementation. Do not recursively launch more agents by default.

## Migration constraints

- Preserve existing UI contracts on the first port, including status codes, nulls, field names, and caching behavior. Document intentional fixes separately; do not blindly preserve unsafe behavior.
- Keep Supabase Auth, database, Storage, and Realtime initially. Preserve user-scoped authorization; a privileged database connection is not equivalent to the current user-scoped client.
- Do not hand-parse Supabase SSR cookies in Rust. Design a verified bearer-token boundary while the existing Next.js session machinery remains.
- Do not infer live RLS, triggers, RPC bodies, or deployed services from source calls. Obtain and verify their definitions before migrating affected writes.
- Keep semantic-search embedding models, dimensions, vector columns, RPC signatures, and result formats consistent. Equal vector dimensions do not make different models compatible.
- No performance or cost claims without measurements. Keep rollback per route/domain and avoid dual writes.
- For application changes, run relevant checks and report existing failures honestly. Documentation-only changes need link/reference and diff checks, not a production build.
