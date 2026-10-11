# GitHub search contract fixtures

`cases.json` records what `GET /api/github/search` does today, captured from `src/app/api/github/search/route.js` at commit `42759dd`. It is plain data so any implementation, in any language, can be checked against it.

Run it against the current Next.js handler:

```
npm run test:contracts
```

The runner (`scripts/contracts/github-search.test.mjs`) calls the handler directly and replaces `fetch` with a stub. It makes no network request, needs no dev server, and ignores any real `GITHUB_TOKEN`.

## File layout

| Key | Meaning |
|---|---|
| `upstream_url_prefix` | Prepended to every `expect_upstream_url` |
| `upstream_request_headers` | Exact headers sent to GitHub, with and without a server token |
| `upstream_responses` | Named stub replies from GitHub. `raw_body` is a non-JSON body; `network_error` means the request itself fails |
| `responses` | Named replies the browser must receive: status and exact JSON body |
| `cases` | One request each, described below |

Each case has:

- `request`: the raw query string after `?`, already percent-encoded.
- `github_token`: when present, the server token in effect. Absent means no token.
- `upstream`: the stub reply to use, or `null` when GitHub must not be called.
- `expect_upstream_url`: the exact URL suffix sent to GitHub, or `null`.
- `expect`: the named browser reply.
- `disposition`: `preserve` or `defect`.

## What an implementation must match

1. Status code and JSON body, compared structurally. A key absent from the expected body must be absent, and `null` is distinct from a missing key.
2. `content-type: application/json` and no `cache-control` header.
3. Exactly one upstream request with the expected URL and headers, or none.

The upstream URL is compared byte for byte. JavaScript's `encodeURIComponent` leaves `! ' ( ) *` unescaped, which differs from the default of most percent-encoding libraries.

## Dispositions

`preserve` cases are the intended contract.

`defect` cases record behaviour that is probably wrong but is what the UI receives today. A port matches them until the owner decides otherwise. To change one, edit its expectation in the same commit as the fix to the Next.js handler, and note the decision in `docs/adr/0001-rust-backend.md`. Do not let two implementations disagree silently.

The defect cases cover: inherited object keys as `sort`, non-integer and non-finite paging values, a whitespace-only query, language names containing `#` or a space, an upstream body missing its fields, and every upstream error collapsing to a generic 500.

## Not covered

Timeouts, caching, concurrency, and live GitHub behaviour. The current handler sets no timeout and no cache option, so there is nothing to record; a port needs explicit decisions for each.
