# Codex and Claude Code coordination

Last updated: 2026-10-13 (Asia/Calcutta), by Claude Code: AI-002a handoff.

## Start here

**The plan is Go, not Rust.** The owner decided this on 2026-10-11, after Codex's last session. The accepted plan is `adr/0002-go-backend.md`. `adr/0001-rust-backend.md` is superseded and must not be implemented.

If you last saw this project when the plan was Rust, read `../AGENTS.md`, then this file, then `adr/0002-go-backend.md`. The rest of this file tells you what was built while you were away and what needs your review.

## Current state

- **Branch:** `main` (active default branch). Work from `go-backend` was merged into `main` at `030d875` and pushed to `origin/main`. Future branches/worktrees can branch off `main` or `go-backend` (which is kept fast-forwarded and in sync).
- **Active writer:** none. Claude Code completed and released AI-002a. REVIEW-006 and AI-002a are both uncommitted at handoff. No deployment or cutover by an agent.
- **Reviewer:** Claude Code reviewed GO-002a/b (`REVIEW-002`), GO-003/GO-004 (`REVIEW-003`), GO-007b, lesson 18, AI-001a with parts of GO-006b (`REVIEW-005`), and AUTH-001 and AUTH-002 (`REVIEW-006`). Codex reviewed GO-005a/b, FIX-003/004, VERIFY-001 and OPS-001a (`REVIEW-004`). Not independently reviewed: CI-001, VERIFY-002, VERIFY-003, AI-001b, AI-001c, and the fixes made inside REVIEW-005 and REVIEW-006. No route is approved to switch on. Details in `claude-review.md`.
- **Stage:** Eight of 25 API routes are implemented in Go (32% of routes, not of the whole migration); rewrites off by default. The three AI routes are at contract version 2 in Next.js, with the owner's sign-in rule, limits and safety fixes; their Go ports are next (AI-002b, AI-002c). Hosted CI, including the race detector, passed at `9480ef9`; the work since has not run there. No route is cut over and no new deployment evidence exists.

## Latest handoff: AI-002a, with REVIEW-006 still uncommitted beneath it (Claude Code, 2026-10-13)

Status: **implementation complete in Next.js with version 2 fixtures; awaiting independent review; not deployed by an agent; no Go route added or switched on**.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base 9480ef9f407571fe333bae48eb824181acfdba5e. The working tree holds two finished tasks: REVIEW-006 (its own record follows this one) and AI-002a. The Git Agent had not acted on REVIEW-006's signal when AI-002a began.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `9480ef9`).

Owner decisions this implements (2026-10-13, in the ADR decisions log): chat for signed-in users only with limits; the two search helpers public with limits; three safety defects fixed in every implementation. Only Next.js implements these routes today, so Next.js and the fixtures changed together.

What changed in behaviour:
- `POST /api/ai/chat`: 401 without a signed-in user (a bearer token verified online with Supabase, or the app's own session cookie); 503 if that check cannot be made; 429 with Retry-After past 30 requests in five minutes per user; messages must be `user` or `assistant` with text content; only `role` and `content` are forwarded; the most recent 20 messages and 8,000 characters are kept; every failure is the fixed 500 sentence.
- `POST /api/ai/suggestions`: fixed 500 sentence; 400 over 500 characters; past 30 AI calls in five minutes per address the built-in list answers.
- `POST /api/ai/enhance-query`: 400 over 500 characters; past the same allowance the basic enhancement answers.
These are live Next.js handlers on main. Whether Vercel deploys main automatically has not been inspected.

Judgment calls, for review:
- Chat drops the oldest messages beyond the limits and refuses only a newest message that is itself over 8,000 characters. The browser sends the whole conversation each time, so refusing would break every long chat. Consequence the owner should know: with long AI answers, 8,000 characters is roughly the last two or three exchanges of context. The numbers are constants in src/lib/ai/guard.js.
- The search helpers fall back to their built-in answers past the allowance; they do not answer 429. The allowance protects provider spend, and the search box keeps working.
- The allowance is counted per server process. On a platform that runs several instances it is weaker than its number says. A shared counter needs a store.
- A caller's address is the first entry of X-Forwarded-For. That is right behind a proxy that sets it and wrong if the server is reachable directly.
- src/lib/github/access.js now exports its one identity call as `askIssuer` so the chat sign-in check shares it. Behaviour is unchanged; the access tests still pass.

Changed files for AI-002a:
- New: src/lib/ai/{guard.js,session.js}, src/lib/supabase/verify-bearer.js, scripts/contracts/{ai-fixture-common.mjs,ai-chat-loader.mjs,ai-guard.test.mjs}.
- Changed: src/app/api/ai/{chat,suggestions,enhance-query}/route.js, src/lib/github/access.js, scripts/contracts/{chat-fixture.mjs,enhance-fixture.mjs,suggestions-fixture.mjs,ai-chat.test.mjs,ai-enhance-query.test.mjs,ai-suggestions.test.mjs}.
- Fixtures at version 2: contracts/ai-chat (42 -> 78 cases, 3 defect), contracts/ai-enhance-query (62 -> 73, 10 defect, no earlier case changed), contracts/ai-suggestions (35 -> 44, 7 defect); their READMEs.
- docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.
No Go and no lesson changed in AI-002a.

Checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- `npm run test:contracts`: 688 of 688.
- Every version 1 case whose answer changed was printed while re-recording: 13 in chat and 4 in suggestions, each one of the approved fixes; 1 chat case removed as a duplicate of another after the fix; none in enhance-query.
- 59 deliberate changes to the new code, applied in memory: 58 noticed at first; the miss got a case (`type-is-checked-before-length`) and is now noticed.
- ESLint on scripts/contracts, src/lib/ai, src/lib/supabase/verify-bearer.js, src/lib/github/access.js, src/app/api/ai and next.config.mjs: clean. `git diff --check`: exit 0.
- Production Next.js build with these handlers, through the forwarding probe: compiled successfully; 55 of 55 identical, exit 0.
- Go: unchanged by AI-002a. REVIEW-006's results stand: 9 packages, 19 lesson packages. `npm run handoff` reruns them.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: a real Supabase project or AI provider; the chat page in a browser; Vercel.

Remaining gates: independent review of AI-002a and of REVIEW-006's fixes; a browser check of chat signed in and signed out; live-provider checks; the browser must send a bearer token before chat can be served by Go; hosting, Vercel forwarding, measurements, rollback.
Next bounded action: AI-002b, Go ports of suggestions and enhance-query against these version 2 fixtures, with the limiter and UTF-16 counting in Go and a lesson. Then AI-002c, chat. QUOTA-001 is approved and not started; the owner still has to create the public-only token.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: AI-002a (Claude Code, 2026-10-13)

Earlier note: Claude Code owned this task; reviewer unassigned. Base main @ 9480ef9. REVIEW-006 below is finished and handed off but still uncommitted: `agent-handoff.mjs --status` said READY_VERIFIED for several minutes and the Git Agent did not act, so this task's files sit on top of REVIEW-006's 21 in the working tree. Hosted CI on 9480ef9 is green.
Owner decisions received today through four direct questions, now in the ADR decisions log: chat is for signed-in users only with limits; the two search helpers stay public with limits; fix three safety defects in Next.js and Go together; a public-only server token for anonymous GitHub reads is approved (QUOTA-001, not started).
Objective of AI-002a: contract version 2 of the three AI routes, in the only implementation that exists (Next.js), with fixtures. That is the contract the Go ports (AI-002b, AI-002c) must then meet.
Plan: 1) shared limits and message checks in src/lib/ai/guard.js; 2) session check for chat (bearer verified online, or the app's own cookie session); 3) the three handlers; 4) harnesses and re-recorded fixtures, every changed case listed; 5) in-memory handler changes to check the fixtures notice; 6) READMEs, full contracts, lint, handoff. No Go change in this task, so no lesson and no probe.
Nothing of AI-002a written yet beyond this checkpoint and the ADR decisions rows. Milestone 1 (AI-002a): handlers, shared modules, harnesses and version 2 fixtures are written and pass. New source: src/lib/ai/{guard.js,session.js}, src/lib/supabase/verify-bearer.js. Changed source: the three src/app/api/ai/*/route.js handlers; src/lib/github/access.js (its one identity call is now the exported askIssuer, shared with verify-bearer; behaviour unchanged, access tests 43 of 43). New test files: scripts/contracts/{ai-fixture-common.mjs,ai-chat-loader.mjs,ai-guard.test.mjs}; changed: the three AI harnesses and runners. Fixtures re-recorded at version 2: ai-chat 42 -> 78 (3 defect), ai-enhance-query 62 -> 72 (10 defect, no earlier case changed), ai-suggestions 35 -> 44 (7 defect). Every changed case was printed and is one of the three approved fixes. Focused run of the three AI test files: 201 of 201. Judgment call: chat drops the oldest messages beyond 20 messages or 8,000 characters and refuses only a newest message that is itself too long, because the browser sends the whole conversation each time and a refusal would break every long chat. Still to do: fixture sensitivity, the three contract READMEs, full contracts, lint, a production build, handoff. If interrupted: the v1 fixture files are saved outside the repository; nothing else is half-written.
No processes running. Account usage is not visible to Claude Code.

## Handoff: REVIEW-006 (Claude Code, 2026-10-13)

Status: **review complete with fixes; awaiting an independent look at the fixes; not deployed; no route switched on**.
Owner: Claude Code. This task is the independent review of Codex's AUTH-001 and AUTH-002. Nobody has reviewed the fixes it made.
History: stopped at the owner's instruction part-way through and resumed the same day from the checkpoint below. Nothing was committed in between.
Branch main; base 9480ef9f407571fe333bae48eb824181acfdba5e.
Resulting commit: uncommitted; the Git Agent synchronizes after the handoff hook.

Verdict: the access design holds; I found no way for a caller to get another user's data or the server's token. The tests did not hold, and that is what this batch fixes. Full record: REVIEW-006 in claude-review.md.

Deliberate breaks before any fix: Next.js 42 tried, 12 unnoticed; Go 27 that compiled, 13 unnoticed. The worst: in Go, giving the public handlers the server's GITHUB_TOKEN passed every test.
After the fixes: Next.js 46 of 46 noticed; Go 38 of 39, and the one left changes no behaviour.

What changed:
- backend/cmd/api/main.go: `newHandler` builds the server; `run()` and the tests both call it.
- backend/cmd/api/wiring_test.go (new): all five routes through `newHandler`, signed in and not, with a decoy server token; the credential on every request to GitHub is checked; a verified caller's token never follows a redirect.
- backend/cmd/api/{access_test.go,main_test.go}: the isolation test uses `newHandler`; the write-timeout guard adds the four seconds of verification.
- backend/internal/githubaccess/access.go: issuer replies read with jscompat.DecodeJSON and checked field by field as the Next.js check does; `DefaultTimeout` named; a `Timeout` field for tests.
- backend/internal/githubaccess/{access_test.go,review_test.go}, backend/internal/githubrepos/review_test.go: the missing tests.
- src/lib/github/access.js: a malformed identity entry is skipped; an identity id must be non-empty text; only status 200 is an answer; the deadline is `IDENTITY_DEADLINE_MS`.
- contracts/github-access/cases.json 15 -> 35; contracts/public-repository-reads/cases.json 14 -> 15; scripts/contracts/{github-access.test.mjs,public-repository-reads.test.mjs}.
- learn-go/16-verifying-access/README.md explains the changed Go. No exercise.go changed.
- docs/{coordination.md,claude-review.md,backend-map.md,adr/0002-go-backend.md}, backend/README.md, both contract READMEs.
Contract or decision changes: no version changed and no earlier case changed. Behaviour changed only for malformed issuer replies, where the two implementations used to disagree; none of those ever let a caller in.

Final checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 9 packages pass; `go build -o bin/api.exe ./cmd/api` ok.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` 19 packages pass.
- `npm run test:contracts`: 615 of 615.
- ESLint on scripts/contracts, src/lib/github/access.js and next.config.mjs: clean. `git diff --check`: exit 0.
- Production forwarding probe on the rebuilt binary: 55 of 55 identical, exit 0.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: live Supabase or GitHub, Vercel, a hosted CI run for this batch.

Remaining gates: independent review of these fixes and of CI-001, VERIFY-002, VERIFY-003; live-provider checks of the access boundary; the owner's four AI decisions; anonymous GitHub quota; hosting, Vercel forwarding, measurements, rollback.
Next bounded action that needs no decision: REVIEW-007, CI-001, VERIFY-002 and VERIFY-003 by the same method. With the owner's AI answers: AI-002.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: REVIEW-006 resumed (Claude Code, 2026-10-13)

Earlier note: the owner said "continue the implementation". Claude Code read the checkpoint below, found main still at 9480ef9 with the same 15 changed files and no other writer, and reclaimed the role.
Doing the five items the checkpoint lists, in order: full checks on the tree as it stands; rebuild and production probe; REVIEW-006 record in claude-review.md; contract READMEs, ADR, backend-map and task table; completed handoff.
No file changed yet since the pause except this one. No processes running. Account usage is not visible to Claude Code.

## Historical checkpoint: REVIEW-006 as it stood when the owner asked for a stop (Claude Code, 2026-10-13)

Earlier status, since resolved: stopped by the owner, who said "stop and save a checkpoint here". Implementation stopped at once. Not ready for synchronization: `npm run handoff` was NOT run for this task and must not be run until it is finished.
Task: REVIEW-006, the independent review of Codex's AUTH-001 and AUTH-002 by deliberate breaks, with fixes for what the breaks showed.
Owner: Claude Code until this checkpoint; writer released below. Reviewer of these fixes: nobody yet.
Branch main; base and current HEAD 9480ef9f407571fe333bae48eb824181acfdba5e. All changes below are uncommitted. Nothing is deployed and no route is switched on.

Working tree, exactly (`git status --short`):
- Modified: backend/cmd/api/{access_test.go,main.go,main_test.go}, backend/internal/githubaccess/{access.go,access_test.go}, contracts/github-access/cases.json, contracts/public-repository-reads/cases.json, docs/coordination.md, learn-go/16-verifying-access/README.md, scripts/contracts/{github-access.test.mjs,public-repository-reads.test.mjs}, src/lib/github/access.js.
- New: backend/cmd/api/wiring_test.go, backend/internal/githubaccess/review_test.go, backend/internal/githubrepos/review_test.go.
- No exercise.go changed.

Finished:
- Deliberate breaks before any fix. Next.js side (access.js, repoData.js, starred route), 42 applied in memory: 30 noticed, 12 not. Go side (githubaccess, cmd/api wiring, githubrepos), 29 in a scratch copy: 14 noticed, 13 not, 2 of the breaks themselves did not compile.
- The worst miss: in Go, giving the public handlers the server's GITHUB_TOKEN, or giving a verified caller's handlers no token, passed every test, because the isolation test built its own copy of the wiring and never ran the server's.
- Fixes written: `newHandler` in cmd/api/main.go is now what both `run()` and the tests use; wiring_test.go checks the credential on every upstream request for all five routes, signed in and not, with a decoy server token, and that a verified caller's token never follows a redirect. githubaccess checks each field of an issuer reply as the Next.js check does (through jscompat.DecodeJSON), with DefaultTimeout as a named constant and a Timeout field for tests. src/lib/github/access.js skips a malformed identity entry, requires a non-empty text id, treats only status 200 as an answer, and names its deadline IDENTITY_DEADLINE_MS. Shared access cases 15 -> 35; public-repository-reads cases 14 -> 15 and one more row in the starred test. The write-timeout guard now adds the four seconds of verification. Lesson 16 explains the changed Go.
- Deliberate breaks after the fixes: Next.js 46 of 46 noticed. Go 37 of 39: one of my breaks did not compile ("identities that are not a list"; the shared case of that name covers it), and one survived ("identity reply size unlimited"), which is an equivalent change, because the reader already stops one byte past the limit and the cut-off JSON fails to decode.

Checks actually run on the fixes, and when:
- `npm run test:contracts`: 615 of 615, and backend `go test -count=1 ./...` 9 packages, gofmt and vet clean. These ran BEFORE two later edits: the `github-id-fraction` case was tightened and lesson 16 was edited.
- After those edits only this was rerun: scripts/contracts/github-access.test.mjs 41 of 41, and `go test -count=1 ./internal/githubaccess` ok.

NOT done, in order:
1. Rerun on the tree as it stands: `npm run test:contracts`; in backend `gofmt -l .`, `go vet ./...`, `go test -count=1 ./...`; in learn-go `go vet ./...`, `go vet -tags solution ./...`, `go test -count=1 -tags solution ./...`; `npx eslint scripts/contracts src/lib/github/access.js`; `git diff --check`.
2. Rebuild `backend/bin/api.exe` and run `node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production` (expected 55 of 55). Go changed, so the probe is needed.
3. Insert the REVIEW-006 record into docs/claude-review.md. It is drafted outside the repository and not yet in any committed file; if the draft is lost, this checkpoint has every fact it contains.
4. Update contracts/github-access/README.md (35 cases; the aligned rules) and contracts/public-repository-reads/README.md (15 cases); add a short note to the ADR and backend-map.md; update the task table row for REVIEW-006.
5. Turn this checkpoint into a completed handoff, then `npm run handoff`.

Known failures: none known. No test is known to fail on the current tree, but item 1 has not been run in full since the last two edits.
Processes: none running. The background runs have ended.
Remaining gates, unchanged: owner's four AI decisions; anonymous GitHub quota; hosting; live Supabase and GitHub checks; Vercel forwarding; measurements; rollback. Independent review still missing for CI-001, VERIFY-002, VERIFY-003 and for these fixes.
Account usage is not visible to Claude Code; no remaining percentage is claimed.

Pickup prompt: "Read AGENTS.md and the REVIEW-006 PAUSED / INCOMPLETE checkpoint at the top of docs/coordination.md. Run git status --short and git diff, confirm Active writer is none, claim the writer role, then do the five NOT done items in order."

Recorded on arrival, still true: the Git Agent committed the two earlier batches as b5745b3 and 9480ef9, and `node scripts/agent-handoff.mjs --status --ci` reported the Backend verification run 38360938461 on 9480ef9 as completed, success. That run includes `go test -race` on Linux. Claude Code read the status through the script and did not open the logs.

## Earlier working notes for REVIEW-006 (superseded by the checkpoint above)

Earlier note: Claude Code owns this task; it is itself the independent review of Codex's AUTH-001 and AUTH-002. Base/current main @ 9480ef9; tree clean at start; previous writer released.
Recorded on arrival: the Git Agent committed the last two batches as b5745b3 and 9480ef9. `node scripts/agent-handoff.mjs --status --ci` reported the Backend verification run 38360938461 on 9480ef9 as completed, success. That run includes `go test -race` on Linux and covers both batches. Claude Code read the status through the script and did not open the logs.
Plan: 1) read the current access code and AUTH-002's changes; 2) deliberate breaks of access.js in memory and of access.go in a scratch copy; 3) fix only what the breaks or reading show, with tests; 4) REVIEW-006 record; 5) checks and handoff.
Milestone 1: deliberate breaks run; no repository file changed yet. Next.js side (access.js, repoData.js, starred route), 42 breaks applied in memory: 30 noticed, 12 not. Go side (githubaccess, cmd/api wiring, githubrepos), 29 breaks in a scratch copy: 14 noticed, 13 not, 2 of my own breaks did not compile. The important misses: in Go, giving the public handlers the server GITHUB_TOKEN, or giving private handlers no token, passes every test, because the isolation test builds its own wiring and never runs the server's; in both, accepting an identity from any provider, a user with no id, an unchecked GitHub id, oversized credentials, missing configuration, a missing public key header, an oversized identity reply and a longer deadline all pass. Reading also confirmed two mismatches on malformed issuer replies (an identity id that is a number; a null identity entry).
Milestone 2: fixes written. Changed: backend/internal/githubaccess/access.go (replies checked field by field as the Next.js check does; DefaultTimeout and a Timeout field), backend/cmd/api/main.go (newHandler, used by run() and by tests), backend/cmd/api/{access_test.go,main_test.go}, backend/internal/githubaccess/access_test.go, src/lib/github/access.js (only a 200 is an answer; malformed identity entries skipped; deadline constant), scripts/contracts/{github-access.test.mjs,public-repository-reads.test.mjs}, contracts/github-access/cases.json (15 -> 35), contracts/public-repository-reads/cases.json (14 -> 15). New: backend/cmd/api/wiring_test.go, backend/internal/githubaccess/review_test.go, backend/internal/githubrepos/review_test.go.
Next: rerun both sets of deliberate breaks; lesson 16 text; REVIEW-006 record; full checks and production probe; handoff. If interrupted: `git diff` shows any partial edit; the scratch scripts are outside the repository. No processes running. Account usage is not visible to Claude Code.

## Handoff: AI-001b / AI-001c / AI policy proposal (Claude Code, 2026-10-13)

Status: **fixtures and documentation complete; awaiting independent review; no source, Go or route change; not deployed**.
Owner: Claude Code. Reviewer: unassigned; no peer review claimed.
Branch main; base b5745b32d68a75d3bddf4926ae098da4d7cf23cc.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `b5745b3`).

Done:
- AI-001b: 62 fixtures (10 defect) for `POST /api/ai/enhance-query`. The real handler runs; the two provider keys, global fetch and console.error are replaced and restored.
- AI-001c: 42 fixtures (16 defect) for `POST /api/ai/chat`. The real handler and the real `src/lib/ai/github.js` run, so the provider request (address, headers, model, system prompt) is pinned as well.
- A proposal for the owner in adr/0002-go-backend.md: four decisions, each with a recommendation, that the AI ports wait for.
- Every Phase 2 route now has fixtures. Eight are ported (the GitHub reads); the three AI routes are recorded only.

Findings worth the owner's attention (recorded as `defect` cases, nothing fixed):
- Chat checks no caller and no limit, and a caller's system message replaces the application's. It is an open relay to the model on the server's `GITHUB_TOKEN`.
- Chat returns provider and internal error text to the caller.
- Enhance-query answers 500 on any provider failure and does not use its own basic enhancement as a fallback.

Changed files (all new except the shared docs):
- scripts/contracts/{enhance-fixture.mjs,ai-enhance-query.test.mjs,chat-fixture.mjs,ai-chat.test.mjs}
- contracts/ai-enhance-query/{cases.json,README.md}, contracts/ai-chat/{cases.json,README.md}
- docs/{coordination.md,adr/0002-go-backend.md,backend-map.md}
No file under src/, backend/ or learn-go/ changed, so no lesson and no production probe.

Checks (Claude Code, Windows, Node 21.7.1):
- The two new test files: 106 of 106.
- `npm run test:contracts`: 589 of 589.
- Fixture sensitivity: 63 changes to the two handlers and the helper, applied in memory through a module loader so no source file was written. 62 were noticed at first; the miss, one trigger word, got its own case and is now noticed.
- ESLint on scripts/contracts: clean. `git diff --check`: exit 0.
- npm run handoff: run after this record was saved; a failure would be recorded here by a further edit.
Not checked: any live provider, key, model name, address or usage. Three failures whose message is the JavaScript engine's own wording are described in the chat README and not pinned.

Remaining gates: owner's four AI decisions before any AI port; independent review of this batch and of AUTH-001, AUTH-002, CI-001, VERIFY-002, VERIFY-003; a hosted CI run that includes the last two batches; anonymous GitHub quota; hosting, Vercel forwarding, measurements, rollback.
Next bounded action that needs no decision: REVIEW-006, independent review of AUTH-001 and AUTH-002 with full suites and deliberate breaks. With the owner's answers: AI-002, the session check and limits in Go.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical checkpoint: AI-001b / AI-001c / AI policy proposal (Claude Code, 2026-10-13)

Status: active. Claude Code owns this batch; reviewer unassigned. Base/current main @ b5745b3 (the Git Agent committed the previous batch); tree clean at start; previous writer released.
Objective: record what the two remaining AI routes do today, before any port. enhance-query calls OpenAI or Anthropic directly; chat calls GitHub Models through src/lib/ai/github.js. Only global fetch and the environment are replaced; the real handlers and the real helper run. Fixture keys are obvious fakes. No provider is contacted and no real key is read.
Plan: 1) enhance-query harness, cases, runner, README; 2) chat harness, cases, runner, README; 3) deliberate in-memory handler changes to check the fixtures notice; 4) policy proposal in the ADR; 5) full contracts, ESLint, diff check, handoff. No Go change, so no lesson and no production probe.
Milestone 1: both harnesses, runners and fixture files are written and pass. New files: scripts/contracts/{enhance-fixture.mjs,ai-enhance-query.test.mjs,chat-fixture.mjs,ai-chat.test.mjs}, contracts/ai-enhance-query/cases.json (62 cases, 10 defect), contracts/ai-chat/cases.json (42 cases, 16 defect). Focused run of the two test files: 106 of 106. ESLint on scripts/contracts clean. Fixture sensitivity: 63 changes to the handlers and the helper, applied in memory only, 62 noticed at first; the miss (one trigger word) got its own case and is now noticed. No source file under src/ or backend/ changed.
Still to do: the two contract READMEs, the policy proposal in the ADR, shared docs, full contracts, diff check, handoff. If interrupted: the fixture files are complete and self-checking; only documentation is missing. No processes running. Account usage is not visible to Claude Code.

## Handoff: GO-007b / lesson 18 / AI-001a / REVIEW-005 (Codex implementation; Claude Code review and completion, 2026-10-13)

Status: **bounded local implementation complete and reviewed by the other agent; not deployed; no route switched on**.
Owner: Codex wrote GO-007b, lesson 18 and AI-001a and stopped on a usage limit at its pre-final checkpoint. Claude Code took the batch over at the owner's instruction, ran the outstanding checks, reviewed it (REVIEW-005 in claude-review.md) and fixed what the review found. Codex has not seen those fixes.
Branch main; base 259ff7ba125bfb367e3fbba211e277a05f41476d.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `259ff7b`).

What the batch contains:
- GO-007b (Codex): `GET /api/github/trending-developers` in Go, `backend/internal/githubdevelopers`. Public-only, no credential forwarded, four lookups at a time, 25 seconds for the whole request, off unless `github-trending-developers` is enabled.
- Lesson 18 (Codex): bounded parallel work.
- AI-001a (Codex): fixtures for `POST /api/ai/suggestions` with the AI call stubbed. No AI code in Go, no provider call.
- REVIEW-005 (Claude Code): findings and fixes below.

Codex's tree as found, checked by Claude Code before changing anything:
backend gofmt/vet clean; `go test -count=1 ./...` 9 packages; build; learn-go
vet both ways and 19 solution packages; `npm run test:contracts` 470/470;
ESLint on next.config.mjs and scripts/contracts clean; `git diff --check`
clean; production probe 55 of 55, exit 0.

Review fixes by Claude Code (all in this batch):
- Trending and trending developers logged nothing on failure. Each now takes a
  Logger and writes one error record per failed request: stage and cause,
  never the address. Wired in cmd/api/main.go.
- New `jscompat.DecodeJSON` reads a GitHub reply as `response.json()` does
  (leading byte-order mark skipped, digits kept, nothing after the value).
  Both handlers use it; before, a byte-order mark was a 500 in Go only.
- Developers: a search entry that is not an object, a login that is not a
  string, and a repository reply that is a string are now handled as the
  Next.js handler handles them.
- Fixtures added from the unchanged Next.js handlers, existing cases
  byte-identical, no version raised: developers 48 -> 57 (23 defect),
  trending 33 -> 34, ai-suggestions 32 -> 35.
- Lesson 18's test now requires two calls to really run together. Lesson 18
  and lesson 05 explain the new Go. No exercise.go changed.
- Two differences from Next.js are left on purpose, recorded in the ADR and
  pinned by a Go test each: a numeric login keeps its digits; an object reply
  with a `length` field counts as no repositories.

Final checks on the tree being handed off (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
- backend: gofmt -l empty; go vet clean; `go test -count=1 ./...` 9 packages pass; `go build -o bin/api.exe ./cmd/api` ok.
- learn-go: gofmt -l empty; go vet clean with and without the solution tag; `go test -count=1 -tags solution ./...` 19 packages pass; lesson 18 as shipped fails its test without panicking; its solution passed 5 runs.
- `npm run test:contracts`: 483 of 483.
- ESLint on next.config.mjs and scripts/contracts: clean. `git diff --check`: exit 0.
- Production forwarding probe on the rebuilt binary: 55 of 55 identical, exit 0.
- Differential check, developers route: 32 inputs outside the fixtures, Next.js against Go. 12 differed before the fixes; the two recorded differences remain.
- 21 deliberate breaks of the fixes in a scratch copy: 20 caught at first; the survivor led to one more fixture, after which it was caught.
- The test table for DecodeJSON and jsString was run against Node; one row was wrong (Node 21 accepts two byte-order marks) and is now a recorded difference.
- Hosted CI: `node scripts/agent-handoff.mjs --status --ci` reported the Backend verification run 38351494790 on 259ff7b as completed, success. That run includes `go test -race`. It does not cover this batch.

Changed files, beyond Codex's 22 listed in the checkpoint below:
- backend/internal/jscompat/{json.go,json_test.go} (new)
- backend/internal/githubdevelopers/{handler.go,review_test.go}
- backend/internal/githubtrending/{handler.go,review_test.go}
- backend/cmd/api/main.go (Logger for both handlers)
- contracts/{github-trending-developers,github-trending,ai-suggestions}/{cases.json,README.md}
- learn-go/18-bounded-parallel-work/{README.md,exercise_test.go}, learn-go/05-json/README.md, learn-go/README.md
- docs/{coordination.md,claude-review.md,backend-map.md,adr/0002-go-backend.md}, backend/README.md

Remaining gates:
- Independent review of AUTH-001, AUTH-002, CI-001, VERIFY-002 and VERIFY-003. Codex has not reviewed REVIEW-005's fixes.
- A hosted CI run that includes this batch.
- Anonymous GitHub quota: one developers call makes up to 21 requests without a credential, against a limit of 60 an hour per address. Owner decision, shared with search, summary and trending.
- Hosting, Vercel forwarding, measurements, rollback under traffic: unchanged.
- AI: guest policy, quotas and key ownership before any AI port.

Next bounded action: AI-001b, fixtures for `POST /api/ai/enhance-query` with the AI call stubbed, then the same for `POST /api/ai/chat`. Those two complete the characterization of Phase 2's routes. No AI port before the owner's policy decisions.
Writer released: yes. No processes left running. Account usage is not visible to Claude Code.

## Historical takeover checkpoint: Claude Code, batch GO-007b / lesson 18 / AI-001a (2026-10-13)

Status: active. Claude Code claimed the writer role by owner instruction after
Codex's usage limit. Tree on arrival: main @ 259ff7b, 22 uncommitted files as
Codex's pre-final checkpoint below lists; `node scripts/agent-handoff.mjs
--status` reported WRITER_ACTIVE, signalMatchesTree false. No file other than
this one changed yet. No processes running. Account usage is not visible to
Claude Code; no remaining percentage is claimed.
Milestone 1 (Claude Code): Codex's tree, unaltered, passed every outstanding
check: backend gofmt/vet clean, `go test -count=1 ./...` 9 packages, build of
bin/api.exe, learn-go vet both ways and 19 solution packages, lesson 18 fails
as shipped without panicking, `npm run test:contracts` 470/470, ESLint on
next.config.mjs and scripts/contracts clean, `git diff --check` clean,
production probe 55 of 55 exit 0.
Milestone 2: differential check of the developers route, 32 inputs outside
the 48 fixtures, Next.js handler against Go in a scratch copy: 20 agree, 12
differ (entries that are not objects; a login that is an object, array or
non-canonical number; a repository reply that is a string or an object with
`length`; a leading byte-order mark). None is something GitHub sends.
Milestone 3 (Claude Code): fixes written and passing in the changed packages
(`go test -count=1` jscompat, githubdevelopers, githubtrending, cmd/api; gofmt
and vet clean). New: backend/internal/jscompat/{json.go,json_test.go},
backend/internal/githubdevelopers/review_test.go,
backend/internal/githubtrending/review_test.go. Changed by Claude Code:
githubdevelopers/handler.go, githubtrending/handler.go, cmd/api/main.go
(Logger wiring), learn-go/18-bounded-parallel-work/exercise_test.go, and
fixtures added without touching existing cases: developers 48 -> 56,
trending 33 -> 34, ai-suggestions 32 -> 35.
Still to do: full suites and production probe on the final tree, deliberate
breaks (running), lesson text for the new Go, REVIEW-005, ADR rows, handoff.
If interrupted: run `npm run test:contracts`, then in backend `go test
-count=1 ./...`; both are expected to pass on the tree as it stands.

## Historical pre-final checkpoint (Codex): batch GO-007b / lesson 18 / AI-001a (2026-10-13)

Status: active, all three implementations written. Developers focused Go checks passed: 48 cases in two modes plus real upstream fan-out/order and cancellation. Main route/public exception/default-off switch added; lesson 18 exercise/solution/tests written, prior exercises untouched. AI suggestions 32 fixtures/8 defects and integrity check passed (33/33), actual provider stubbed. Docs/index updated. Initial Go harness mismatch with opaque URL.String fixed; no known implementation failure remains. No running processes. Base/current 259ff7b, main, uncommitted.

Next long operations: full fresh Go tests/vet/format/build, lesson solutions/vet, all Node contracts/lint, production probe with 55 URLs. Checkpoint files: backend/internal/githubdevelopers/, backend/cmd/api/{main.go,main_test.go,trending_test.go}, backend/internal/githubaccess/access.go, next.config.mjs, scripts/contracts/{go-rewrites.test.mjs,go-forwarding-probe.mjs,ai-suggestions-loader.mjs,suggestions-fixture.mjs,ai-suggestions.test.mjs}, contracts/ai-suggestions/, learn-go/18-bounded-parallel-work/, lesson06/16/index and backend/access/developers/shared docs. No deployment/cutover, peer review or hosted race result claimed.

## Batch milestone (2026-10-13)

Status: active. GO-007b handler and all 48 fixtures pass in memory/local HTTP. Wire test verifies four-request fan-out and result order; cancellation test verifies workers joined. First test run failed because fixture transport used URL.String on jscompat's opaque URLs; fixed harness to inspect scheme/host/RequestURI, production unchanged. Routing/public exemption/default-off switch wired; focused Go packages passed. Lesson 18 and AI suggestions harness written; AI fixtures not recorded yet. Base/current 259ff7b main, uncommitted. No owned processes running. Next: record AI fixtures, lesson/docs, final full suites/build/probe, single batch handoff. No deployment or provider calls.

## Batch checkpoint: GO-007b / lesson 18 / AI-001a (2026-10-13)

Status: active. Owner requested 2-3 related tasks per turn. Codex owns this batch; reviewer unassigned. Base/current main @ 259ff7ba125bfb367e3fbba211e277a05f41476d; starting tree clean; previous writer released. Go developers port will preserve all 48 cases/17 defects, limit concurrent enrichment to four, use a 25-second whole-request deadline and no credentials, remain default-off. Lesson 18 covers bounded parallel work. AI-001a records suggestions route behavior with only the AI dependency stubbed; no provider calls, production AI port or guest-policy decision implied.

Next: implement developers Go and fixture tests, wire route, add lesson; checkpoint; record AI fixtures, then one final full verification/handoff. No tests run yet, no owned processes running, no secret reads. Existing review/hosted CI/auth/quota/cache/deployment gates remain. Progress metric is 7/25 built routes (28%), not a weighted whole-migration percentage.

## Latest handoff: GO-007a (Codex, 2026-10-13)

Status: **implementation complete; local contract verification complete; independent review pending**.
Owner: Codex. Reviewer: unassigned, no peer approval claimed.
Branch main; base/current 086a6dca2e1ca369a223ce9cdc2ce2b2fe735ee3.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `086a6dc`).

Implemented: 48 version-1 fixtures for GET /api/github/trending-developers,
17 marked defect; two integrity/ordering checks. Fixed clocks/time zones,
delayed enrichment, up to 21 upstream calls, 20-result cap, ordered ranks,
credential non-forwarding, partial failures, malformed replies and URL behavior.
Harness drains pending mocked requests before restoring global substitutions.
No production handler, Go code, lesson, route switch or deployment change.

Changed files:
- contracts/github-trending-developers/README.md
- contracts/github-trending-developers/cases.json
- scripts/contracts/developers-fixture.mjs
- scripts/contracts/github-trending-developers.test.mjs
- docs/coordination.md
- docs/backend-map.md
- docs/adr/0002-go-backend.md

Checks by Codex:
- Focused developers tests: 50/50 passed.
- Full npm run test:contracts: 437/437 passed, exit 0 (backend/bin/go007a-contracts.log).
- Six deliberate in-memory handler mutations caught; real source untouched:
  result cap, rank offset, wrong date, enrichment HTTP-error handling,
  credential leakage and reversed developer order.
- Focused ESLint passed, exit 0; git diff --check passed.
- No source diff under src/, backend/ or learn-go/. Build/probe/full UI lint not
  repeated because this task changes only fixtures, harness and documentation.
- npm run handoff passed, exit 0: all contracts, fresh backend tests/vet/format and lesson solutions passed; writerReleased=true, signal emitted. Log: backend/bin/go007a-handoff.log. Rerun after this documentation-only result update refreshes the tree fingerprint.

Remaining gates: GO-007b is not implemented; existing seven Go routes still
require independent review/hosted CI/live cutover evidence. No live GitHub,
Supabase, deployment or quota check was performed. Defect characterization does
not approve fixing or publishing defective behavior. No owned processes running.
Next bounded action: claim GO-007b after checking status and this handoff; add
standard-library handler, controlled fan-out, clock injection, shared fixtures,
public-only/no-credential routing, default-off switch and lesson 18. Writer
released: yes. No Git Agent receipt or remote synchronization claimed yet.

## Historical GO-007a pre-verification checkpoint (2026-10-13)

Status: active. 48 fixtures/17 defects and two additional checks pass locally (50/50). Six deliberate in-memory source mutations caught: cap21, rank offset, wrong date, HTTP-error fail-all, credential leakage, reversed output. Actual production source unchanged. Contract README, ADR and backend-map updated; Go/lessons untouched. Base/current 086a6dc main, changes uncommitted; no processes running. Next: full contracts/focused lint/diff and shared handoff suites. No production build needed for fixture/docs-only changes. Remaining review/deployment/CI gates unchanged. Full changed files: contracts/github-trending-developers/{README.md,cases.json}, scripts/contracts/{developers-fixture.mjs,github-trending-developers.test.mjs}, docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.

## GO-007a milestone checkpoint (2026-10-13)

Status: active. Wrote 48 version-1 developer fixtures (17 marked defects), harness and Node runner. Focused checks 50/50 passed (backend/bin/go007a-focused.log). Manually inspected normal card, 429 fallback, whole-response network failure, path normalization, DST/UTC dates. No production files changed. New files: contracts/github-trending-developers/cases.json, scripts/contracts/{developers-fixture.mjs,github-trending-developers.test.mjs}; coordination modified. Base/current 086a6dc, main, uncommitted. No owned processes running. Next: deliberate in-memory handler changes to check fixture sensitivity, README/architecture notes, full contracts/lint/diff, then handoff suites. No Go source change so no lesson added.

## Active checkpoint: GO-007a (Codex, 2026-10-13)

Status: active. Objective: characterize existing trending-developers behavior before its Go port. Starting tree clean, previous writer released. Branch main, base/current 086a6dca2e1ca369a223ce9cdc2ce2b2fe735ee3. GO-006b committed at 4640b10; subsequent Git Agent commit 086a6dc fixes HTTP-test counter synchronization. No hosted CI result inferred from that fix.

Constraints: contract-first; preserve response/query/date behavior and mark defects. Public route sends no credential; never inspect secrets or make real GitHub requests. Exercise/Go code untouched in this bounded task. Capture up to 20 parallel enrichment requests, ordered results despite out-of-order completion, and asymmetric HTTP versus transport/malformed-body failures. Fixed clocks/time zones; stub fetch only. Test counts and progress percentage are not cutover evidence (7/25 routes implemented = 28%; wider migration unweighted).

Next: write fixture harness and explicit cases, record expected results from unchanged source, inspect representative outputs, run full contracts/lint and handoff suites. Checks so far: status/HEAD/source inspected only; no owned processes running. Reviewer unassigned. No new tests run yet. All new work will remain uncommitted until Git Agent synchronization.

## Latest handoff: GO-006b (Codex, 2026-10-13)

Status: **implementation complete; local verification complete; independent review pending**.
Owner: Codex. Reviewer: unassigned; no peer approval claimed.
Branch main; base/current 7097beec821d296fbaa0cb6d1a8116f64666bdb3.
Resulting commit: synchronized by Git Agent on `main` and `go-backend` (from base `7097bee`).

Implemented: standard-library GET /api/github/trending, with injected clock/random
inputs and unchanged version-1 contract. Preserves all 33 cases including 13
marked defects; no new package dependency. Public-only, ignores inbound auth
and sends no GitHub credential. Registered in the actual mux, with explicit
public verifier exemption and default-off github-trending rewrite. Ten-second
upstream timeout, cancellation and 16 MiB body bound. Added lesson 17 and updated
lessons 06/16 and index. Existing exercise.go files untouched. Node source and
trending fixtures unchanged. Production probe includes three trending URLs.

Checks by Codex on final implementation:
- npm run test:contracts: 387 passed, exit 0 (backend/bin/go006b-contracts.log).
- backend go test -count=1 ./...: all eight packages passed; go vet ./... passed;
  gofmt -l . empty; go build -o bin/api.exe ./cmd/api passed.
- All 33 trending cases checked through in-memory and local HTTP handlers (66
  subcases), plus cancellation, oversized/trailing JSON and actual mux token
  non-forwarding tests. Upstream is stubbed; not a live GitHub test.
- learn-go go test -count=1 -tags solution ./...: eighteen packages passed;
  go vet -tags solution ./... passed; gofmt empty.
- Focused ESLint next.config/probe/rewrite test passed. Full UI lint not repeated;
  earlier baseline 10 errors/16 warnings remains an attributed prior result.
- Production Next build/probe: 53/53, native exit 0 (backend/bin/go006b-production.log).
- git diff --check passed. No owned processes remain running.
- Completion hook: npm run handoff passed, exit 0; contracts/backend/lesson checks passed, writerReleased=true, signal emitted. Log: backend/bin/go006b-handoff.log. Rerun after this documentation-only result update refreshes the tree fingerprint. Git Agent receipt/commit/push not yet verified.

Remaining gates: independent review; hosted CI after Git Agent's lockfile fix;
live OAuth/Vercel, quota and summary cache-retention work; hosting/measurements
and rollback. Local fixtures do not approve fabricated starsToday or fix its
calendar/prototype defects. Public-only trending must not later inherit a private
credential without a new contract. No agent deployment/cutover performed;
automatic deployment of synchronized Next.js changes remains unverified.

Next bounded task: GO-007a ? characterize /api/github/trending-developers,
including its fan-out, error behavior and rate-limit exposure. Reviewer can
independently review GO-006b first. Read this handoff and inspect git status/diff,
then claim writer before editing. Writer released: yes.

Actual changed files:

```text
backend/README.md
backend/cmd/api/main.go
backend/cmd/api/trending_test.go
backend/internal/githubaccess/access.go
backend/internal/githubtrending/handler.go
backend/internal/githubtrending/handler_test.go
contracts/github-access/README.md
contracts/github-trending/README.md
docs/adr/0002-go-backend.md
docs/backend-map.md
docs/coordination.md
learn-go/06-http-handlers/README.md
learn-go/16-verifying-access/README.md
learn-go/17-clocks-and-randomness/README.md
learn-go/17-clocks-and-randomness/exercise.go
learn-go/17-clocks-and-randomness/exercise_test.go
learn-go/17-clocks-and-randomness/solution.go
learn-go/README.md
next.config.mjs
scripts/contracts/go-forwarding-probe.mjs
scripts/contracts/go-rewrites.test.mjs
```

## Historical GO-006b verification milestone (2026-10-13)

387 Node checks passed. All eight Go packages passed fresh tests; go vet passed; gofmt empty; rebuilt binary passed. All eighteen lesson packages passed with solutions, lesson vet passed, gofmt empty. Focused changed-JS ESLint and git diff --check passed. Existing exercises unchanged. Production probe running in owned session 71716, log backend/bin/go006b-production.log, 53 scenarios expected. No other owned tests running. Next: capture probe exit, finalize docs and release, run npm run handoff. Current source stays uncommitted on 7097bee; independent review/hosted race not claimed.

Git Agent pipeline note from source inspection: its new treeHash hashes status text and git diff HEAD, which does not include untracked file contents. Do not treat a matching hash alone as proof that untracked content was tested; the current task runs the full handoff checks. Pipeline hardening is separate work, not modified during GO-006b.

## GO-006b pre-verification checkpoint (2026-10-13)

Status: active. Base/current 7097bee, main; writer Codex. Implemented standard-library handler, 33 shared cases in memory/local HTTP, route registration/default-off rewrite, explicit public-only auth exemption, credential non-forwarding test, cancellation/body bounds, lesson 17 plus updated lesson 06/16 and index, backend/access/trending/docs notes. Focused Go tests for githubtrending, cmd/api and githubaccess passed before extra cancellation/body tests. No new dependency, contract version change, deployment or cutover.

Next long checks: gofmt changed Go/new lesson; fresh backend tests/vet/format and lesson solutions/vet/format; 387 Node checks + lint; rebuilt binary and production probe (53 scenarios). New source paths: backend/internal/githubtrending/{handler.go,handler_test.go}, backend/cmd/api/trending_test.go, learn-go/17-clocks-and-randomness/. Modified main.go, githubaccess/access.go, next.config.mjs, rewrite test/probe, listed docs/lessons. No owned process running at checkpoint. Remaining gates: independent review, hosted CI after Git Agent lockfile fix, live OAuth/Vercel, public cache retention and quotas. No new permission needed for this local port.

## Active checkpoint: GO-006b (Codex, 2026-10-13)

Status: active, implementation written; final verification pending. Starting tree clean; prior writer released. Base/current main @ 7097beec821d296fbaa0cb6d1a8116f64666bdb3. Prior batch committed by Git Agent at 7831c0b, pipeline/lockfile changes at 7097bee. Read-only --status says IDLE_CLEAN. Remote main observed at 6a11b032, contents uninspected; no merge/reset performed.

Objective: standard-library Go trending handler against all 33 GO-006a cases, injected clock/random source, preserved marked defects, opt-in switch, lesson 17. Public-only route must not borrow any credential; match current Next trending behavior even with auth headers. No source contract fixes. No new Go dependency. Review unassigned; no peer approval claimed.

Additional evidence: Codex's switch-off npm run build completed exit 0 (backend/bin/auth002-switch-off-build.log). Earlier 387 Node tests/focused lint were also run by Codex before Git Agent repeated them. Git Agent's commit message records hosted Linux npm ci failure and lockfile fix, not a verified green rerun. Corrected max-5 handoff typo to actual max 4. New task checks not yet run; no owned processes running. Next: complete final checks and handoff.

## Latest handoff: AUTH-002 / VERIFY-003 / GO-006a (Codex + Git Agent final verification, 2026-10-13)

Status: **bounded local implementation complete; awaiting independent review; not deployed**.
Owner: Codex (implementation & 50/50 production probe); final verification & handoff release completed by Git Agent after Codex usage limit halt.
Branch: `main`; base `7e0820c3649ae83205f682a93d6b934ede1d8899`.

Completed:
- **AUTH-002:** Closed shared-token reads on the public repository page (`src/lib/repo/repoData.js`) and starred collection enrichment (`src/app/api/repo/starred/route.js`). Validated identifiers, removed server `GITHUB_TOKEN` usage, enforced uncached public reads, and revalidated starred enrichment with bounded concurrency (max 4) while preserving user-scoped Supabase authorization. Added 18 contract/isolation tests in `contracts/public-repository-reads/` and `scripts/contracts/public-repository-reads.test.mjs`.
- **VERIFY-003:** Strengthened `scripts/contracts/go-forwarding-probe.mjs` identity stub to require exact Supabase bearer token, exact public key, and known GitHub tokens, plus a wrong-session `401` scenario (50/50 production probe passed, native exit 0).
- **GO-006a:** Recorded 33 characterization fixtures (including 13 marked `defect`) for `GET /api/github/trending` under fixed UTC/local clocks and deterministic `Math.random` in `contracts/github-trending/` and `scripts/contracts/github-trending.test.mjs`. No trending behavior change or Go route port yet (`GO-006b` is next).

Final checks:
- `npm run test:contracts`: **387 / 387 passed**, exit 0.
- Focused ESLint (`npx eslint src/lib/repo/repoData.js src/app/api/repo/starred/route.js scripts/contracts/...`): **passed**, 0 errors/0 warnings.
- `node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production`: **50 / 50 passed**, native exit 0.
- `git diff --check`: **clean**.
- Writer released: yes.

## Latest handoff: REVIEW-004 / CI-001 / VERIFY-002 / AUTH-001 (Codex, 2026-10-13)

Status: **bounded local implementation complete; synchronized at `7e0820c`; new work awaiting independent review; not deployed**.
Owner: Codex. Reviewer: unassigned for this batch; no Claude review or receipt claimed.
Branch main; base HEAD `905c1d953a15b296fad1ff257d5c0a53e0043688`.
Resulting commit: `7e0820c3649ae83205f682a93d6b934ede1d8899` (synchronized by Git Agent on `main` and `go-backend`).
This record supersedes the historical incomplete checkpoints below.

Completed:
- REVIEW-004 reviewed GO-005a/b, FIX-003/004, VERIFY-001 and OPS-001a at the base commit; accepted with routing off. See claude-review.md.
- CI-001 adds a pinned, read-only Linux workflow for contracts, race/vet/format, lesson solutions and production forwarding. Hosted run pending.
- VERIFY-002 tests production Next build/start with isolated output and portable cleanup: 46 public URL cases plus 3 authenticated cases.
- AUTH-001 verifies Supabase user and GitHub account online, matches the linked provider ID, and uses only that user's GitHub credential on five dynamic migrated routes. Anonymous requests have no server-token fallback. Private summary requests bypass shared caches; private replies are no-store. Shared contracts cover two users and revocation.
- Added lesson 16 and updated affected lessons; existing exercise.go files untouched. All Go rewrites remain opt-in/off by default.
- Global checkpoint instructions saved in C:/Users/Windows/.codex/AGENTS.md and C:/Users/Windows/.claude/CLAUDE.md, plus the owner's requested memory note. No suitable checkpoint plugin found or installed. No quota meter/background watcher is claimed.

Final checks (Codex):
- npm run test:contracts: 335 passed, exit 0.
- backend: go test -count=1 ./...: seven packages passed; go vet ./... passed; gofmt -l . empty; go build -o bin/api.exe ./cmd/api passed.
- learn-go: go test -count=1 -tags solution ./...: 17 packages passed; go vet -tags solution ./... passed; gofmt -l . empty.
- node scripts/contracts/go-forwarding-probe.mjs ./backend/bin/api.exe --production: production build and 49/49 checks passed, explicitly captured native exit 0.
- Full ESLint: existing 10 errors/16 warnings in unaffected UI; targeted changed access/probe/test/config files passed. Generated probe output is now ignored by ESLint.
- Workflow YAML parsed; git diff --check passed; no existing exercise.go diff.
- Logs under ignored backend/bin/: final-contracts.log, production-probe-final.log, final-lint-source.log.
- Earlier lint run scanned generated files and was stopped; earlier probe exit ambiguity was resolved by the final explicit exit-0 run. No known task test/server processes remain running.

Remaining gates / dependencies:
- Independent review of AUTH-001 / CI-001 / VERIFY-002; hosted Linux race-detector result. No local race detector result (no C compiler).
- Live Supabase/GitHub OAuth, Vercel preview forwarding, latency/error measurements and rollback evidence not run. No deployment or cutover authorized by this handoff.
- Private UI is deliberately not connected yet: useGitHubSearch localStorage cache is not account-scoped; chat/share flows need a private-data audit. This API boundary is not a claim that all private UI or all server-token consumers are secured.
- Audit remaining token consumers in src/lib/github-api.js, src/lib/repo/repoData.js, /api/repo/starred, /api/trending/refresh and AI helpers. Anonymous contributions retain the existing missing-token error and anonymous GitHub rate limits are lower.
- Hosting selection/deployment and later AI/data policy decisions remain as listed below. No credentials needed from the owner for the completed local work.

Next bounded action: run git status --short and git diff, read this handoff and contracts/github-access/README.md, then independently review this batch. Observe the first hosted CI run after Git Agent synchronization. Before private UI integration, claim writer and design account-isolated caches and provider-token/session handling. GO-006a remains the next unassigned route port.
Writer released: yes. Completion hook: npm run handoff passed, exit 0; contracts, fresh backend tests/vet/format and lesson solutions passed. Emitted .agent-signal.json at 2026-10-13T04:14:38.997Z, writerReleased=true, branch main, HEAD 905c1d953a15b296fad1ff257d5c0a53e0043688. Synchronized and verified by Git Agent (base `7097bee`).

Actual repository files changed (all uncommitted at this handoff):

```text
.github/workflows/backend-verification.yml
.gitignore
backend/README.md
backend/cmd/api/access_test.go
backend/cmd/api/main.go
backend/internal/githubaccess/access.go
backend/internal/githubaccess/access_test.go
backend/internal/githubcontributions/handler.go
backend/internal/githubrepos/handler.go
backend/internal/githubrepos/http_test.go
backend/internal/githubrepos/private_test.go
backend/internal/githubsearch/handler.go
contracts/github-access/README.md
contracts/github-access/cases.json
contracts/github-access/isolation.json
contracts/github-contributions/README.md
contracts/github-contributions/cases.json
contracts/github-repositories/README.md
contracts/github-repositories/cases.json
contracts/github-search/README.md
contracts/github-search/cases.json
docs/adr/0002-go-backend.md
docs/backend-map.md
docs/claude-review.md
docs/coordination.md
eslint.config.mjs
learn-go/06-http-handlers/README.md
learn-go/07-calling-github/README.md
learn-go/09-path-parameters/README.md
learn-go/10-shared-cache/README.md
learn-go/15-settings-from-the-environment/README.md
learn-go/16-verifying-access/README.md
learn-go/16-verifying-access/exercise.go
learn-go/16-verifying-access/exercise_test.go
learn-go/16-verifying-access/solution.go
learn-go/README.md
next.config.mjs
scripts/contracts/access-fixture.mjs
scripts/contracts/github-access-isolation.test.mjs
scripts/contracts/github-access.test.mjs
scripts/contracts/github-contributions.test.mjs
scripts/contracts/github-repositories.test.mjs
scripts/contracts/github-search.test.mjs
scripts/contracts/go-forwarding-probe.mjs
src/app/api/github/contents/[owner]/[repo]/route.js
src/app/api/github/contributions/route.js
src/app/api/github/repo/[owner]/[repo]/route.js
src/app/api/github/repo/route.js
src/app/api/github/search/route.js
src/lib/github/access.js
```

## Historical resume milestone: Codex, 2026-10-13

Global checkpoint instructions saved in local Codex AGENTS.md and Claude
CLAUDE.md at the owner's explicit request, plus an authorized memory note.
No suitable quota/checkpoint plugin found; none installed. No background quota
meter is available. Existing checkpoint below remains the interruption record.
Next: finish docs, final formatting/tests, production probe with explicit exit
code, then final handoff. No known test processes remain running from prior work.

Pre-verification checkpoint: AUTH-001 code and lesson 16 are now written;
REVIEW-004 record, ADR, backend/access/route contract documentation are updated.
Redirect errors were aligned between Next and Go. No new credentials or UI
integration. Final checks below are about to run; this is still incomplete.
If interrupted, inspect their logs under ignored backend/bin/ and rerun any
whose exit status was not captured. Writer remains Codex while checks run.

## Historical recovery checkpoint: Codex, 2026-10-13

Status: **paused / incomplete**, not ready for synchronization. Owner reported
a usage interruption and requested global checkpointing. Account quota is not
visible; no remaining percentage can be claimed. This checkpoint precedes resume.

Task: REVIEW-004 / CI-001 / VERIFY-002 / AUTH-001. Owner Codex; new work has
no independent peer review. Branch main; base/current HEAD
`905c1d953a15b296fad1ff257d5c0a53e0043688`; all new changes uncommitted.
Working tree: modified .gitignore, backend/cmd/api/main.go,
backend/internal/githubrepos/{handler.go,http_test.go}, three existing route
contract JSON files, docs/{coordination.md,adr/0002-go-backend.md},
learn-go/{README.md,10-shared-cache/README.md}, next.config.mjs, three existing
Node contract runners, scripts/contracts/go-forwarding-probe.mjs, and the five
dynamic migrated src/app/api/github route handlers. New files/directories:
.github/workflows/backend-verification.yml, backend/cmd/api/access_test.go,
backend/internal/githubaccess/, backend/internal/githubrepos/private_test.go,
contracts/github-access/, learn-go/16-verifying-access/,
scripts/contracts/{access-fixture.mjs,github-access.test.mjs,github-access-isolation.test.mjs},
src/lib/github/access.js. Use git status --short for the exact list.

Implemented but not final-verified:
- CI: read-only pinned actions, Ubuntu race detector, vet/formatting, Node
  contracts, lesson solutions, production forwarding. Hosted execution pending.
- Probe: isolated .next-forwarding-probe build, production mode, portable
  teardown, 46 public + 3 authenticated requests.
- Access: Supabase /auth/v1/user then GitHub /user, linked provider ID match,
  no server-token fallback for five migrated handlers, no private shared cache,
  no-store responses, credential redirect/origin restrictions. Shared auth and
  two-user/revocation fixtures; contract versions search 3/repositories 4/contributions 2.
- Lesson 16 added, exercise unfinished. Existing exercises untouched.
- ADR and access README partly reconciled; other shared docs still stale.

Actual checks already run:
- Initial baseline: 317 Node checks, six backend packages, 16 solution lessons passed.
- Updated npm run test:contracts: 334 passed before the last extra origin test.
- Updated backend go test -count=1 ./...: seven packages passed before the last
  redirect/cancellation and origin tests. Need rerun on final files.
- Production build/probe: 46/46 initially; after auth 49/49 printed in
  backend/bin/production-probe.log. The latter PowerShell session returned 1
  with a NativeCommandError for stderr warnings: rerun with explicit native
  exit-code propagation before claiming a clean exit.
- Direct local eslint command for access/probe/new tests/config exited 0;
  npx invocation eventually exited 0 too. Existing application lint baseline
  remains 10 errors/16 warnings, not rerun across the whole app in this batch.
- Workflow parsed with installed js-yaml; remote v6 action refs resolved before pinning.

Still to do: final gofmt/tests/vet/lesson solutions and lint; prove clean probe
exit; finish REVIEW-004 record, backend-map/README/contract and lesson updates;
inspect final diff/security boundaries. New auth/CI/probe need independent peer
review. No race-detector result, live OAuth, Vercel routing, performance or rollback
evidence. Existing other server-token call sites need later audit. Private UI
integration is not wired because shared browser storage/chat sharing need isolation.

Next command: inspect git diff, claim writer, then run Go formatting and fresh
tests and Node contracts. Record final results before release and npm run handoff.
Do not run npm run handoff until this bounded batch is complete. Do not reset,
stash, delete or overwrite this work. No agent receipt/review is claimed.

## Handoff: OPS-001a (Claude Code, 2026-10-12)

```text
Task / scope: OPS-001a, the one step of the hosting proposal that needs no
  owner decision: backend/cmd/api reads the PORT variable a hosting platform
  sets. With lesson 15.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed. No hosting
  account was touched and nothing was created anywhere.
Base commit / branch / worktree: 3f4c7dd / main / main checkout, on top of
  the uncommitted FIX-004 and VERIFY-001 changes.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files:
  backend/cmd/api/main.go: listenAddr(getenv) chooses the address.
    SEFGH_API_ADDR wins; else PORT, on every interface; else 127.0.0.1:8787.
    A PORT that is not a number from 1 to 65535 stops the server at start-up.
  backend/cmd/api/main_test.go: TestListenAddr, 14 cases.
  backend/README.md: the PORT row.
  learn-go/15-settings-from-the-environment/: new lesson (README, lesson.go,
    exercise.go, solution.go, exercise_test.go). learn-go/README.md: index row.
  docs/{coordination.md,adr/0002-go-backend.md}.
  No existing exercise.go changed. No handler, fixture, contract or Next.js
  change. The default address is unchanged, so local use is unchanged.
Contract or decision changes: none.
Judgment calls, for review:
  - SEFGH_API_ADDR wins over PORT, so an explicit setting is never overridden
    by a platform default, and the local scripts that set it are unaffected.
  - A bad PORT is an error, not a fall back to 8787. A quiet fall back would
    look like a deployment that hangs.
  - PORT means every network interface (":3000"). That is what a platform
    needs. It also applies on a developer's machine if PORT happens to be set
    in the shell that starts the server.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - npm run test:contracts: 317 passed, 0 failed.
  - backend: go test -count=1 ./... passes all six packages; go vet clean;
    gofmt -l empty.
  - learn-go: go test -count=1 -tags solution ./... passes all 16 packages;
    go vet clean with and without the solution tag; gofmt -l empty. Lesson 15
    as shipped fails its four tests without panicking, as intended.
  - 9 deliberate breaks of listenAddr in a scratch copy: 9 caught.
  - The built server with PORT=abc and no SEFGH_API_ADDR: logs "PORT must be
    a number from 1 to 65535" and exits with status 1.
  - Forwarding probe against the new build, with a bad PORT in the
    environment and SEFGH_API_ADDR set by the probe: 46 of 46, exit 0.
  - npx eslint scripts/contracts: clean.
  - npm run handoff: run once after this record was saved, covering
    VERIFY-001 as well. Claude Code reports its outcome to the owner; a
    failure would be recorded here by a further edit.
Not verified:
  - The built server actually listening on a PORT. That binds every network
    interface, which makes Windows show a firewall prompt on the owner's
    screen, so it was left to the unit test and the standard library.
  - That this is all Vercel's Go runtime needs. Only a deployment shows that.
  - go test -race, as before.
Remaining Phase 1 gates: unchanged from the VERIFY-001 record below. All of
  them now need the owner, a deployment, or Codex.
Next bounded action: owner decisions (private-repository access, CI-001,
  hosting option). Meanwhile Phase 2 can continue with GO-006a.
Writer released: yes
```

## Handoff: VERIFY-001 (Claude Code, 2026-10-12)

```text
Task / scope: VERIFY-001, the two Phase 1 verification gates that could be
  attempted on this machine: how the Next.js rewrite forwards awkward URLs to
  Go, and the race detector. Plus a hosting proposal for the owner, in the ADR.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: forwarding check complete for `next dev`. Race detector NOT run.
  Nothing deployed. No route switched on.
Base commit / branch / worktree: 3f4c7dd / main / main checkout. Started while
  FIX-004 was still uncommitted, so both tasks' files are in the working tree.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files:
  scripts/contracts/go-forwarding-probe.mjs: new. Optional; it starts servers,
    so it is not part of npm run test:contracts.
  contracts/github-repositories/README.md: how to run it.
  docs/{coordination.md,claude-review.md,adr/0002-go-backend.md}.
  No handler, fixture, Go or lesson change.
Contract or decision changes: none. The ADR gains a gate table for Phase 1 and
  a hosting proposal; the proposal is not a decision.
What the probe does: starts a stand-in GitHub, the compiled Go server, and
  `next dev` with all six routes forwarded to Go. It sends 46 paths as raw
  HTTP, each once through Next.js and once straight to Go, and compares the
  status, the body, the X-Sefgh-Backend marker and the requests the stand-in
  GitHub received. The paths include %2F, %20, %23, %3F and %25 inside a path
  segment, repeated and reordered parameters, "+", ";", a lone "%", "%zz",
  bytes that are not valid UTF-8, and a percent-encoded parameter name.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2,
    Next 16.1.1, a Go build of the current working tree):
  - Probe: identical 46 of 46, exit 0. Every reply carried X-Sefgh-Backend: go.
  - The listing (PROBE_SHOW=1) was read by eye. Examples of what reached the
    stand-in GitHub through Next.js: path=src%2Fmain.go -> contents/src/main.go;
    path=docs/C%23/readme.md -> contents/docs/C%23/readme.md;
    path=%252e%252e%2Fprivate -> contents/%252e%252e/private; q=a%FF%FFb ->
    q=a%EF%BF%BD%EF%BF%BDb; q=first&q=second -> q=first; %71=react -> q=react.
    An owner of a%2Fb answered 400 with no upstream call.
  - Two faults in the probe itself were found and fixed before this handoff:
    1. An inserted line split an if from its else, so every path was listed as
       DIFFERENT while the count said 46 of 46. The count was right.
    2. The stand-in GitHub answered every repository with the same body, so on
       the cached summary route a changed owner or name compared as identical.
       It now repeats the requested path in full_name.
  - The probe was then tested against planted differences, in scratch copies:
    a different search term on one path -> 45 of 46, that path named, exit 1;
    a different repository name on one summary path -> missed by the probe as
    it was before fix 2 (46 of 46, exit 0), caught after it (45 of 46, exit 1).
  - npx eslint scripts/contracts: clean.
  - npm run handoff: see the last line of this record.
Not done, and why:
  - go test -race. It needs cgo and a C compiler. This machine has neither gcc
    nor clang, Docker Desktop was not running, and the only WSL distributions
    are Docker's own. A 108 MB portable compiler download ran at about 30 KB/s
    and was stopped at 29 MB; the partial file is outside the repository.
    The practical route is CI-001 on Linux, which needs the owner's approval.
  - The same forwarding check on Vercel. A deployment forwards through
    Vercel's routing layer, not through `next dev`. Run the probe's path list
    against a preview deployment before any route is switched on there.
  - `next start` with the switch on. Rewrites are fixed when Next.js is built,
    so this needs a production build with the switch set; not attempted.
Phase 1, where it stands:
  Closed in code: REVIEW-002 findings 1 to 10 (FIX-003, GO-003, FIX-004).
  Checked locally: fixture parity for all four routes; switch and rollback;
    forwarding through `next dev`.
  Open, needs the owner:
    - Who may see private repositories. Finding 11 depends on it.
    - Approval for CI-001, which is how the race detector gets run.
    - A hosting choice. Proposal in adr/0002-go-backend.md.
  Open, needs a deployment: forwarding on Vercel, staging measurements,
    rollback under real traffic, production cache behaviour.
  Open, needs Codex: peer review of GO-005a, GO-005b, FIX-003, FIX-004 and
    this task.
Next bounded action: none of the remaining Phase 1 gates can be closed without
  the owner. Phase 2 can continue meanwhile with GO-006a (github/trending).
Writer released: yes
npm run handoff: not run separately. Claude Code went straight on to OPS-001a
  in the same working tree and ran it once for both; see that record.
```

## Handoff: FIX-004 (Claude Code, 2026-10-12)

```text
Task / scope: FIX-004, REVIEW-002 findings 7 (text that is not valid UTF-8 was
  decoded differently from JavaScript) and 8 (no overall deadline on the
  detail route), in Go.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed.
History: paused on the owner's instruction part-way through and resumed the
  same day from a checkpoint in this file. Nothing was committed in between.
Base commit / branch / worktree: 3f4c7dd / main / main checkout.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files:
  backend/internal/jscompat/{utf8.go,utf8_test.go}: new. DecodeUTF8 is a
    step-for-step port of the WHATWG UTF-8 decoder.
  backend/internal/jscompat/jscompat.go: ParseQuery decodes with it.
  backend/internal/githubrepos/handler.go: README decoded with DecodeUTF8;
    DetailTimeout (25 s) is one deadline for the detail route's three calls.
  backend/internal/githubrepos/deadline_test.go: new.
  backend/internal/githubrepos/{contract_test.go,http_test.go} and
    scripts/contracts/github-repositories.test.mjs: accept raw_body_base64.
  backend/cmd/api/{main.go,main_test.go}: the 30 s write timeout is a named
    constant, and a test requires DetailTimeout to be below it.
  contracts/github-repositories/cases.json: +4 README cases, 124 total, v3.
  contracts/github-search/cases.json: +2 query cases, 89 total, v2.
  contracts/*/README.md, backend/README.md, learn-go/03-strings-and-bytes/README.md,
    learn-go/07-calling-github/README.md,
    docs/{coordination.md,backend-map.md,claude-review.md,adr/0002-go-backend.md}.
  No exercise.go changed. No Next.js handler changed.
Contract or decision changes: none. The six new cases record what the Next.js
  handlers already did; Go changed to match them. No version was raised.
  One recorded difference is removed from the ADR: query bytes that are not
  valid UTF-8 now decode identically in both backends.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - npm run test:contracts: 317 passed, 0 failed.
  - backend: go test -count=1 ./... passes all six packages; go vet clean;
    gofmt -l empty (the formatting failure recorded at the pause is fixed).
  - DecodeUTF8 against JavaScript's TextDecoder on 200,000 random byte strings,
    173,581 of them not valid UTF-8, in a scratch copy: 0 differ. The
    strings.ToValidUTF8 call it replaces differed on 127,952.
  - 17 deliberate breaks of the decoder, the deadline and their wiring, in a
    scratch copy: 16 caught at first. The miss (overlong four-byte forms) led
    to three more values in the decoder's table, after which it was caught.
    A test for a hang on the second of the three detail calls was also added.
  - npx eslint scripts/contracts: clean.
  - learn-go: checked by npm run handoff; only two README files changed there.
Unverified: go test -race (no C compiler here; this task adds no shared
  state); a real slow GitHub; a production deployment.
REVIEW-002 findings now: 1 fixed (FIX-003); 2, 3, 4, 5, 6, 10 fixed (GO-003);
  7 and 8 fixed here; 9 addressed (GO-003). Finding 11, no token on detail and
  contents, is an owner decision tied to the private-repository question.
Remaining Phase 1 gates:
  - OWNER: who may see private repositories.
  - go test -race on a machine with a C compiler.
  - How the Next.js rewrite forwards percent-encoded path segments.
  - Hosting the Go service on Vercel's free tier; staging measurements;
    rollback under real traffic; production cache behaviour.
  - Codex peer review of GO-005a, GO-005b, FIX-003 and FIX-004.
Next bounded action: VERIFY-001, the two verification gates that can be
  attempted locally (race detector, rewrite forwarding). Then a hosting
  proposal for the owner.
Writer released: yes
```

## Handoff: FIX-003 (Claude Code, 2026-10-12)

```text
Task / scope: FIX-003, input validation for the three repository routes
  (REVIEW-002 finding 1), in Next.js and Go together, contract version 3.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed.
Base commit / branch / worktree: 80cee17 / main / main checkout, clean at start.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Owner decisions this rests on, relayed by the owner on 2026-10-12 and now in
  the ADR decisions log: input validation approved; the server token is NOT to
  be limited to public data, and who may see private repositories is
  undecided; hosting is Vercel and Supabase; free tier only.
Changed files:
  src/lib/github/repo-identifiers.js: new, the shared rules for Next.js.
  src/app/api/github/repo/route.js, repo/[owner]/[repo]/route.js,
    contents/[owner]/[repo]/route.js: validate before building a URL.
  backend/internal/githubrepos/{identifiers.go,identifiers_test.go}: new.
  backend/internal/githubrepos/{handler.go,http_test.go}: validate; one cache
    test used names that are now invalid and was given valid ones.
  contracts/github-repositories/{cases.json,README.md}: version 3, 120 cases.
  scripts/contracts/route-loader.mjs: resolves any "@/" import, not one file.
  learn-go/14-checking-input/*, learn-go/09-path-parameters/README.md,
    learn-go/README.md: new lesson, one corrected passage, index row.
  backend/README.md, docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.
  No existing exercise.go changed.
Contract change: github-repositories version 2 -> 3. 22 existing cases changed,
  37 added, 61 untouched, 18 still marked defect (upstream status collapsing
  and unchecked reply shapes; none about URL input).
Judgment calls inside the approved change, for the reviewer:
  - Owner pattern ^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$ is deliberately looser than
    GitHub's own rule: it admits underscores (managed-user accounts) and
    repeated or trailing hyphens (old accounts). It is a safety rule.
  - Contents paths are ENCODED part by part, not restricted to a character
    set, so a folder named "C#" works. This goes beyond "reject invalid
    input": names containing #, ? or % now reach the right file.
  - A trailing slash and an empty part are rejected. Before, "src/" was sent on.
  - Backslash stays rejected, as before. Control characters are now rejected.
  - Wire bytes change for some valid names: ";" is sent as %3B, "|" as %7C.
    GitHub decodes both to the same name.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - Before touching fixtures: the new handlers failed exactly 22 of the old
    cases, all about URL input, and no others.
  - Re-recording printed every changed case, each reviewed by hand. A guard
    in the recorder refuses any change outside a reviewed list.
  - npm run test:contracts: 311 passed, 0 failed.
  - backend: go test -count=1 ./... passes all six packages (240 repository
    contract subtests); go vet clean; gofmt -l empty.
  - New Go test: 11 hostile requests, with a server token set, produce 400 and
    zero requests to GitHub.
  - Deliberate weakenings of the validation: JavaScript 17 of 17 caught by the
    contract tests; Go 14 of 14 valid ones caught (2 more did not compile).
  - learn-go: all 15 solution packages pass; go vet clean in both modes;
    gofmt -l empty; lesson 14's exercise fails without panic.
  - npx eslint on the changed handlers, the new module, the runners and
    next.config.mjs: clean.
  - npm run build with the switch variables unset: passed, exit 0. The three
    handlers import the shared module through the @/ alias, so this is the
    check that the alias resolves in a real build.
Unverified: live GitHub; the Next.js rewrite with these inputs; a production
  deployment. The race detector has still not run.
Remaining Phase 1 gates after this task:
  - OWNER: who may see private repositories. Until decided, summary and search
    return whatever the server token can read to any caller. This affects the
    Next.js routes in production today, not only the Go ports.
  - REVIEW-002 findings 7 (non-UTF-8 README) and 8 (one deadline for detail).
  - Race-detector run; rewrite check for percent-encoded path segments.
  - Hosting the Go service on the free tier; staging measurements; rollback
    under real traffic; production cache behaviour.
Next bounded action: FIX-004, findings 7 and 8 in Go. Then the two
  verification gates. Then a hosting proposal for the owner.
Writer released: yes
```

## Handoff: GO-005b (Claude Code, 2026-10-12)

```text
Task / scope: GO-005b, Go port of GET /api/github/contributions against the
  GO-005a fixtures, with lesson 13. Routing off. The owner confirmed on
  2026-10-12 that the route should be ported although nothing calls it.
Owner / reviewer: Claude Code / Codex (peer review NOT run).
Status: implementation complete; review pending; not deployed.
Base commit / branch / worktree: cd6ad67 / main / main checkout, clean at start.
Resulting commit: uncommitted at handoff; the Git Agent commits after npm run handoff.
Changed files:
  backend/internal/githubcontributions/{handler.go,dates.go,query.go,
    contract_test.go,dates_test.go,limits_test.go}: new package.
  backend/cmd/api/main.go: registers GET /api/github/contributions.
  next.config.mjs, scripts/contracts/go-rewrites.test.mjs: opt-in route name
    github-contributions.
  backend/README.md, contracts/github-contributions/README.md.
  learn-go/13-time-and-clocks/{README.md,lesson.go,exercise.go,
    exercise_test.go,solution.go}, learn-go/README.md: new lesson and index row.
  docs/{coordination.md,backend-map.md,adr/0002-go-backend.md}.
  Not changed: the fixtures, the Next.js handler, any existing exercise.go.
Contract or decision changes: none. Contract stays at version 1. All 18
  defect cases are reproduced as recorded, not fixed. Standard library only.
Design notes for the reviewer:
  - The clock and the time zone are fields on Handler (Now, Location). Nil
    means time.Now and the machine's zone, matching the Next.js handler.
  - dates.go has its own wallClock helper in place of time.Date / AddDate,
    because Go leaves a skipped or repeated clock time unspecified and
    JavaScript does not. A first version returned its result in UTC and failed
    every non-UTC case; the fixtures and the Node-derived table caught it.
  - toFixed1 rounds with math/big on the exact float64, because
    strconv.FormatFloat sends an exact tie to the even digit (0.25 -> 0.2).
  - query.go was generated from the fixture's recorded text and is checked
    against it by TestQueryMatchesTheContract.
Checks run and exact outcome (Claude Code, Windows, Node 21.7.1, Go 1.27.2):
  - backend: go test -count=1 ./... passes all six packages; go vet clean;
    gofmt -l empty. The new package runs the 95 cases in memory and over
    sockets (190 subtests) plus unit and limit tests.
  - npm run test:contracts: 274 passed, 0 failed.
  - Large comparison with JavaScript in a scratch copy: 24,000 random instants
    across 12 time zones, 0 date ranges differ; 200,000 random divisions,
    0 rounded values differ.
  - Deliberate breaks in a scratch copy: 31 valid, 29 caught at first. The two
    misses led to changes: a redundant truncation was removed, and the
    body-limit test was rewritten so that it fails when the limit is removed.
    Five further breaks of logging and limits were then all caught.
  - One new test hung on its first run: a fake GitHub waited for a hang-up
    that Go's server cannot see while a POST body is unread. Fixed in the test.
  - Compiled server against a local stand-in for GitHub's GraphQL endpoint,
    dummy token: 200 with the expected grid and statistics; the stand-in
    received POST /graphql with the bearer token, JSON content type and the
    three variables; an invalid name answered 400 with no upstream call; POST
    answered 405. Marker and security headers present.
  - learn-go: go test -tags solution ./... passes all 14 packages; go vet clean
    in both modes; gofmt -l empty; lesson 13's exercise fails without panic.
  - npx eslint next.config.mjs scripts/contracts: clean.
  - npm run build with the switch variables unset: passed, exit 0.
Unverified:
  - Live GitHub GraphQL. It needs a real token and none was used, so the
    reply shapes for an unknown user and for errors rest on documentation.
  - The Next.js rewrite for this route in dev or a production build. Only the
    rewrite configuration is unit-tested.
  - The race detector (no C compiler here). The handler holds no shared state.
Recorded differences from the Next.js handler, outside the fixtures (also in
  ADR-0002): a 10-second timeout; a 16 MiB reply limit; a count or total that
  is not a JSON number is passed through without JavaScript's coercion; a
  status that cannot carry a body answers 500.
Remaining gates: Codex peer review of GO-005a and GO-005b. Owner decisions on
  the seven groups of defect cases. All earlier cutover gates.
Next bounded action: GO-006a, characterize GET /api/github/trending as
  fixtures. It calls GitHub search and adds a random starsToday value, so the
  runner must fix the random source as this one fixes the clock.
Writer released: yes
```

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
| `GO-005a` | Contract fixtures for contributions | Committed cd6ad67; reviewed in REVIEW-004 | Cutover gates |
| `GO-005b` | Contributions Go port and lesson 13 | Committed 80cee17; reviewed in REVIEW-004 | Cutover gates |
| `FIX-003` | Repository input validation and lesson 14 | Committed 3f4c7dd; reviewed in REVIEW-004 | Cutover gates |
| `FIX-004` | Non-UTF-8 text and shared detail deadline | Committed 905c1d9; reviewed in REVIEW-004 | Cutover gates |
| `VERIFY-001` | Development forwarding and race preparation | Committed 905c1d9; reviewed in REVIEW-004; dev 46/46 | Hosted race and Vercel preview |
| `AUTH-001` | Two-token verification & private repo isolation across 5 dynamic GitHub routes + Lesson 16 | Committed 7e0820c; reviewed in REVIEW-006, with fixes | Live Supabase and GitHub checks; private UI; cutover gates |
| `AUTH-002` | Public repository page & starred enrichment isolation | Committed 7831c0b; reviewed in REVIEW-006 | Anonymous quota decision; cutover gates |
| `VERIFY-003` | Exact credentials & wrong-session 401 forwarding check (50/50 production probe) | Implementation complete & verified | Independent review |
| `GO-006a` | Characterize trending with fixed clock/random inputs; no production fix | Committed 7831c0b; 34 fixtures after REVIEW-005 | Independent review before cutover |
| `FIX-002` | Make the navbar's "Most Stars" and "Recently Updated" work. Offered to the owner as the real task in `learn-go/02-structs-and-maps`. Do not fix it unasked: it is the owner's exercise | Reserved for Owner | Owner |
| `CI-001` | Linux contracts, race, vet, format, lessons and production probe | Committed; hosted run 38351494790 on 259ff7b succeeded | Independent review; a run for each later commit |
| `OPS-001a` | PORT support and lesson 15 | Committed 905c1d9; reviewed in REVIEW-004 | Deployment gates |
| `OPS-001` | Choose hosting for the Go service; deploy to a staging environment; take the measurements the ADR requires. Proposal written in the ADR | Proposal written; nothing deployed | Owner |
| `GO-006b` | Trending Go port and lesson 17 | Committed 4640b10; logging and JSON decoding reviewed and fixed in REVIEW-005 | Rest of it unreviewed; cutover gates |
| `GO-007a` | Trending-developers characterization | Committed 259ff7b; 57 fixtures/23 defects after REVIEW-005 | Cutover gates |
| `GO-007b` | Trending-developers Go port and lesson 18 | Committed b5745b3; reviewed in REVIEW-005 | Hosted CI run; anonymous quota decision; cutover gates |
| `AI-001a` | Fixtures for `POST /api/ai/suggestions`, AI call stubbed | Committed b5745b3; 35 fixtures/8 defects; reviewed in REVIEW-005 | Owner's AI decisions before any port |
| `REVIEW-005` | Claude Code review of GO-007b, lesson 18, AI-001a, with fixes | Committed b5745b3 | Codex has not seen the fixes |
| `AI-001b` | Fixtures for `POST /api/ai/enhance-query`, provider call stubbed | Committed 9480ef9; 62 fixtures/10 defects | Independent review; owner's AI decisions before any port |
| `AI-001c` | Fixtures for `POST /api/ai/chat` with the real helper, provider call stubbed | Committed 9480ef9; 42 fixtures/16 defects | Independent review; owner's AI decisions before any port |
| `AI-002a` | AI contract version 2 in Next.js: sign-in for chat, limits, three safety fixes, fixtures | Complete; uncommitted at handoff | Independent review; browser check of chat |
| `AI-002b` | Go ports of suggestions and enhance-query against version 2, with a lesson | Not started; next | Nothing |
| `AI-002c` | Go port of chat with the session check and limits, with a lesson | Not started | AI-002b |
| `QUOTA-001` | Public-only server token for anonymous GitHub reads, in Next.js and Go, with a check that refuses a private-capable token | Not started | Owner creates the token before it can be used live |
| `REVIEW-006` | Independent review of AUTH-001 and AUTH-002 by deliberate breaks, with fixes | Complete; uncommitted at handoff | Someone other than Claude Code to look at the fixes |
| `REVIEW-007` | Independent review of CI-001, VERIFY-002 and VERIFY-003 by the same method | Not started; next task that needs no decision | Nothing |

Suggested ownership: whichever agent is available takes the writer role for one task and records it under "Current state"; the other reviews.

## Owner decisions pending

- Navbar sort (`FIX-002`): teach the API the navbar's names, or change the navbar to the API's names.
- How to host the Go service within Vercel's free tier, before anything is deployed. The owner has said: Vercel for Next.js, Supabase for the database, free tier only, no paid resource without approval. Two options and a recommendation are in "Hosting proposal" in `adr/0002-go-backend.md`.
- **AI routes: decided on 2026-10-13.** Chat for signed-in users only, the search helpers public, both with limits, and three safety defects to fix. See the ADR decisions log. Playground-key policy is separate and still open, before Phase 3.
- Contributions route: the owner chose on 2026-10-12 to port it although nothing calls it, and it is ported with its defects reproduced. Still to decide: the seven groups of `defect` cases in `contracts/github-contributions/README.md`, the first being whether its date range should be computed in UTC.
- **Private access is decided:** signed-in users may see only repositories their own GitHub account can access. AUTH-001 implements the API boundary locally; independent review and private UI integration remain. This is not waiting on another policy answer.
- **CI-001 needs nothing further from the owner.** It is committed and its hosted run on `259ff7b` succeeded.
- **Anonymous GitHub quota: decided on 2026-10-13.** A server token that can read only public data may be used for anonymous reads. The owner still has to create that token and set it; the code is `QUOTA-001`, not started.

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
