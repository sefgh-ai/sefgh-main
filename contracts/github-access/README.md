# GitHub access boundary, version 1

AUTH-001 implements the owner's policy for the five migrated dynamic GitHub
handlers: anonymous callers receive public data; signed-in users can use only
their own GitHub account's repository permissions. Languages/health stay public.
No deployment, private UI integration or route cutover is included.

Send both `Authorization: Bearer <Supabase access token>` and
`X-GitHub-Token: <user GitHub token>` for private requests. Use HTTPS outside
loopback tests. Missing both means public; partial or invalid credentials fail
closed. `GITHUB_TOKEN` is never a fallback in these handlers.

Supabase's configured `/auth/v1/user` verifies the session online using the
project's public anon key; GitHub's `/user` verifies the provider credential.
The linked GitHub identity's `id` must match GitHub's numeric ID. The
[Supabase identity model](https://github.com/supabase/auth/blob/master/internal/models/identity.go)
exposes the provider ID as JSON `id`, separately from its `identity_id` UUID.
No cookie parsing, unverified JWT claims, editable `user_metadata`, service-role
key, signing-key assumption or database migration is involved.
See [getUser verification](https://supabase.com/docs/reference/javascript/auth-getuser).

Identity calls share a four-second deadline and each reply is limited to 1 MiB.
Failures return `{"error":"GitHub authorization failed"}` with 401 (invalid
credentials), 403 (unlinked/mismatched account), or 503 (verification unavailable).
Authorization runs before input validation. Supabase's own session revocation
semantics apply; this does not promise instant access-JWT invalidation after logout.

Every private repository read checks GitHub again. Private responses and auth
failures carry `Cache-Control: private, no-store`; private summaries bypass
Next's fetch cache and Go's shared cache. Authenticated redirects are refused;
private callers may need a renamed repository's canonical name. Credentials
cannot follow an enrichment URL to another origin.

`cases.json` is shared by the Node and Go verifier tests. `isolation.json`
checks anonymous, Alice and Bob reads, followed by permission/token revocation.
Node exercises the actual exported handlers; Go uses the production mux factory
over real localhost sockets. Both check all four remaining caller-token routes reject incomplete auth (P7-01 retired contributions).

Route contracts now use `github_token` for a verified **per-user** credential:
search v3 and repository routes v4 (historical versions). Node's `access-fixture.mjs`
supplies the matching fake issuer responses; Go's domain tests inject the
verified token directly. Boundary tests separately verify that runtime wiring
cannot bypass authorization. Authenticated responses add the no-store header.
P7-01 retires the unused contributions endpoint, its contract and implementation
tests from both runtimes; retirement guards replace its auth/missing-token cases.

Private browser requests are intentionally not wired yet: search persists
results under one localStorage key, and chat/share consumers need a privacy
audit. The next UI slice must handle provider-token availability, reconnect,
consent, sign-out/account changes and cache/share isolation before sending
bearer credentials. Do not add custom token storage in localStorage.

Other server-token call sites (`src/lib/github-api.js`, `src/lib/repo/repoData.js`,
starred and trending refresh) still need auditing. No live credential or OAuth
scope was inspected. This is not a claim that the whole live site's policy is fixed.

GO-006b: `/api/github/trending` is public-only, like health/languages, and does
not run the identity verifier. It ignores all supplied credentials and never
sends a GitHub token. Its unchanged Next handler behaves the same way.

GO-007b: `/api/github/trending-developers` is also public-only, matching its
Next handler. It bypasses identity verification and forwards no credentials.

## REVIEW-006 additions (Claude Code, 2026-10-13)

`cases.json` now has 35 cases, shared by Node and Go. The 20 added ones each
came from changing the check on purpose and finding that no test noticed.
The version stays 1: no earlier case changed.

| Rule the added cases pin | Cases |
|---|---|
| Only an identity recorded for the `github` provider counts | `other-provider-same-id`, `later-identity-matches` |
| The Supabase user must have an id, and `identities` must be a list | `user-without-id`, `user-reply-is-null`, `user-reply-is-text`, `identities-not-a-list` |
| An identity entry of the wrong shape is skipped, not treated as an outage; its id must be non-empty text | `null-identity-entry`, `identity-id-is-a-number`, `empty-identity-id` |
| GitHub's id must be a positive whole number | `github-id-is-text`, `github-id-zero`, `github-id-negative`, `github-id-fraction`, `github-reply-is-a-list` |
| 401 and 403 from an issuer both mean refused: 401 | `supabase-refuses-with-403`, `github-refuses-with-403` |
| Only status 200 is an answer; any other is an outage: 503 | `supabase-answers-201`, `github-answers-201` |
| An issuer that cannot be reached is an outage: 503 | `supabase-unreachable`, `github-unreachable` |

A step may now carry `network_error` in place of a status and body.

Both implementations changed to agree on these. Go reads each issuer reply
with `jscompat.DecodeJSON` and checks it field by field. Next.js skips a
malformed identity entry and treats only 200 as an answer. A GitHub id written
`101.0` or `1.01e2` is the number 101 in both.

Rules that need more than a case are tested directly in both: credentials over
8192 characters and repeated headers are refused before any call; missing
configuration is 503 with no call; the public key goes to Supabase only; an
identity reply over 1 MiB is 503; an issuer that never answers is given up on
at the deadline, which is four seconds in both and named in both
(`IDENTITY_DEADLINE_MS`, `githubaccess.DefaultTimeout`).

The Go server is built by `newHandler` in `backend/cmd/api/main.go`, and the
tests call that same function. `wiring_test.go` sends all five routes through
it, signed in and not, with a decoy `GITHUB_TOKEN` in the environment, and
checks the credential on every request that reaches GitHub. Before this, the
isolation test built its own copy of the wiring and would not have noticed the
server handing out its own token.
