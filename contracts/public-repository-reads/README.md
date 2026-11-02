# Public repository page and collection enrichment (AUTH-002)

P7-02 (2026-11-02): the Next.js public GitHub handlers and the repository
page's direct GitHub fallback are retired. This contract keeps all
15 cases and its existing Go behavior/version. All `next_*` rollback
expectations have been removed; historical notes below describing those
fields or the old Node handler runner refer to the pre-retirement snapshot
at parent `f86a160`. The remaining Node suite executes the retained public
GitHub helper and the
repository page's mandatory Go adapter against stand-ins, plus the failure-response
and page-source guards; it is not fixture-integrity-only. Go's full suite still
executes every case. Rollback requires reverting
P7-02 and redeploying both projects, not changing a route switch.


Version 1 records the public-only boundary for `src/lib/repo/repoData.js`, used
by the repository page and `/api/repo/starred`. This implements the owner's
chosen rule: a visitor cannot borrow the server credential's private access.
These original consumers did not provide verified private GitHub credentials.
The starred implementation is now Go; earlier implementation notes below are historical.

The 15 JSON cases cover public/private/unknown visibility, upstream failures,
redirect status, and invalid identifiers. The old executable Next starred-handler
tests were removed in P7-04. Current
`scripts/contracts/public-repository-reads.test.mjs` exercises the retained helper
and page adapter, not a deleted starred handler. The helper currently has test
callers only; the page uses Go with no direct GitHub fallback.
Run `node --test scripts/contracts/public-repository-reads.test.mjs`.

Changes from the earlier implementation:

- Never send `GITHUB_TOKEN`; no fallback to another credential.
- Apply the existing repository identifier rules before any upstream request.
- Fetch with `cache: no-store`, reject redirects, and use a 10-second timeout.
- Require explicit `private: false` from a successful GitHub response.
- Repository pages receive null when public metadata cannot be verified.
- Starred requests still require Supabase authentication and select only the
  user's collection rows. Recheck every row rather than trusting `repo_data`.
  Keep collection fields and notes; replace unavailable metadata with null
  without writing anything to the database. The current UI tolerates null.
- Refresh at most four repositories concurrently; preserve collection order.
- Successful starred responses use `Cache-Control: private, no-store`.

This intentionally increases GitHub reads for populated collections and uses
anonymous GitHub quota. Capacity and deployed behavior must be measured before
release. This does not solve public summary cache retention in the separate Go
handler, remove historical database snapshots, audit all token consumers, or
enable private UI. Renamed repositories require a canonical name because
redirects are refused. Supabase RLS definitions remain unverified; no database
migration is authorized by these tests. STAR-001 (2026-10-15) added a Go port of the starred
route, `backend/internal/starred`. Its GitHub read, `publicRepo`, passes these 15 cases
(`TestPublicRepositoryReads`). The route itself is pinned by `contracts/repo-starred`.

REPO-PAGE-001 (2026-10-27) moved that read to `backend/internal/publicrepo` as `Read`,
which the starred port now calls, and serves it as `GET /api/github/public-repo/{owner}/{repo}`
for the repository page: 200 with the repository where these cases expect one, otherwise no
200 (404 `null` when GitHub was asked). `TestRouteAnswersTheContract` runs the 15 cases
through the route. After P7-02, `fetchRepoForPage` always calls Go when its
origin is set and returns null when it is absent. Node checks this adapter
against a stand-in; the direct helper is retained only for starred until
P7-04. The cases are unchanged; version1.

REVIEW-006 (Claude Code, 2026-10-13) added `error-status-with-public-body`: an
error status is not a public repository even when its body says
`private: false`. The starred test gained a stored name with three parts,
which is not a repository name and gets no metadata. Fourteen deliberate
changes were tried on `repoData.js` and the starred route. Twelve were noticed
before these two additions and all fourteen after.
