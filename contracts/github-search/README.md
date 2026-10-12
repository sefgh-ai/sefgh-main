# GitHub search contract fixtures

`cases.json` is the contract for `GET /api/github/search`: what a caller sends and what it must get back. It is plain data, so every implementation is checked against the same file.

| Implementation | Check it with |
|---|---|
| Next.js handler, `src/app/api/github/search/route.js` | `npm run test:contracts` |
| Go handler, `backend/internal/githubsearch` | `go test ./...` inside `backend/` |

The Next.js runner (`scripts/contracts/github-search.test.mjs`) calls the handler directly and replaces `fetch` with a stub. It makes no network request, needs no dev server, and ignores any real `GITHUB_TOKEN`. The Go test (`contract_test.go`) runs each case twice: in memory, and over real sockets against a fake GitHub.

## File layout

| Key | Meaning |
|---|---|
| `contract_version` | Raised whenever an expectation changes. See [Versions](#versions) |
| `upstream_url_prefix` | Prepended to every `expect_upstream_url` |
| `upstream_request_headers` | Exact headers sent to GitHub, with and without a server token |
| `upstream_responses` | Named stub replies from GitHub. `raw_body` is a body sent as-is; `network_error` means the request itself fails |
| `responses` | Named replies the caller must receive: status, exact JSON body, and optionally `headers` |
| `cases` | One request each, described below |

Each case has:

- `request`: the raw query string after `?`, exactly as it arrives on the wire.
- `github_token`: when present, the server token in effect. Absent means no token.
- `upstream`: the stub reply to use, or `null` when GitHub must not be called.
- `expect_upstream_url`: the exact URL suffix sent to GitHub, or `null`.
- `expect`: the named reply the caller gets.
- `disposition`: `preserve` or `defect`.

## What an implementation must match

1. Status code and JSON body, compared structurally. A key absent from the expected body must be absent, and `null` is distinct from a missing key.
2. Response headers: `content-type: application/json`, no `cache-control`, and no `retry-after` unless the expected reply lists one under `headers`.
3. Exactly one upstream request with the expected URL and headers, or none.

The upstream URL is compared byte for byte. JavaScript's `encodeURIComponent` leaves `! ' ( ) *` unescaped, which differs from the default of most percent-encoding libraries.

## The rules the cases encode

**Reading the request.** The query string is parsed the way browsers parse it (the URL Standard's `application/x-www-form-urlencoded` rules): `+` is a space, a `%` that does not start a valid escape is a literal character, `;` is not a separator, and the first value wins when a name repeats.

| Parameter | Rule |
|---|---|
| `q` | Required. Missing when absent, empty, or made only of Unicode `White_Space` characters. Otherwise sent upstream untrimmed |
| `sort` | `all`, `latest`, `monthly`, `yearly` or `featured`. Anything else, including an empty value, means `all` |
| `language` | Optional, at most 50 characters: words of `A-Z a-z 0-9 . _ + # -` separated by single spaces. Quoted upstream only when it contains a space |
| `stars` | Optional: `*`, `N`, `N..M`, `>N`, `>=N`, `<N` or `<=N` |
| `page` | Whole number, optional minus sign then digits. Clamped to 1..1000. Missing or empty means 1 |
| `per_page` | Same form. Clamped to 1..100. Missing or empty means 30 |

A missing `q` is reported before any other invalid parameter.

**Replying.**

| GitHub answers | Caller gets |
|---|---|
| 200 with a numeric `total_count` and an `items` array | 200 `{total_count, items, rate_limit}`. `rate_limit` values are header strings or `null` |
| 429, or 403 with `x-ratelimit-remaining: 0` or a non-empty `Retry-After` | 429 with the error text and `rate_limit`. `Retry-After` is forwarded unchanged when GitHub sent it |
| 422 | 400 `GitHub could not process this search` |
| Anything else: another status, a network failure, a body that is not JSON, or a 200 without the two fields | 500 `Failed to search repositories` |

The error text reaches end users: the search page shows it in a toast.

## Dispositions

`preserve` cases are the intended contract.

`defect` cases record behaviour that is probably wrong and is waiting for an owner decision. Every implementation matches them until then. To change one, edit its expectation in the same commit as the fix to **every** implementation, raise `contract_version`, and note the decision in `docs/adr/0002-go-backend.md`. Two implementations must never disagree silently.

Open `defect` cases: the search navbar sends `sort=stars` and `sort=updated`, names the API does not know, so "Most Stars" and "Recently Updated" have no effect.

## Versions

| Version | What changed |
|---|---|
| 1 | Behaviour of the Next.js handler at commit `42759dd`, including 13 `defect` cases |
| 2 | Owner decision, 2026-10-11: all 13 fixed. Inherited object keys are unknown sort names; `page` and `per_page` must be whole numbers and `page` is capped at 1000; a whitespace-only query is missing; `#` and single spaces are allowed in `language`; a 200 without `total_count` and `items` is a failure; rate limits answer 429 and a rejected search answers 400. Cases were also added for query-string parsing, and for the two navbar sort names above |

## Not covered

Timeouts, caching, concurrency, methods other than GET, request bytes that are not valid UTF-8 once decoded, and live GitHub behaviour. A 403 from a secondary rate limit that carries neither `Retry-After` nor a zero remaining count is still reported as a generic failure.
