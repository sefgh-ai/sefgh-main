# AI enhance-query characterization (AI-001b)

Version 1 records what `POST /api/ai/enhance-query` does today, before any
port. There are 62 cases, 10 marked `defect`, plus an integrity check. The
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
