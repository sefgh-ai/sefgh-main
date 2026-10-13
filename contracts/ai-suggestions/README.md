# AI suggestions contract

**Version 2** (AI-002a, 2026-10-13) is current: 44 cases, 7 marked `defect`,
plus an integrity check. Read "Version 2" at the end first.

Version 1 recorded `POST /api/ai/suggestions` at 259ff7b with 35 cases,
eight marked defect, plus an integrity check. The actual Next handler runs;
only `generateAIResponse` is replaced with a controlled reply or exception.
No provider SDK is imported by the fixture runner, and no paid request occurs.

```text
node --test scripts/contracts/ai-suggestions.test.mjs
```

Coverage: absent/empty/short/invalid query values; case-insensitive predefined
matching; UTF-16 string-length boundaries; AI trigger conditions; complete
outgoing prompt/messages; JSON/Markdown replies; provider and parse failures;
AI/predefined ordering; truncation and duplicate handling. A controlled request
JSON-reader failure pins error propagation without depending on engine-specific
JSON syntax-error text. It is not a test of the platform's body parser.

Every fixture pins status, response fields including `source`, content/cache
headers and exact AI calls. `upstream` transport/model/token settings belong to
the later provider contract; they are not established by this dependency stub.

Observed defects:

- Invalid query types produce internal method errors rather than validation.
- Request JSON error messages are exposed verbatim in a 500 response.
- Original untrimmed length can trigger AI for an otherwise short query.
- AI arrays accept nulls, numbers and objects rather than only strings.
- Duplicate AI suggestions remain duplicated.
- An AI suggestion discarded by the three-item cap can still suppress a
  predefined suggestion because deduplication examines the full AI array.

The source route has no local authorization or quota check. This task does not
approve that guest policy, fix these defects, change prompts, move the route to
Go, or connect a provider. Before an AI port/cutover, define auth/guest access,
quotas, key ownership, resource bounds and provider behavior. A contract revision
must change every implementation when an approved defect fix is made.

## REVIEW-005 additions (Claude Code, 2026-10-13)

`array-body`, `text-body` and `number-body`: a JSON body that is not an object
has no `query`, so it is answered like an empty one, with no AI call.

Not pinned: a body of JSON `null` answers 500, and the message is the
JavaScript engine's own sentence about destructuring `null`. That wording
changes between Node versions, so a fixture for it would fail on a different
machine for no reason. It belongs with the defect "request errors are exposed
verbatim": a port should answer it with a fixed message once the owner
approves that fix.

## Version 2 (AI-002a, 2026-10-13)

The owner decided on 2026-10-13 that the search-box helpers stay open to
everyone, with limits, and approved the fix for error text. The Next.js
handler and these fixtures changed together. No Go port exists yet.

- Any failure is 500 `Failed to generate suggestions`. The cause goes to the
  server log. Four cases changed for this: the three wrong-type queries and
  the request-reader failure. The wrong-type queries are still `defect`,
  because a caller's mistake should not be a 500; that was not among the
  approved fixes.
- A JSON body of `null` is answered like an empty one. Version 1 could not
  pin that case, because the message was the JavaScript engine's own.
- A query longer than 500 characters is 400 `Query is too long`.
- Each address may make 30 AI calls in five minutes, shared with
  enhance-query. Past that the built-in list answers, with the source
  `predefined-fallback`, and the AI is not called. A query the built-in list
  answers by itself makes no AI call and does not use the allowance.

The other recorded defects are unchanged: the padded short query, values
that are not text among the AI's suggestions, and the two duplicate cases.

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
