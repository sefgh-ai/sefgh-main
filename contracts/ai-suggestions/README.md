# AI suggestions characterization (AI-001a)

Version 1 records `POST /api/ai/suggestions` at 259ff7b with 35 cases,
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
