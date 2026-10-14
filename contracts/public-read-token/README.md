# Public read token contract

**Version 1** (QUOTA-001, 2026-10-14): 20 cases. The rules for the server's token for GitHub reads made for signed-out visitors. Both implementations pass every case:

```text
node --test scripts/contracts/public-read-token.test.mjs     # createPublicReader in src/lib/github/public-token.js
cd backend && go test -count=1 ./internal/publictoken         # publictoken.Transport
```

## Why it exists

Without a token, every signed-out read the server makes shares the 60 requests an hour GitHub allows one address. On 2026-10-13 the owner approved a server token for these reads, on condition that it can read only public data. It is a variable of its own, `GITHUB_PUBLIC_READ_TOKEN`, separate from `GITHUB_TOKEN`. When it is not set, nothing changes.

## The rules

| Rule | Why |
|---|---|
| Before use, `GET {origin}/user` with the token must answer 200 with an `X-OAuth-Scopes` header that is empty | Only a classic personal access token with no scopes answers that way, and GitHub documents such a token as able to read public information only |
| A token whose reply has no `X-OAuth-Scopes` header is refused | Fine-grained and app tokens send none, so what they may read cannot be checked |
| Any scope at all is refused, including `public_repo` and `read:user` | `public_repo` can write; `read:user` reads private profile data. "No scopes" is the simple rule |
| A passed check counts for ten minutes; a refusal or a failed check for one minute | One check per ten minutes in normal use, and at most one a minute while refused |
| A reply to a request sent with the token that shows scopes, or has status 401, is thrown away, and the request is sent again without the token. The token is then refused for one minute | Scopes on a classic token can be edited after it was checked. A reply read with a private-capable token is never served |
| A reply with no scopes header is used | The token was checked less than ten minutes ago |
| Other failures, such as 403 for a rate limit or 404, are passed on as they are | They are GitHub's answer to the request, not a sign the token is unsafe |
| Only GET requests to the GitHub API origin, with no `Authorization` of their own, get the token | A signed-in caller's own token is never replaced, another origin never sees it, and a request with a body is never sent twice |
| The token is never written to a log | It is a credential |

Requests that arrive while a check is in progress wait for that check, so there is one check, not one per request. The check is bounded to 4 seconds, and in Go it is not cut short when the request that started it goes away, because others may be waiting for it.

## Where it applies

Signed-out reads of search, repository summary, repository detail (with its languages and README), contents, trending and trending developers, in Next.js and Go, and the repository page's own read in Next.js (`src/lib/repo/repoData.js`), which still refuses a private repository.

Not contributions. It refuses a signed-out caller with 500 before asking GitHub anything, and allowing it would change its contract. Nothing in the app calls it (bug register R-032).

## Not established here

- Whether GitHub really sends an empty `X-OAuth-Scopes` header for a classic token with no scopes. That is from GitHub's documentation of scopes; no real token was used. If it does not, the check refuses the token and reads go on without one, as before.
- Whether every reply GitHub sends with the token carries the header. A reply without it is used, which relies on the check made within the last ten minutes.
