# Codex and Claude Code coordination

Last updated: 2026-10-12 (Asia/Calcutta), by Claude Code (VERIFY-001 and OPS-001a handoff).

## Start here

**The plan is Go, not Rust.** The owner decided this on 2026-10-11, after Codex's last session. The accepted plan is `adr/0002-go-backend.md`. `adr/0001-rust-backend.md` is superseded and must not be implemented.

If you last saw this project when the plan was Rust, read `../AGENTS.md`, then this file, then `adr/0002-go-backend.md`. The rest of this file tells you what was built while you were away and what needs your review.

## Current state

- **Branch:** `main` (active default branch). Work from `go-backend` was merged into `main` at `030d875` and pushed to `origin/main`. Future branches/worktrees can branch off `main` or `go-backend` (which is kept fast-forwarded and in sync).
- **Active writer:** none. Claude Code completed `VERIFY-001` and `OPS-001a` and released the role. `FIX-004`, `VERIFY-001` and `OPS-001a` are all uncommitted in the working tree: the Git Agent had not acted on the FIX-004 signal when this was written. No deployment or cutover.
- **Reviewer:** Claude Code has reviewed GO-002a/GO-002b (`REVIEW-002`) and GO-003/GO-004 (`REVIEW-003`), all on 2026-10-12. GO-003 accepted; GO-004 accepted with routing off. No route is approved to switch on. Details in `claude-review.md`. The SYNC-001 documentation diff was not reviewed as a separate item.
- **Stage:** Phase 2 of the ADR is under way. Phase 1 is built and its review findings 1 to 10 are fixed, but no route is cut over: the gates left need the owner (private-repository access, CI approval, hosting) or a deployment. See "Phase 1 gates on 2026-10-12" in `adr/0002-go-backend.md`. In Go behind off-by-default switches: search, repository summary, repository detail, contents (Phase 1), languages and contributions (Phase 2). Left in Phase 2: trending, trending-developers and the three AI routes. Nothing is deployed and no traffic has moved.

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
| `GO-005a` | Contract fixtures for `github/contributions`: 95 cases, 18 marked `defect` | Implemented at `cd6ad67` | Codex peer review |
| `GO-005b` | Go port of `github/contributions` against those fixtures, with lesson 13, routing off | Implementation complete, uncommitted at handoff | Codex peer review; cutover gates |
| `FIX-003` | Input validation for the three repository routes, Next.js and Go, repository contract version 3, lesson 14 | Implemented at `3f4c7dd` | Codex peer review; cutover gates |
| `FIX-004` | REVIEW-002 findings 7 (non-UTF-8 text) and 8 (one deadline for the detail route), in Go | Implementation complete, uncommitted at handoff | Codex peer review; cutover gates |
| `VERIFY-001` | The two Phase 1 verification gates that can be tried locally: `go test -race`, and how the Next.js rewrite forwards awkward URLs | Forwarding checked for `next dev`, 46 of 46, uncommitted at handoff. Race detector not run | `CI-001` for the race detector; a preview deployment for the same check on Vercel; Codex peer review |
| `GO-006a` | Contract fixtures for `github/trending`, fixing its random `starsToday` source | Not started; unassigned | Nothing |
| `FIX-002` | Make the navbar's "Most Stars" and "Recently Updated" work. Offered to the owner as the real task in `learn-go/02-structs-and-maps`. Do not fix it unasked: it is the owner's exercise | Reserved for Owner | Owner |
| `CI-001` | A workflow that runs `npm run test:contracts`, and `go test -race`, `go vet` and `gofmt -l` in `backend/`, plus `go test -tags solution` in `learn-go/`. It is the only planned way to run the race detector | Ready to implement | Owner approval |
| `OPS-001a` | `backend/cmd/api` reads the `PORT` variable a hosting platform sets, with lesson 15 | Implementation complete, uncommitted at handoff | Codex peer review |
| `OPS-001` | Choose hosting for the Go service; deploy to a staging environment; take the measurements the ADR requires. Proposal written in the ADR | Proposal written; nothing deployed | Owner |

Suggested ownership: whichever agent is available takes the writer role for one task and records it under "Current state"; the other reviews.

## Owner decisions pending

- Navbar sort (`FIX-002`): teach the API the navbar's names, or change the navbar to the API's names.
- How to host the Go service within Vercel's free tier, before anything is deployed. The owner has said: Vercel for Next.js, Supabase for the database, free tier only, no paid resource without approval. Two options and a recommendation are in "Hosting proposal" in `adr/0002-go-backend.md`.
- AI endpoint and playground-key policy, before Phases 2 and 3.
- Contributions route: the owner chose on 2026-10-12 to port it although nothing calls it, and it is ported with its defects reproduced. Still to decide: the seven groups of `defect` cases in `contracts/github-contributions/README.md`, the first being whether its date range should be computed in UTC.
- **Who may see private repositories.** The owner approved input validation (done in `FIX-003`) and said the server token is not to be limited to public data. Until an access rule exists, the summary and search routes return whatever that token can read to any caller, in production on Next.js today as well as in Go.
- Approval for `CI-001`. It adds a GitHub Actions workflow file and uses GitHub's free minutes. Without it the race detector has no machine to run on.

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
