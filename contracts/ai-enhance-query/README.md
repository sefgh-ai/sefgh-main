# AI enhance-query contract

**Version 2** (AI-002a, 2026-10-13) is current: 76 cases, 12 marked `defect`,
plus an integrity check. Read "Version 2" at the end first. Version 1 recorded
the route as it was, with 62 cases; none of those cases changed. The
caller is `src/components/search/SearchBox.jsx`. No production source changed.

```text
node --test scripts/contracts/ai-enhance-query.test.mjs
npm run test:contracts
```

## What is replaced and what is real

The real handler runs. `scripts/contracts/enhance-fixture.mjs` replaces three
things and restores them afterwards: the two provider keys in the environment,
global `fetch`, and `console.error`. No provider is contacted. Every key in a
fixture is an obvious fake beginning with `fixture-`, and the integrity check
refuses anything else.

Each case gives the request `body` (or `json_error`, a controlled failure of
the request reader), the keys in `env`, and one provider reply in `upstream`:
a `status` with a `body` or `raw_body`, or `network_error`. `expect` pins the
status, the JSON reply, the content type, the absence of a cache header, and
the provider request in full: address, method, headers and body.

## Recorded behaviour

- A query must be a string with something other than white space. Anything
  else is 400 `Query is required`, before any key is looked at.
- With no key, five word lists add fixed words to the query, in a fixed order:
  web application, application, API, dashboard, mobile. A query containing a
  colon or a quotation mark is left alone. The source is `basic-enhancement`.
- With `OPENAI_API_KEY`, OpenAI's chat completions endpoint is called with the
  model `gpt-3.5-turbo`. Otherwise, with `ANTHROPIC_API_KEY`, Anthropic's
  messages endpoint is called with `claude-3-haiku-20240307`. With both,
  OpenAI is used. A key set to nothing counts as no key. Each key goes only to
  its own provider; the integrity check enforces that for every case.
- The provider's text is trimmed and returned with the source `ai-powered`.
- Any failure after validation is 500 `Failed to enhance query`. The
  provider's own error text is not shown to the caller.

## Recorded defects

1. The word lists match inside unrelated words: `happy` gains "application",
   `capital` gains "API", `opposite` gains "web application".
2. A word that is already present is added again: `application application`.
3. Matching uses the trimmed query, but the reply keeps the spaces around it.
4. A provider failure, including a rate limit or a network error, is a 500.
   The basic enhancement, which needs no provider, is not used as a fallback.
5. A provider reply of only white space is returned as a successful, empty
   enhancement.
6. With Anthropic, the query is pasted between quotation marks in the prompt
   without escaping, so a query can carry instructions of its own.

## Not established here

- The route checks neither who is calling nor how often. Every call with a key
  configured spends the owner's provider credit. That is a policy question for
  the owner; see "AI routes: decisions needed before a port" in
  `docs/adr/0002-go-backend.md`.
- The query has no length limit.
- Whether the two model names are still served by their providers was not
  checked. No provider was contacted.
- The handler sets no timeout on the provider call.

A fix to a marked defect changes these fixtures and every implementation in
one commit, with the owner's approval, and raises the version.

## Version 2 (AI-002a, 2026-10-13)

The owner decided on 2026-10-13 that the search-box helpers stay open to
everyone, with limits. The Next.js handler and these fixtures changed
together. No earlier case changed. No Go port exists yet.

- A query longer than 500 characters is 400 `Query is too long`. The type is
  checked first: a query that is not text is still `Query is required`.
- Each address may make 30 AI calls in five minutes, shared with
  suggestions. Past that the basic enhancement answers, with the source
  `basic-enhancement`, and no provider is called. The caller is not refused,
  so the button keeps working.
- The address is the first one in `X-Forwarded-For`, or `unknown` without the
  header. It is only as trustworthy as the proxy in front of the server.
- With no key configured no AI call is made and the allowance is not touched.

This route never returned provider error text, so the three safety fixes did
not apply to it. Its ten `defect` cases are unchanged; none was approved for
fixing.

Fixture conventions added in version 2, shared by the three AI contracts
(`scripts/contracts/ai-fixture-common.mjs`):

- The clock is fixed at 2026-10-13T12:00:00Z, so an allowance and its
  `Retry-After` do not depend on when the test runs.
- `earlier_requests` says how many requests the same caller already made, and
  `earlier_age_seconds` how long before the fixed moment. `earlier_key` names
  another caller when the point is that theirs do not count.
- `address` sets `X-Forwarded-For`.
- Long text is written `{ "$repeat": ["a", 8000] }` in request bodies and in
  expected provider requests. A runner expands it before sending or comparing.
- A "character" is one UTF-16 unit, which is what a JavaScript string length
  counts. An emoji is two. A Go implementation has to count the same way.

The allowance is counted in the server process. Another instance has its own
count and a restart forgets it. It slows a caller down; it is not a balance.

## Go port (AI-002b, 2026-10-14)

`backend/internal/aienhance` passes every case here, once in memory and once
through a local socket, including the cases marked `defect`. It is off unless
`ai-enhance-query` is named in `SEFGH_GO_ROUTES`.

Differences that are deliberate and outside these cases: Go limits a request
body to 1 MiB, a provider reply to 4 MiB and a provider call to 25 seconds,
and logs the stage and status of a failure. They are listed in
`docs/adr/0002-go-backend.md`.

AI-002b added two `defect` cases, recorded from the unchanged Next.js handler:
a JSON body of `null` is answered 500, where every other body without a query
is 400. The handler reads a field of `null` and fails. Go reproduces it.
A third added case pins that 250 emoji, which are 500 characters and 1,000
bytes, are inside the length limit.


BUG-063/R-035, 2026-10-30: contract v3. Enhance-query falls back to its built-in enhancement after provider errors or blank replies, including refused redirects and bounded oversized replies. JSON null is400 Query is required, with no provider call. Query/key isolation, provider read bounds and allowance behavior remain. Unchanged Next.js replies remain in next_expect.


BUG-064/R-036, 2026-10-30: contract v4. Built-in enhancement matches whole Unicode words, adds only words not already present, and trims surrounding whitespace. Operator/quoted queries retain their contents after trimming. Anthropic query text is JSON-escaped inside the prompt. Repeated basic enhancement is idempotent. Unchanged Next.js replies remain in next_expect.
