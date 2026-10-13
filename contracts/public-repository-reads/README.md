# Public repository page and collection enrichment (AUTH-002)

Version 1 records the public-only boundary for `src/lib/repo/repoData.js`, used
by the repository page and `/api/repo/starred`. This implements the owner's
chosen rule: a visitor cannot borrow the server credential's private access.
These consumers do not yet provide verified private GitHub credentials.

The 15 JSON cases cover public/private/unknown visibility, upstream failures,
redirect status, and invalid identifiers. Four additional executable tests in
`scripts/contracts/public-repository-reads.test.mjs` cover the actual starred
handler with only Supabase and GitHub stubbed: authentication, user-scoped
query and stale snapshot isolation, database failure, bounded concurrency.
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
migration is authorized by these tests. The response contract has no Go port yet.

REVIEW-006 (Claude Code, 2026-10-13) added `error-status-with-public-body`: an
error status is not a public repository even when its body says
`private: false`. The starred test gained a stored name with three parts,
which is not a repository name and gets no metadata. Fourteen deliberate
changes were tried on `repoData.js` and the starred route. Twelve were noticed
before these two additions and all fourteen after.
