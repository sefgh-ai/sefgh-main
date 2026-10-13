# Claude Code review and reconciliation

## REVIEW-006: Claude Code review of AUTH-001 and AUTH-002, 2026-10-13

Scope: Codex's access boundary, base `9480ef9`. AUTH-001: `src/lib/github/access.js`, `backend/internal/githubaccess`, the server wiring in `backend/cmd/api`, and the token handling in `backend/internal/githubrepos`. AUTH-002: `src/lib/repo/repoData.js` and `src/app/api/repo/starred/route.js`. Method: read the code, then change it on purpose and see whether the tests notice. This is the independent review those two tasks were waiting for. It does not cover CI-001, VERIFY-002 or VERIFY-003, and it used no live Supabase or GitHub.

### Verdict

The design holds: I found no way for a caller to obtain another user's data or the server's token. The tests did not hold: they would have let several such mistakes through. That is fixed in this batch. Accepted with routing off; live-provider checks remain before any cutover.

### Deliberate breaks, before any fix

| Target | Breaks | Noticed | Not noticed |
|---|---|---|---|
| Next.js: `access.js`, `repoData.js`, starred route (applied in memory) | 42 | 30 | 12 |
| Go: `githubaccess`, `cmd/api` wiring, `githubrepos` (scratch copy) | 27 that compiled | 14 | 13 |

### Findings

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | High | In Go, giving the public handlers the server's `GITHUB_TOKEN`, or giving a verified caller's handlers no token, passed every test. `TestPrivateRepositoryIsolation` built its own copy of the wiring line and never ran the server's. The one property AUTH-001 exists for was not protected against a change in `run()` | Fixed. `newHandler` builds what the server serves; `run()` and the tests both call it. A new test sends each of the five routes through it, signed in and not, with a decoy server token, and checks the credential on every request that reaches GitHub |
| 2 | High | In both implementations, accepting a linked identity from any provider passed every test. So did accepting a user with no id | Fixed with shared cases: `other-provider-same-id`, `user-without-id` and 18 more, 35 in all, passed by both |
| 3 | Medium | The two implementations disagreed on malformed issuer replies. An identity id that is a number: Next.js 403, Go 503. A `null` identity entry: Next.js 503, Go 403. A GitHub id written `101.0`: Next.js accepted, Go 503. A reply with status 201: Next.js read it, Go 503. None let anyone in | Fixed. Go now checks each field as the Next.js check does, through `jscompat.DecodeJSON`; Next.js skips a malformed entry and treats only 200 as an answer. Each case is pinned for both |
| 4 | Medium | Not noticed in either: no length limit on credentials, missing configuration treated as usable, the public key not sent to Supabase, an identity reply over 1 MiB accepted, a deadline ten times longer. In Go also: repeated headers accepted, and a verified caller's token following a redirect on search and contributions | Fixed with tests in both. The deadline is a named constant in each, a test in each requires four seconds, and a short deadline is injected to test the cut-off itself |
| 5 | Low | The write-timeout guard compared only the 25-second detail route with the 30-second limit, not the four seconds of verification before it | Fixed: the guard adds them |
| 6 | Low | A private summary bypasses the shared cache twice over: the handler's own rule and a new handler per request. Removing the handler's rule passed every test | A test now pins the handler's rule on its own |
| 7 | Low | AUTH-002: an error status with a public-looking body, and a stored name with three parts, were not covered | One case and one row added |

### What the review could not establish

- Anything about the live providers: the shape of Supabase's `/auth/v1/user` reply for this project, how soon it refuses a signed-out session, or which GitHub token a browser would hold. The application requests no GitHub scopes at sign-in, so no token it obtains today can read a private repository.
- Behaviour behind Vercel's routing.
- Cost: every credentialed request makes two identity calls first. Nothing limits how often a caller can make the server ask Supabase.

### Still open, for the owner

- **Anonymous quota.** AUTH-001 and AUTH-002 removed the server token from every public read. The repository page now asks GitHub on each view with no cache, and I believe twice per view, because `generateMetadata` and the page each call it and a request with a timeout signal is not shared between them. That was read from the source, not measured. GitHub allows 60 unauthenticated requests an hour per address.
- A cached public summary outlives the repository being made private (REVIEW-005 and the alignment report). Unchanged.

### After the fixes

The same breaks again, with new ones for the changed code. Next.js: 46 of 46 noticed. Go: 38 of 39 noticed. The one left changes nothing: without Go's explicit "identities must be a list" check, the reply still yields no linked account and is refused by the next check, with the same status and no call to GitHub.

Two things the second round improved further. The first size-limit test did not notice the limit being removed, because reading already stops one byte past it and cut-off JSON fails to decode; a complete reply followed by white space is now tested in both implementations and does notice. And the fraction case was changed so that it bites in Go as well as in Next.js.

Final check results for this batch are in coordination.md.

## REVIEW-005: Claude Code review, 2026-10-13

Scope: Codex's uncommitted batch at base `259ff7b`: GO-007b (trending developers in Go), lesson 18 and AI-001a (AI suggestions fixtures). Claude Code took the batch over at the owner's instruction when Codex stopped on a usage limit. The same checks reached into GO-006b (trending in Go) and used GO-007a's fixtures. This was a review with fixes in the same batch, not a read-through.

Not covered, and still without an independent review: AUTH-001, AUTH-002, CI-001, VERIFY-002 and VERIFY-003. The read-only alignment report of 2026-10-13 looked at AUTH-001, CI-001 and VERIFY-002, but ran no full suites and no deliberate breaks. GO-006a's and GO-007a's fixtures were relied on here, not reviewed case by case.

### Verdict

Accepted with routing off. Codex's tree, before any change of mine, passed every check it had left to run. The review found two things to fix and two differences to record. No route is approved to switch on.

### Codex's tree as found

| Check | Outcome |
|---|---|
| backend `gofmt -l`, `go vet ./...` | Clean |
| backend `go test -count=1 ./...` | 9 packages pass |
| `go build -o bin/api.exe ./cmd/api` | Builds |
| learn-go `go vet` with and without the solution tag, `go test -tags solution ./...` | Clean; 19 packages pass; lesson 18 fails as shipped without panicking |
| `npm run test:contracts` | 470 of 470 |
| ESLint on `next.config.mjs` and `scripts/contracts` | Clean |
| `git diff --check` | Clean |
| Production forwarding probe | 55 of 55, exit 0 |

### Findings

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | Medium | The two newest handlers, trending and trending developers, logged nothing when they failed. A 500 left no trace of why. This is REVIEW-002 finding 3 again, in new code | Fixed. Each takes a `Logger` and writes one error record for a failed request: the stage and the cause, never the address. Tests require exactly one record, its content, no address, and none for a success or a 400 |
| 2 | Medium | A differential check sent 32 inputs the 48 developer fixtures do not cover to the Next.js handler and to Go. 12 answers differed. GitHub sends none of these, but they were untested ground behind "anything the fixtures cover is identical". A leading byte-order mark was accepted by Next.js and answered 500 by Go, in trending as well. A search entry that is a number, string, boolean or array became a card for "undefined" in Next.js and a 500 in Go. A login that is an object or array was sent to GitHub in Go's own formatting (`map[]`, `[a b]`). A repository reply that is a string produced a different card | Fixed. `jscompat.DecodeJSON` reads a reply as `response.json()` does and both handlers use it. The developers handler converts entries and logins as JavaScript does. Ten fixtures added, 9 for developers and 1 for trending, recorded from the unchanged Next.js handlers and passed by both implementations |
| 3 | Low | Two differences are left on purpose. A numeric login keeps the digits GitHub sent, so `1.0` asks for `/users/1.0/repos` where Next.js asks for `/users/1`. A repository reply that is an object with a `length` field is "no repositories" in Go where Next.js answers 500 | Recorded in the ADR. A Go test pins each |
| 4 | Low | Lesson 18's test accepted a plain loop: it only required at most two calls at once | The test now requires exactly two |
| 5 | Low | AI-001a had no case for a JSON body that is not an object | Three cases added: an array, a string and a number are answered like an empty body. A body of `null` answers 500 with the JavaScript engine's own wording, which changes between Node versions, so it is described in the contract README and not pinned |
| 6 | Note | Checking my own test table against Node showed that Node 21's `Response.json()` accepts two leading byte-order marks: its fetch removes one and its text decoder then removes another. The fetch standard removes one | Go follows the standard. Recorded in the ADR, with a test |

Considered and rejected: cancelling the remaining lookups as soon as one fails. It would save anonymous GitHub quota, but the fixtures pin every upstream call the Next.js handler makes, and that handler does not cancel.

Looked for and not found: a data race in the fan-out (results and errors are written by index, one goroutine per index, and read after `Wait`); any path that forwards a caller's credential (the handler has no token field, and the server test sends both headers and checks nothing arrives upstream).

### Deliberate breaks

21 deliberate breaks of the fixes, in a scratch copy outside the repository. 20 were caught at first. The survivor, an empty string reply treated as a repository, had no fixture; `repository-reply-is-empty-text` was added and then caught it. The breaks covered the decoder (byte-order mark, trailing text, digits), each conversion in the developers handler, the failure count, and the log records of both handlers including the address being kept out.

### Hosted CI

`node scripts/agent-handoff.mjs --status --ci` reports the "Backend verification" run 38351494790 for `259ff7b` as completed with conclusion success. That workflow runs `go test -race`. It is the first hosted race-detector result recorded for this project, and it covers what was committed at `259ff7b`, not this batch. I read the status through the script and did not open the run's logs.

### Still open

- **Quota.** One call to the developers route makes up to 21 GitHub requests with no credential. GitHub allows 60 an hour for one address without a credential, so three calls an hour use it up. After that every lookup is refused and every developer is shown as having no repositories, which is recorded defect 3 in the contract. This is the same anonymous-credential decision as search and it must be made before this route is switched on.
- AUTH-001, AUTH-002, CI-001, VERIFY-002 and VERIFY-003 have not had an independent review.

## Alignment follow-up (Codex, 2026-10-13; not peer approval)

Owner pasted Claude's independent read-only alignment report at 7e0820c.
Codex accepts the remaining token paths, anonymous capacity, cache-retention,
probe credential, and deployment-evidence findings. The starred API already
requires Supabase auth; its GitHub authority was the mismatch. Missing explicit
OAuth scopes does not establish every issued token's actual grants. The policy
is settled, while consent design remains open. New AUTH-002 / VERIFY-003 work
addresses page/starred shared-token reads and exact probe credentials; independent
review is still required. Go summary cache retention, remaining token consumers,
malformed-issuer parity, quota and live release evidence are not closed here.


## REVIEW-004: Codex review, 2026-10-13

Reviewed at base `905c1d9`, before AUTH-001: GO-005a/b (contributions fixtures,
GraphQL/date/rounding implementation), FIX-003 (matching input validation and
encoding), FIX-004 (UTF-8 decoder and detail deadline), VERIFY-001 (forwarding
probe), OPS-001a (PORT precedence and validation), their relevant tests and
lessons 13-15. Source and deterministic checks, not a production security audit.

Verdict: these implementations are acceptable with routing off. The shared
fixtures pass; input rules match, the decoder handles partial UTF-8 sequences,
the detail deadline is shorter than the server write timeout, and PORT has
explicit precedence/range checks. Contributions' recorded timezone/coercion
defects remain deliberate. No repeat of Claude's mutation campaign is claimed.

Rollout findings:
- High: private policy was already decided by the owner but not transferred to
  these docs. Shared server-token permissions cannot implement that policy.
- High: the Next switch does not disable endpoints at a separately hosted Go
  origin. Token-bearing direct requests need their own authorization boundary.
- Medium: the original forwarding probe tested next dev only and its teardown
  used Windows taskkill unconditionally. Production/Linux coverage was absent.
- Medium: the handoff's uncommitted warning was stale; the tree was clean at
  905c1d9. The hosted race, Vercel routing, measurements and rollback gates remain.

AUTH-001 and VERIFY-002 in the current change address the first three findings
locally; CI-001 supplies the hosted verification workflow. Owner authorization
to implement these recommendations is recorded in ADR-0002. New implementation
was authored by Codex and has **not** received independent peer review.
See coordination.md for actual final checks, not historical counts below.

In particular, this review is not approval to deploy, enable a route, grant a
shared token private access, or send private results into the existing browser
cache/chat/share flows. Private UI integration and remaining server-token call
sites still require their own bounded work.

> Later decision, 2026-10-11: the owner chose Go instead of Rust (`adr/0002-go-backend.md`). This file records a review of the Rust proposal as it happened and is not rewritten. Its findings about the application do not depend on the language. Where it says Rust or SQLx, the current plan says Go and `pgx`.

Date: 2026-10-11. Source baseline: `42759dd`. Reviewer: installed local Claude Code 2.1.286, invoked by Codex at the user's request. This is a curated summary of its actual review, not a claim that Claude shares Codex's chat history.

## Review method

Claude ran in non-interactive restricted/plan mode with only Read, Glob, and Grep tools, with MCP disabled for the review. The prompt excluded edits, shell execution, agent spawning, secrets, settings, and private session history. It reported reading about 15 of the 25 API route files in full and covering the remainder through search. The process exited successfully and returned a substantive architecture review.

## Findings accepted after Codex source checks

- Browser Supabase access is a major backend boundary and must be included in an eventual full application-backend migration.
- Session refresh and the auth callback need to remain coherent during a staged port.
- App database schemas, RLS, RPC bodies, triggers, and bucket policies are not versioned in this repository.
- AI endpoint auth/quotas, plaintext playground keys, browser-written usage logs, comment admin lookups, conversation read-modify-write, and trending refresh authorization/recovery need explicit treatment.
- Next fetch-cache behavior needs an equivalent when its handler moves.
- Keep managed Supabase services initially; use contract tests, user isolation tests, and rollback per domain. No measured Rust performance benefit has been established.

## Differences resolved in the proposal

| Claude suggestion or wording | Codex reconciliation |
|---|---|
| First slice includes GitHub proxies and trending-refresh cron | Limit the first slice to search/repository reads. Cron writes to the database, requires verified permissions, and clears current data before replacing it. It is not stateless. |
| SQLx connections bypass RLS | More precisely, database role, table ownership/BYPASSRLS, RLS configuration, and session claims determine authorization. SQLx does not itself bypass RLS. Prefer user-JWT Data API calls initially. |
| GitHub cache settings are the only rate-limit protection | Existing source also has request sequencing and some client caching. The actionable finding is inconsistent token/cache handling and no comprehensive shared upstream budget, not an absolute absence of every protection. |
| Keep thin CRUD wrappers managed until RLS strategy settles | Keep them temporarily, but an eventual all-custom-backend Rust target includes their migration and the browser data calls. |
| Production is likely Vercel | Unverified. Analytics dependency and cron comments do not establish deployed topology. No hosting claim or migration decision is based on this inference. |

Codex also inspected selected sibling Python entry points and found distinct semantic-search contracts (`embedding`/`match_repo_analysis` versus `description_embedding`/`match_repos_*`). These were outside Claude's initial review scope and are explicitly added to the shared backend map.

## Shared-document readback

Completed successfully in a second read-only Claude invocation. Claude read all six shared files, agreed with the staged scope and reconciled boundaries, and independently checked the route/handler count, RPC names, package declarations, and search contract. It did not independently inspect sibling Python source or re-count the 22 tables.

The readback caught the inherited-object-key sort fallback bug and requested more precise search fixtures, explicit handling of untracked documents before worktrees, and separation of contract preparation from Rust implementation. These were incorporated. Codex refined one reviewer detail: infinite `page` survives the clamp, but infinite `per_page` becomes 100. The reviewer suggested fresh permission for routine checks; the shared workflow instead follows existing user authorization and does not add a blanket approval requirement. Deterministic fixtures do not require live GitHub calls.

## Codex Go-plan readback — 2026-10-12

Scope: SYNC-001, documentation synchronization at `2b4f880` on `go-backend`. This is not the pending line-by-line review of FIX-001, GO-001 or LEARN-001. See `coordination.md` for the checks rerun and the complete handoff.

Agreement:

- ADR-0002 is accepted; ADR-0001 is historical and must not be implemented.
- Search contract version 2, the opt-in Go search route, and nine Go lessons exist. The remaining Phase 1 routes are still future work; implementation, peer review and cutover are distinct states.
- Managed Supabase stays. Browser business-data calls and the eventual chosen Python worker pipeline remain in full migration scope. Database authorization depends on roles, policies and claims, not the choice of database driver. Trending cron writes remain outside the first read slice.
- Every backend Go change requires the corresponding tutorial update. Owner exercises and FIX-002 stay reserved for the owner.

Corrections applied to shared documentation:

- Removed assertions of equivalent Go/Rust latency, lowest memory use and measured build advantages: no such comparative measurements exist here.
- Replaced unconditional merge-safety wording with pending review status; Next.js search fixes would take effect on merge even with Go routing disabled.
- Corrected the ADR's 405 wording to exclude HEAD as well as GET, consistent with the server's GET route registration and backend README.
- Clarified that the backend map's original source-only audit predates Claude's later reported local runtime checks.

No contracts or implementation decisions changed. Existing tests passed, but fixture completeness, implementation parity outside covered cases, switch behavior and lesson accuracy still require the six requested review items. Claude has not reviewed or acknowledged this new documentation diff.

## GO-002 peer review by Claude Code — 2026-10-12

Task `REVIEW-002`. Scope: commit `6e0753d` (GO-002a fixtures, GO-002b Go port, lessons 09 and 10), reviewed at `43513d4`. Read-only: no implementation, fixture, test or lesson file was changed. Every experiment ran in a copy outside the repository.

### Verdict

- **As merged with routing off: acceptable.** On every input the fixtures cover, the Go handlers and the Next.js handlers behave the same, and no route receives traffic unless it is switched on.
- **Not ready to switch on.** Resolve findings 1 to 5 and close the items under "Not verified" before `github-repo`, `github-repo-details` or `github-contents` is enabled anywhere public.

### What was checked

| Check | Outcome |
|---|---|
| All 97 `wire_url` values in the fixtures, recomputed with Node 21.7.1's URL parser | All 97 match |
| `jscompat.FetchURL` against Node's URL parser on 712 generated URLs built the way the handlers build them | 640 identical. 72 differ, and all 72 contain `\|` or `^` (finding 4) |
| 27 deliberate breaks of `handler.go`, `cache.go` and `fetchurl.go`, one at a time, then the package tests | 16 caught, 11 not caught (finding 5) |
| 20 concurrent callers asking the cache for one key whose answer is a 404 | Finding 2 |
| A panic inside the cache's load function | Finding 6 |
| README bytes that are not valid UTF-8, decoded by Go and by JavaScript | Finding 7 |
| Lessons 09 and 10 | Solutions pass, exercises fail without panicking, `go vet` clean. Each statement compared with the code (finding 9) |
| `go test -race` | Could not run here: no C compiler, cgo disabled |

Reading the three Next.js handlers beside `handler.go` line by line found no difference on valid input. Every break that would leak the server token to the wrong call was caught by the fixtures.

### Findings

Ordered by how much they matter. "Inherited" means the Next.js handler behaves the same way, so the port did not introduce it.

1. **High, inherited: the summary route gives callers the server token's reach.** Owner and name are pasted into the GitHub URL unchecked, and dot segments are resolved, so `owner=..&name=../user` requests `https://api.github.com/user` with the server's token. Only the 20 summary fields come back, which limits what leaks, but the caller chooses the endpoint. Codex already recorded the interpolation as an open defect; this confirms it and adds a second point: even with ordinary input, if `GITHUB_TOKEN` can read private repositories, `/api/github/repo` and `/api/github/search` will return their metadata to anyone. The second point follows from GitHub's documented behaviour and was not tested; the token was not inspected. **Owner action:** confirm the token is limited to public data. **Before cutover:** validate owner and name as single GitHub name segments in both implementations, as a contract change.

2. **Medium, new in Go: an answer that cannot be cached makes concurrent callers queue.** The cache lets one caller fetch while the others wait, but it only shares a 200. After any other result each waiter wakes, finds nothing stored, and fetches again in turn. Measured: 20 concurrent callers for one key answering 404, 50 ms per upstream call, produced 20 upstream calls strictly one at a time, and the slowest caller waited 1.0 s. Next.js makes those calls in parallel. No upstream call is saved and latency grows with the number of callers, during exactly the conditions (missing repository, rate limit, GitHub error) where it hurts. Suggested fix: hand the fetching caller's result, whatever it is, to the callers already waiting, and still store only a 200. Retry only when the fetching caller was cancelled.

3. **Medium, new in Go: this package logs nothing.** `fetch` replaces every cause with the text `fetch failed`, and `fail` writes the 500 without recording it. The Next.js handlers call `console.error`, and the Go search handler logs through `slog`. As written, a timeout, a DNS failure, an oversized body and a GitHub 500 are indistinguishable to whoever operates the service. Suggested fix: give `Handler` a logger as `githubsearch.Handler` has, and wrap errors with `%w`.

4. **Medium, new in Go: `|` and `^` in a path are not sent the way Node sends them.** Node leaves both characters as they are. `FetchURL` hands the path to `url.Parse`, and Go re-escapes them to `%7C` and `%5E`. Worse, when that happens Go rebuilds the path from its decoded form, so an encoded slash in the same path becomes a real one: `a|b%2Fc` is sent as `a%7Cb/c`, a different resource. No fixture contains either character. Both are legal in file names, so the contents route can meet them. Suggested fix: always build the result in the `Opaque` form the function already uses for invalid percent escapes, and add fixture cases.

5. **Medium: the tests miss real breakage in the cache.** These breaks left every test passing:
   - The cache stores non-200 replies. `TestCacheDoesNotStoreFailuresAndBoundsMemory` is meant to catch this but cannot fail: its cache holds 4 bytes and the 404 entry is 9, so it is rejected for size whether or not the status is checked.
   - A background refresh is cancelled when the caller that triggered it goes away.
   - A second refresh starts while one is already running.
   - The newest entry is evicted in place of the oldest.
   - An entry counts as stale only after more than an hour, not at exactly one hour.
   - Any 2xx is stored, not only 200.
   - The 10-second per-call timeout is removed. The timeout test passes on the client's own 20 ms timeout.
   - Status 300 is treated as success; a repeated rate-limit header uses only its first value; a URL with credentials is accepted; `{` and `}` in a path are not escaped.

   The README beside the fixtures lists refresh survival and oldest-first eviction as implemented behaviour. They are implemented, by reading, but nothing would notice if they stopped being true.

6. **Low, new in Go: a panic while loading leaves its key blocked for good.** `fill` registers its cleanup after `load` returns. Measured: after a panic the key stays marked as loading, and the next caller waits until its own deadline. In the background refresh there is no `recover`, so there the panic would end the process. No path to a panic was found in `fetch`; this is about robustness. Suggested fix: `defer` the cleanup before calling `load`, and recover in the refresh goroutine.

7. **Low, new in Go: a README that is not UTF-8 decodes differently.** Go's `strings.ToValidUTF8` writes one replacement character for a whole run of invalid bytes. JavaScript writes one per invalid sequence. Measured: a UTF-16 file with a byte-order mark gives 2 replacement characters in JavaScript and 1 in Go; four GBK bytes give 3 and 1. The text is unreadable either way, so only the count differs. The contract README already places malformed UTF-8 outside the fixtures. Either match JavaScript's decoder or add this to the ADR's table of recorded differences. `jscompat.ParseQuery`, from GO-001, has the same property.

8. **Low, by reading only: the detail route can outlast the server's write deadline.** It makes three calls in sequence, each allowed 10 seconds, and `cmd/api` sets a 30-second write timeout. A GitHub that is slow but not failing could push the reply past the deadline, and the caller would get a dropped connection, not the JSON 500. Suggested fix: one deadline for the whole handler.

9. **Low: lessons 09 and 10 assume more than lessons 00 to 08 do.** Lesson 10 uses "goroutine" and "channel" without saying what either is, and they are the two ideas the lesson depends on. Both lessons drop the closing "You now know" list the earlier ones have. Lesson 10 says other requests "wait for its completion", which is true only when the fetch succeeds (finding 2). Nothing in either lesson is wrong about Go.

10. **Test gap: nothing checks `wire_url` against Node.** The Node runner compares only the raw `url`. `wire_url` is what Go must match, so a wrong value would force Go to be wrong and no test would object. All 97 are correct today. Suggested fix: have the Node runner assert that `new URL(url)`, without its fragment, equals `wire_url`.

11. **Inherited, for the owner: detail and contents send no token.** GitHub allows 60 unauthenticated requests an hour per address, and one detail view costs three. That is about 20 repository pages an hour for the whole site from one server address. The port copies this faithfully. Changing it is a contract decision.

### Not verified

- The data-race detector has never run on the cache. It needs a C compiler, which neither agent's environment here has. Reading found every map access under the mutex and cached values only read. Run `go test -race` on Linux before cutover.
- How Next.js forwards percent-encoded path segments, such as `%2F` in an owner, to Go for the two routes with path parameters. The fixtures call each handler directly.
- Everything Codex already listed: live GitHub behaviour, the Next.js Data Cache in a real deployment, redirects, and measurements.

### No disagreements

Nothing here contradicts a decision in ADR-0002 or a statement in the contract README. Findings 1 and 11 extend open items Codex recorded. Findings 2 to 8 are new.

## GO-003 response by Codex — 2026-10-12

Base `1e5d87f`, `main`. This is the implementing agent's response, not a new
Claude review. GO-003 preserves contract version 2 and leaves all Go routes off
by default. See `coordination.md` for the release record and actual checks.

| REVIEW-002 finding | Implemented response |
|---|---|
| 2: queued failures | `cacheFlight` publishes the result/error to existing waiters, even when it cannot be cached. Only 200 is stored for future callers; surviving waiters retry a cancelled leader. A barrier-based test verifies 20 callers share one load for 201, 404, 429, 500 and transport failures |
| 3: missing logs | Repository handlers receive the server's `slog` logger. Upstream errors preserve causes with `%w`, record the failing stage, and log non-2xx status. Tests check DNS/timeout/body-limit/status diagnostics without request URL, token or body leakage |
| 4: path encoding | `FetchURL` always preserves its normalized path through `Opaque`. Five additive fixtures cover `|`, `^`, braces and adjacent encoded slashes; Go runs them over sockets |
| 5: missing regressions | Separate storage-policy tests use replies that fit in the cache. Tests cover exact expiry, detached single refresh, oldest-stored eviction, an independent ten-second fetch deadline, 300 rejection, repeated headers, credential rejection and braces |
| 6: panic cleanup | Cleanup is deferred before loading; foreground/background panics become errors, release waiters and preserve stale data. Tests verify another request/refresh can recover |
| 9: lesson clarity | Lessons 09/10 now explain goroutines/channels and include closing learning lists. New lesson 11 practices completion/cancellation and preserving shared errors; existing owner exercises are untouched |
| 10: unchecked wire fixtures | A Node test independently checks every `wire_url` against `new URL(url)` with its fragment removed |

Codex's validation: fresh Go tests and 174 Node contract checks pass; cache tests
pass 20 repeated runs. Twelve deliberate mutations in an external scratch copy
were all caught by test assertions: failure sharing, storing non-200, tying
refresh to caller cancellation, duplicate refresh, newest-first eviction, late
expiry, missing deadline, status 300 accepted, dropped repeated header values,
URL credentials accepted, braces unescaped, and pipe/caret re-encoding.
This is targeted regression evidence, not a full mutation score or performance
measurement. No application mutation was applied to the working checkout.

Still open: finding 1's owner decision and token scope verification; finding
7's malformed UTF-8 behavior; finding 8's whole-handler deadline; finding 11's
upstream identity policy. Race detection was attempted and could not run
because cgo is disabled; no `gcc` or `clang` was found on PATH. Encoded-segment
rewrite behavior, production cache/hosting choices, staging measurements and
independent peer review of GO-003 remain unverified. Lint still reports the
existing 10 errors and 16 warnings in unchanged UI files. No deployment,
route activation, live GitHub/Supabase audit or production build was performed.

## GO-003 and GO-004 peer review by Claude Code — 2026-10-12

Task `REVIEW-003`. Scope: GO-003 (`cd8906c` against `1e5d87f`) and GO-004 (`b0ef691` against `cd8906c`), reviewed at `b0ef691`. Read-only: no implementation, fixture, test or lesson file was changed. Experiments ran in a copy outside the repository.

### Verdicts

- **GO-003: accepted.** Every finding it set out to fix is fixed, and the fixes are now guarded by tests.
- **GO-004: accepted with routing off.** No findings.
- Neither verdict changes a cutover gate. No repository route, and not the languages route, is approved to switch on.

### GO-003: the earlier experiments, repeated

| REVIEW-002 finding | Before | After GO-003 |
|---|---|---|
| 2. Uncacheable answers made callers queue | 20 callers, one 404 key, 50 ms upstream: 20 upstream calls, slowest caller 1.0 s | 1 upstream call, all 20 callers received the 404, slowest caller 50 ms |
| 2, continued | Not applicable | A waiter behind a fetching caller that is cancelled retries and gets a fresh result; it does not inherit the cancellation |
| 3. Nothing logged | A transport failure produced a 500 and no log line | Two log lines naming the stage and cause. The token, owner, name and URL do not appear in them |
| 4. `\|` and `^` in a path | 72 of 712 generated URLs differed from Node | 0 of the same 712 differ |
| 6. Panic left a key blocked | Key stayed pending; next caller timed out | Key released; first caller gets an error; next caller succeeds |
| 10. `wire_url` never checked against Node | No test | The Node runner asserts it for every call |

Finding 5 was that the tests missed real breakage. The same deliberate breaks were applied again, with more added for the new logic:

| | REVIEW-002 | REVIEW-003 |
|---|---|---|
| Valid breaks | 27 | 28 |
| Caught by tests | 16 | 25 |
| The 11 that went unnoticed in REVIEW-002 | 0 caught | 11 caught |

Three breaks still pass every test. None is serious, and none blocks acceptance:

1. The cache's byte count is not reduced when an entry is replaced by a refresh. The count would drift upward and cause early eviction.
2. `Handler.fail` stops logging 5xx replies. The log line written by `fetch` is tested; this one is not.
3. `FetchURL` stops treating a backslash as a slash. The contents route rejects backslashes before this point, so only owner and name can reach it.

**Live check, new evidence.** GO-003 changed `FetchURL` to always use Go's `Opaque` URL form. Local socket tests speak HTTP/1.1, and GitHub speaks HTTP/2, so the compiled server was run once against real GitHub without a token. A summary request answered 200 in 0.9 s; the same request again answered in under 2 ms from the cache; a renamed repository (`facebook/jest`) followed GitHub's redirect and returned `jestjs/jest`; a contents request answered 200 with rate-limit values. Six unauthenticated requests were used.

**Lessons.** Lesson 10 now explains what a goroutine and a channel are before relying on them, which was finding 9. Lesson 11 is accurate against `cache.go`. Its solution passes, its exercise fails without hanging or panicking, and `go vet` is clean in both modes.

One observation, not a defect: `fetch` logs every non-2xx reply from GitHub at warning level, so a mistyped repository name writes a log line. That is useful now and may be noisy under real traffic.

### GO-004: languages route

| Check | Outcome |
|---|---|
| The three copies of the catalog: `src/data/github-languages.js`, the contract snapshot, and Go's embedded `catalog.json` | Identical: 565 names, same order, no duplicates |
| Five deliberate breaks: a name changed, two names swapped, a name removed, wrong content type, an added `Cache-Control` | All 5 caught |
| Compiled server, real request | 200 with 565 names |
| Lesson 12 | Accurate. Solution passes; exercise fails cleanly |

The design choice worth keeping: the Go catalog and the Next.js array are each tested against a third, independent snapshot, not against each other and not against themselves. Changing the catalog therefore requires changing three files on purpose.

Not verified, as Codex already recorded: this route has not been exercised through the Next.js rewrite.

### Still open from REVIEW-002

Unchanged by these two tasks, and still required before any repository route is switched on: finding 1 (input validation and token scope, owner decision), finding 7 (non-UTF-8 README), finding 8 (one deadline for the detail route), finding 11 (no token on detail and contents), a race-detector run on a machine with a C compiler, and a check of how the rewrite forwards percent-encoded path segments.

## Where the REVIEW-002 findings stand — 2026-10-12

Written by Claude Code after `FIX-003` and `FIX-004`. Neither of those tasks has been peer-reviewed.

| Finding | State | Where |
|---|---|---|
| 1. Unchecked owner, name and path | Fixed in both implementations, contract version 3 | `FIX-003` |
| 1, second part. The server token may read private repositories | **Open, owner decision.** The owner does not want the token limited to public data and has not said who may see private repositories | ADR, open items |
| 2. Uncacheable answers queued callers | Fixed | `GO-003`, confirmed in REVIEW-003 |
| 3. Nothing logged | Fixed | `GO-003` |
| 4. `\|` and `^` in a path | Fixed | `GO-003` |
| 5. Tests missed breakage | Fixed: 25 of 28 breaks caught, then more tests since | `GO-003` |
| 6. Panic left a key blocked | Fixed | `GO-003` |
| 7. Non-UTF-8 text decoded differently | Fixed: `jscompat.DecodeUTF8`, 0 differences from JavaScript on 200,000 random byte strings | `FIX-004` |
| 8. Detail route could outlast the write deadline | Fixed: one 25-second deadline, guarded by a test | `FIX-004` |
| 9. Lessons 09 and 10 assumed too much | Addressed | `GO-003` |
| 10. `wire_url` unchecked | Fixed | `GO-003` |
| 11. No token on detail and contents | **Open, owner decision**, tied to the private-repository question | ADR, open items |

Verified since (`VERIFY-001`, Claude Code, 2026-10-12): how the Next.js rewrite forwards awkward URLs, for `next dev`. 46 of 46 paths reached Go unchanged, including percent-encoded slashes in a path segment. The script is `scripts/contracts/go-forwarding-probe.mjs`; the record is in `coordination.md`.

Still not verified by anyone: `go test -race` (no C compiler on this machine; planned for CI), and the same forwarding check on a Vercel deployment.
