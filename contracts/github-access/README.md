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
over real localhost sockets. Both check all five routes reject incomplete auth.

Route contracts now use `github_token` for a verified **per-user** credential:
search v3, repository routes v4, contributions v2. Node's `access-fixture.mjs`
supplies the matching fake issuer responses; Go's domain tests inject the
verified token directly. Boundary tests separately verify that runtime wiring
cannot bypass authorization. Authenticated responses add the no-store header.
Anonymous contributions retain the existing missing-token 500 because GraphQL
requires a credential; there is no current UI consumer of that route.

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
