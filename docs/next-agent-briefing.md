# Briefing for the next agent (written 2026-10-29)

Written by Claude Code at the end of a long session, for an agent with no context of this project. It does not replace the repository's own instructions; it tells you where they are, what state the work is in, what to do next, and the traps that cost time. If anything here disagrees with `docs/coordination.md`, the coordination file is newer and wins.

**Update 2026-10-30 (Codex, ROUTE-CLOSE-001 / TREND-001c):** local hashed-key v1 runtime/Next forwarding wiring is implemented and reviewed, with a production localhost routing receipt; no live activation. The owner explicitly approved the exact one-key development replacement addendum and a narrow Phase 6 retirement exception. The reviewed 153-line refresh deletion patch is now applied locally; no helper/table/data cleanup. Read `plans/route-completion-review.md` and the latest coordination records before continuing. The development run is authorized but fresh Dashboard/catalog preflight is blocked by unavailable browser access; no new material/users/tokens/run were created. Do not ask for the same approval again. Overall route closure remains incomplete until hosted acceptance and separate rollout gates. Pack census: 27 fixes, four done, 23 remaining, plus two larger choices and open UI R-205.

## 1. What this project is

SEFGH is a Next.js (App Router, JavaScript) site backed by Supabase, deployed on Vercel. Its API is being migrated, route by route, to a Go backend in `backend/` (standard library only). Every route and every browser data area now runs on Go in production; the old Next.js handlers stay in the code as the rollback path until Phase 7 removes them. The current phase is **Phase 6: fix every recorded bug** (`docs/bug-register.md`), mostly in Go.

The owner (the user) is learning Go from this codebase (`learn-go/`), prefers plain language, wants steady progress, and prefers decisions collected into one pack rather than asked one by one.

## 2. Read these first, in this order

1. `AGENTS.md`: the shared rules for every agent. (Claude Code also loads `CLAUDE.md`, which imports it.) Non-negotiable; summarised in section 6 below.
2. `docs/coordination.md`: the top ("Current state", "Active writer") and the newest handoff records, from **DECISION-PACK-002** down to **OWNER-ANSWERS-003**. Each record lists changed files, checks and the next step.
3. `docs/plans/phase6-decision-pack-2.md`: 28 open bugs whose fixes change a contract, each with a recommendation. **Owner answered on 2026-10-29: recommendation A for every item; see the recorded answer in the pack and ADR.**
4. `docs/bug-register.md`: every bug, through R-205. The last column is the status; "Needs" says whether a fix needs the owner (`owner`), a contract change (`contract`) or nothing (`—`).
5. `docs/adr/0002-go-backend.md`: the accepted plan (phases and gates) and the decisions log (newest rows dated 2026-10-28 and 2026-10-29).
6. `docs/cutover.md`: the switches (`SEFGH_GO_ROUTES`, `NEXT_PUBLIC_SEFGH_GO_DATA`, `SEFGH_GO_API_URL`) and what is switched on in production.
7. `backend/README.md`: how the Go routes are built, switched and tested; each contract's own `contracts/<name>/README.md` explains its fixtures and versions.
8. `learn-go/README.md`: the rules for the owner's tutorial (you must update lessons when you change Go).
9. `docs/verification/handoff-concurrency.md`: the verification lease used by `npm run handoff`.
10. `docs/database/user-db.md` and `supabase/README.md`: the live database as last read, and how database changes are made.
11. When you touch a route: its handler in `backend/internal/<package>/`, its contract in `contracts/<name>/` (`cases.json` and `README.md`), its Node test in `scripts/contracts/<name>.test.mjs`, and the lesson that quotes it (`grep -rl "internal/<package>" learn-go`).

## 3. State on 2026-10-29

**Production:**

- Website `sefgh-main.vercel.app`; Go service `sefgh-api.vercel.app`.
- The owner set, on `sefgh-main` Production:
  - `SEFGH_GO_ROUTES` to every route name, including the three `ai-` names (they may since have removed those, as advised);
  - `NEXT_PUBLIC_SEFGH_GO_DATA` to all eleven data areas.
- Check what Go answers with `curl -s -D - -o /dev/null https://sefgh-main.vercel.app/<path>`. Go's replies carry `X-Sefgh-Backend: go`.

**Not yet done by the owner (do not do these for them):**

- Add `GITHUB_TOKEN` (fine-grained, Models: read-only), and optionally `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`, to `sefgh-api`. Without them, chat fails and suggestions fall back; enhance falls back too.
- Add `NEXT_PUBLIC_SITE_URL=https://sefgh-main.vercel.app` to `sefgh-api`.
- Redeploy both projects, so BUG-026 to BUG-036 go live.
- Do one signed-in pass on the site.
- Decision pack 2 is answered: all A (2026-10-29). Its fixes remain queued as bounded tasks; R-011 is deferred until after Phase 7 and GitHub-token checks stay immediate.
- Renew the domain `sefgh.org` in November.
- Later, drop the backup schema `r078_backup` (section 4 of `supabase/checks/r078_rollback.sql`).

**Fixed and committed this session** (each has a handoff record in `docs/coordination.md`):

| Task | Fix |
|---|---|
| BUG-024 | R-203 |
| BUG-025 | R-014 |
| BUG-026 | R-086 |
| BUG-027 | R-088 |
| BUG-028a and BUG-028b | R-040 and R-075 |
| BUG-029 | R-034 |
| BUG-030 | R-026 |
| BUG-031 | R-042, sessions only |
| BUG-032 | R-102 |
| BUG-033 | R-041 |
| BUG-034 | R-017, its decided part |
| BUG-035 | R-083 |
| BUG-036 | R-063 |
| BUG-037 | R-076 (Codex; full local handoff passed, deployment pending) |
| BUG-038 | R-064 (Codex; full local handoff passed, deployment pending) |
| BUG-039 | R-016 (Codex; committed 66024e6, deployment pending) |
| BUG-040 | R-021 (Codex; catalog language acceptance, deployment pending) |
| BUG-041 | R-022 (Codex; fixed UTC windows in both trending endpoints, deployment pending) |
| BUG-042 | R-023 (Codex; API rate-limit metadata, deployment pending; UI follow-up R-205 open) |
| BUG-043 | R-024 (Codex; safe colour map and C++ query regression, deployment pending) |

**Database:** R-078 and R-103 were applied to production on 2026-10-28 by the owner in the Supabase SQL Editor and verified read-only (files in `supabase/migrations/` and `supabase/checks/`).

**Next free IDs:** task **BUG-044**, register entry **R-206**. Never reuse or renumber.

## 4. Your work queue, in order

1. **Claim the writer role** (section 5, step 1) before editing anything.
2. **If the owner has answered decision pack 2**, fix each approved entry as its own bounded task (BUG-037, BUG-038, …), following section 5. Record the answers in `docs/plans/phase6-decision-pack-2.md` and an ADR decisions-log row first. Entries the owner chose B for: record the decision and leave or defer as they said. **If they have not answered**, do item 3 meanwhile, and do not fix pack entries.
3. **R-064 and R-076 completed locally in BUG-038 and BUG-037 (Codex, 2026-10-29).** Activity contract v3 pins 1000-row pages, offsets and stable date/type ordering; vote contract v2 skips the missing RPC. Both retain rollback Next.js characterization. Deployment and independent review remain pending. R-016 is also completed locally in BUG-039 (search contract v5); R-021 is implemented in BUG-040 (trending contract v5); R-022 is implemented in BUG-041 (repository v6/developers v3); R-023 is implemented in BUG-042 (repository v7/developers v4); R-024 completed locally in BUG-043 (trending contract v8, uncommitted); next is BUG-044 for R-025, then the remaining approved pack entries in order. R-205 records the browser hook discarding rate-limit metadata; it is open.
4. **R-038**, after the owner adds the AI keys. Check whether visitors reaching Go through the website's rewrite are told apart by the AI allowance: Go project logs, or signed-in chat from two addresses. An outside probe of suggestions cannot tell, because over the allowance they answer 200 with the fallback.
5. **The signed-in walk-through (BUG-002)** needs the owner's test account.
   - The file sits outside the repository, at `D:\Users\Windows\Downloads\` (`sefgh mail and password for testing.txt`).
   - **Never open it to copy its contents anywhere, never paste a password, never ask for one.**
   - If the owner wants it done, ask them how.
6. **Phase 7** (retire the Next.js handlers, the browser's direct Supabase paths and the switches) starts only when Phase 6's gate in the ADR is met.
7. **Parked; do not start without the owner:**
   - RepoSync (R-189 to R-198): not deployed.
   - Analysis and search workers (R-116 to R-123): worker-execution gate.
   - Playground keys (R-039, R-127 to R-143, R-177, R-182): the owner stopped signing changes. A from-scratch redesign, KEYS-REDESIGN-001, was proposed and not started.

## 5. How a fix is done here (the recipe behind every fix from BUG-024 to BUG-036)

1. **Claim.** Run `git status --short` and `node scripts/agent-handoff.mjs --status`. If the state is `VERIFICATION_BUSY`, wait (see the traps). In `docs/coordination.md`, set the `- **Active writer:**` line to you, the task ID, the files you will touch and the base commit.
2. **Read the live facts** you depend on: the handler, the contract cases, and for the database a read-only catalog query (the Supabase connector's `execute_sql` works for reads).
3. **Change Go.** Then run `gofmt -l .` (it must print nothing), `go vet` and `go test -count=1` on the package.
4. **Bump the contract version.**
   - **Build the new `cases.json` with a script.** Write it with the file tool into your scratch folder. Assert that the old file round-trips (or insert text, if the file is hand-formatted), and that every unchanged case is identical afterwards.
   - **Keep the old handler's answers.** Where the old Next.js handler still answers differently (fix-once rule: it keeps its behaviour until Phase 7), store its answer on the case as `next_expect`. Where possible, record it by running the real handler through the shared runner (`scripts/contracts/*-fixture.mjs`). The search contract uses `next_expect_upstream_url` and `next_expect` instead.
   - **Update the Node test.** It compares against `c.next_expect ?? c.expect` and asserts the new version. Add an integrity check that would catch the bug coming back.
   - **Update the Go contract test** to pin the new version.
5. **Prove the test catches it.** Copy the changed file aside, record its SHA-256, break the fix (for example with `sed`), run the tests and expect failures. Restore, and confirm the hash is identical. Write the failing test names into your handoff record.
6. **Update a lesson.** Required for any Go change: find the lesson that quotes the code. Explain the new Go idea in plain words with a JavaScript comparison. **Never modify an existing `exercise.go`.** Lesson tests are optional and not part of the handoff.
7. **Update the docs:**
   - the contract `README.md` (a "Version N" paragraph at the top);
   - the register row's status ("fixed in Go (BUG-0NN, date): …");
   - `backend/README.md` and `docs/backend-map.md` if they describe the old behaviour.
8. **Run the checks** if browser code changed: `npm run lint` (zero warnings allowed) and `npm run build`. `npm run test:contracts` runs all Node contract tests.
9. **Write the handoff and run it.**
   - Add a "Handoff: BUG-0NN …" section at the top of the handoff list in `docs/coordination.md`: status, base, the change, checks with real results, changed files, next step, "Writer released: yes".
   - Set the active writer to none.
   - Run `npm run handoff`. It runs every contract and the Go tests, vet and gofmt; lessons are skipped by policy.
   - The **Git Agent** (an automated process, not you) commits and pushes afterwards. Do not commit yourself unless the owner asks.

## 6. Rules you must not break

All from `AGENTS.md` and the owner:

- **One writer** in this checkout. Do not reset, clean, stash or overwrite anyone's work. If a file you did not touch changes, note it in your record and leave it.
- **Fix once.** A backend bug is fixed in Go, not in the Next.js handler, except security, privacy or data-loss bugs in live code. Browser and UI bugs are fixed in React.
- **Contracts change only with the owner's approval** (decision packs count). Fixtures and every implementation of the route change in one commit.
- **Database changes** only as reviewed files in `supabase/migrations/`, applied to production only with the owner's explicit approval. Test on the dev project first: write a script that rolls itself back and prints its results.
- **Secrets.** Never copy `.env.local`, tokens, keys, cookies or passwords into files, chat or records. Reading only variable *names* is fine.
- **Low capacity.** If your remaining budget nears 3–5%, stop, write a "paused / incomplete" checkpoint in `docs/coordination.md`, release the writer role, and do **not** run `npm run handoff`.
- **No guessing on blocked items.** If a tool or permission check refuses an action, do not route around it. Record it and ask the owner.

## 7. Traps that cost time in the last session

**Running Go:**

- Go lives at `%LOCALAPPDATA%\Programs\Go\bin`. In Git Bash: `export PATH="$(cygpath "$LOCALAPPDATA")/Programs/Go/bin:$PATH" GOFLAGS=-p=2`.

**Shell and file editing:**

- Prefix commands that pass `/api/...` arguments with `MSYS_NO_PATHCONV=1`, or Git Bash rewrites the paths.
- **Shell escaping breaks backslashes.** Heredocs and `python -c` turned `\\` into `\` and `\v` into a vertical tab. In `sed` replacements, `\u` means "uppercase". Write Python or Node scripts with the file-writing tool, then run them. Scan changed files for control characters afterwards: `git diff --name-only | xargs grep -l -P '[\x00-\x08\x0b\x0c\x0e-\x1f]'`.
- **Line endings.** Some files are CRLF, for example `contracts/github-search/*`, `scripts/contracts/github-search.test.mjs` and some lessons. Read them, normalise to LF, edit, and write them back with their original endings.
- **Formatting.** Some `cases.json` files are hand-formatted (`github-search`, `activity`). Insert new cases as text; never re-serialise the whole file. Others round-trip exactly through `JSON.stringify(x, null, 2) + '\n'`; check before rewriting.

**The Git Agent and the verification lease:**

- The Git Agent's watcher starts its own `node  scripts/agent-handoff.mjs` (note the two spaces) when the coordination file says a task is complete.
- If your `npm run handoff` says "Verification lease unavailable", find the process ID with `--status` and wait for it. In PowerShell: `Wait-Process -Id <pid> -Timeout 540`. Then check `--status`. `READY_VERIFIED` with `signalMatchesTree: true` means it verified your tree, and you need not rerun.
- "Source changed during verification" means the Git Agent committed meanwhile; rerun.
- Never reset a lease.
- **The Git Agent's sync can overwrite uncommitted edits to `docs/coordination.md`.** On 2026-10-29 it rewrote the file from an older copy and the DECISION-PACK-002 record was lost (restored with BRIEFING-001). Run `npm run handoff` soon after writing your record, and after the sync commit check that your record is still there (`grep` for your task ID).

**Connectors and permissions:**

- **The Supabase connector declines destructive SQL** (drops, `apply_migration`) in this environment. The owner runs migrations in the Supabase SQL Editor; you verify them with read-only queries.
- **Supabase projects:**
  - Production User-DB: `kohwfuxqbllsmvmsfqci`.
  - Dev: `sefgh-migration-dev`, `mraglhrenqwadegvwxts`.
  - Repo-DB: `kiadrbqkkmncoblpcobo`, inactive.
- **The Vercel connector cannot open the team.** Verify from outside with curl headers, and with `MSYS_NO_PATHCONV=1 node scripts/compare-deployments.mjs https://sefgh-main.vercel.app https://sefgh-api.vercel.app --switched=<names>`. That script only probes the GitHub routes.
- **The automatic permission check** may refuse changes to shared resources. Stop and ask; do not work around it.

**Testing and design pitfalls:**

- **Shared stand-in answers.** Contract stand-in answers are handed out in order and shared by both implementations. Changing them changes what the old Next.js handler sees, so re-record its `next_expect`.
- **Run the whole Go suite.** Fixes also break wiring tests in `backend/cmd/api` (`*_wiring_test.go`), and older unit tests can pin the old behaviour (for example `TestSignInFailuresAreAll401`, renamed `TestSignInFailures`). A package-only run misses them; `npm run handoff` will catch them.
- **GitHub reads `created:>DATE` as after that whole day.** Use a timestamp, or `>=`, when you mean "the last N days" (R-203).

## 8. Commands you will use

```text
git status --short ; git log --oneline -5
node scripts/agent-handoff.mjs --status
cd backend && go test -count=1 ./... && go vet ./... && gofmt -l .
node --test scripts/contracts/<name>.test.mjs
npm run test:contracts ; npm run lint ; npm run build
npm run handoff
```

## 9. When you finish or stop

- Leave `docs/coordination.md` accurate: a handoff record, the active writer set to none, and the next step named.
- Tell the owner in plain words what changed for users, what is live and what is not, and what you need from them, in one list.
- Update this briefing's section 3 and the queue if they no longer hold, or say in coordination that the briefing is out of date.
