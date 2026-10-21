# Show-once playground verification

## CI-KEYS-002 / R171: destination zoom readiness (2026-10-21)

Final receipt: fixture source55d8c35 is on both remote branches. Hosted
[39649911218](https://github.com/sefgh-ai/sefgh-main/actions/runs/39649911218)
is overall SUCCESS: verify119395210686 and keys-postgres119395211211 both pass.
Actual desktop/phone/zoom200 checks and the separate default-off production
build/browser step pass. Contracts1512/1512, forwarding152requests, Phase2
69requests/6gates, backendrace/vet and nativeSQL120checks pass. Lessons are
explicitly skipped under owner policy. This supersedes the failed R171 run for
corrected-source acceptance without erasing that failure or implying rollout.

The newer documentation-only source6dadafc hostedrun39613327377 failed in the
zoom fixture after desktop/phone passed. Page.navigate acknowledged navigation
before document.documentElement existed; the immediate .style dereference
threw. Default-off browser step consequently skipped. Earlier green622f7c3
remains historical evidence, not proof every later fixture run passed.

The probe now calls prepareKeyProbeZoom before form interactions. One evaluated
predicate requires the exact destination URL, installed fixture, body and root,
then sets zoom atomically. The initial about:blank document cannot satisfy it.
Monotonic bounded polling rejects a never-ready page; evaluator errors remain
failures. The rendered probe additionally asserts computed root zoom equals2.
Actual-expression VM regressions failed2cases with the old setter; all3 pass
with the correction, independently under Hume. No application, Chrome startup
flag/deadline, Go, SQL, environment or lesson change is involved.

Codex's actual protected-page production probe30377 --reuse passed desktop1280,
phone390 and zoom200 at640, with all existing product assertions and the new
computedzoom check. Reused only the existing synthetic build/auth-port manifest;
no live project, user, key or provider was used. Focused strictlint0 and
syntax/diff pass. Hume source/focused acceptance REVIEW022; full handoff and
replacement hosted results are recorded in coordination.md.

Final receipt: source UI6a1ee1a plus fixture622f7c3 are committed/synchronized.
Hosted39609303873 on622f7c3 overallSUCCESS: verify119253652382 and native
keys-postgres119253652570 success.1505contracts, Linux race/vet,44lessons,
152forwarding, Phase2 acceptance69requests/6gates, trending desktop/phone,
enabled keys desktop/390/zoom200 and separate default-off production build/
browser all pass. SQL120checks pass. Hume source reviews019/020 accepted;
hosted/browser evidence is parent-run. No SQL apply, runtime enable or deployment.
Later final-receipt commit is documentation only; its CI status is separate.

Hosted follow-up:39606408872 on6a1ee1a passed all pre-key checks, but enabled
key fixture failed a premature disabled-Revoke click after404 refresh recovery.
R169 is a fixture synchronization defect; no product DELETE/dialog occurred.
CI-BROWSER-001c / BUG-018 waits enabled/visible controls and deliberately delays
metadata refresh to verify the product lock and eventual revoke interaction.
Corrected parent production desktop/390/zoom200 probe passes; syntax/focused
lint/diff pass. Replacement hosted acceptance remains pending. No app/Go/SQL
changed in this follow-up; final default-off hosted result still required.

KEYS-UI-001 / BUG-017, 2026-10-21. Source base791b471, result uncommitted
until normal handoff/Git Agent receipt. SQL remains a review proposal.

`NEXT_PUBLIC_SEFGH_KEYS_V1=1` selects the new view at build time. This task
changes no deployed configuration. There is no v1 rewrite or registered
Go runtime yet: setting this UI flag alone does not activate a service. A
404/503 fails closed, with no legacy key or browser-accounting fallback.
Default-off builds retain the old playground until a reviewed transition.

The client sends a current Supabase bearer only to fixed same-origin owner
management paths, with no-store, omitted ambient credentials and refused
redirects. It checks current owner before/after dispatch/body, never accepts a
client owner field, and treats post-dispatch session/network/body failures as
ambiguous creation. Refresh metadata before another creation; never retry
automatically. Lists strictly admit metadata only, reject foreign owners,
numeric/duplicate IDs or secret/hash fields, and bound10,000rows/20MiB/20s.
The allowance includes long permitted UTF8/escaped names. Cancellation settles
session, fetch and response-stream waits even when a fixture ignores abort.

The secret lives only in a reveal dialog. Close/Escape clears it; owner changes,
tab switches and client navigation unmount its owning state. Clipboard feedback
waits for success and ignores stale completions. This clears application
references; it does not promise erasure of JavaScript heap or the user's saved
clipboard. Lists cannot reopen a secret. Creation uses a synchronous single-
flight guard; refresh/revoke cannot race an older list into reactivating a key.

Testing accepts a pasted canonical key for only GET/api/v1/search. It never
substitutes the session bearer, permits arbitrary URLs/headers, stores keys,
or writes usage. Editing inputs clears results and invalidates pending work.
Encoded queries are checked against the existing4096-byte raw-query allowance.
The reference stops advertising unimplemented chat/trending APIs or invented
quota tiers; the default-off page clearly says the new API is unavailable.

## Evidence and remaining acceptance

Thirteen meaningful client tests pass, including red/green regressions for
post-POST session failures, blocked-session cancellation, full Unicode history,
numeric IDs and encoded query bounds. Nine initial client tests passed before
independent Hume review found those gaps; that earlier pass was not acceptance.

Actual Next production builds and enhanced desktop/390px/200percent zoom flows
pass. Browser testing reproduced R158 (focus restored to a disabled button);
focus now returns to the name input, and revoke uses an enabled action fallback.
Screenshots exposed existing R166 CookieBar clipping/nav obstruction; corrected
available width, wrapped actions, bounded scrolling/nav clearance now passes
actual choice hit-testing in every enabled view. The probe exercises Tab and
Shift+Tab, Enter/Escape, clipboard failure/success/late completion after close,
single submission, metadata-only refresh, failed/successful revoke/modal status,
exact pasted bearer, edited-query invalidation, tab cleanup, deferred owner
switch with chunked cookies, ambiguous no-retry and pending client navigation.
No unexpected API/data request or uncaught browser exception observed.
Hume accepted final source (REVIEW-019); independently13client/6startup cases
and cancellation/cookie-filter edge probes pass. Parent full1505contracts,
strictlint0, doc/register/diff checks and separate final default-off production
build/probe pass. Normal handoff and hosted CI remain pending at this record.

Run `node scripts/keys-browser-probe.mjs` for the enabled production fixture and
`node scripts/keys-browser-probe.mjs --off` for a separate default-off build.
The probe generates SDK session cookies for two synthetic users, including a
chunked replacement session, exercises the real protected/page/auth provider,
and intercepts only explicit fixture endpoints. No test-only app route, live
account, real key, SQL apply, Go registration or provider execution is involved.
Optional `--report=PATH` writes secret-free assertion summaries and synthetic
screenshots. `--reuse` requires that build's ignored Auth-port/flag manifest:
public settings are compiled, so a fresh random fixture port cannot reuse it.

Owner SQL review, policy/expiry/retention values, accountant JWT provisioning,
recovery scheduling, two-user hosted gateway proof, legacy plaintext transition,
runtime configuration/forwarding, preview/rollback and cutover remain open.
R039 remains open; original route implementation count remains23/25.
