# AI chat contract

**Version 2** (AI-002a, 2026-10-13) is current: 78 cases, 3 marked `defect`,
plus an integrity check and four tests of the Next.js-only cookie session.
Read "Version 2" at the end first. The sections in between describe version 1,
which recorded the route as it was, with 42 cases, 16 marked `defect`. The caller is
`src/hooks/chat/useChatMessages.js`. No production source changed.

```text
node --test scripts/contracts/ai-chat.test.mjs
npm run test:contracts
```

## What is replaced and what is real

The real handler and the real helper `src/lib/ai/github.js` both run, so these
fixtures also record the provider request the helper builds. That is the part
AI-001a left out: it replaced the helper itself.

`scripts/contracts/chat-fixture.mjs` replaces global `fetch` and
`console.error`, and restores them. The helper copies `GITHUB_TOKEN` when it is
first imported, so the runner sets a fake, `fixture-models-token`, before
importing the route. No provider is contacted and no real token is read.

Each case gives the request `body` (or `json_error`, a controlled failure of
the request reader) and one provider reply in `upstream`. `expect` pins the
status, the JSON reply, the content type, the absence of a cache header, and
the provider request in full: address, method, headers and body, including the
whole system prompt.

## Recorded behaviour

- `messages` must be an array. Anything else is 400 `Messages array is
  required`.
- A chat request sends the messages to
  `https://models.inference.ai.azure.com/chat/completions` with the model
  `gpt-4o`, temperature 0.7 and at most 1000 tokens. The application's system
  prompt is put first unless the caller's messages already contain a system
  message. The reply is `{ "response": <first choice's content> }`. Model,
  temperature and length sent by the caller are ignored.
- `action: "generate_title"` with at least one message asks for a title for
  the first user message: temperature 0.5, at most 20 tokens. Quotation marks
  are removed and the result trimmed. With no user message the answer is 400
  `No user message found`, and the provider is not called.
- If the provider fails during a title request, the title is the first four
  words of the message, cut to 30 characters with three dots when longer.
- If the provider fails during a chat request, the answer is 500.

## Recorded defects

1. Nothing checks who is calling. Any caller's messages are sent to the
   provider with the server's own credential.
2. A caller who includes a system message replaces the application's
   instructions.
3. The messages are not checked: an empty list still calls the provider, and
   numbers, strings and extra fields are forwarded as they are.
4. On failure the internal or provider error text is returned to the caller,
   including the provider's reply body.
5. The provider's content is returned whatever its type.
6. A title request with no messages is answered as a chat request.
7. In a title request the message is pasted between quotation marks in the
   prompt without escaping. A user message with no content asks for a title
   for the word `undefined`.
8. The fallback title counts repeated spaces as words. For a message that is
   not text it fails, and that internal error is returned.

## Seen but not pinned

Three failures answer 500 with a sentence written by the JavaScript engine,
which changes between Node versions, so a fixture would break on another
machine for no reason: a `null` among the messages, a provider reply that is
not JSON, and a provider reply with no `choices`. They belong with defect 4.

## Not established here

- No limit on calls, on the number of messages or on their size.
- The same `GITHUB_TOKEN` variable pays for these calls and is read by other
  server code for the GitHub API.
- Whether the provider address and the model are still served was not checked.
  No provider was contacted.
- The helper sets no timeout. `streamAIResponse` exists and only throws, so
  nothing streams today.

These are policy questions for the owner before a port; see "AI routes:
decisions needed before a port" in `docs/adr/0002-go-backend.md`. A fix to a
marked defect changes these fixtures and every implementation in one commit,
with the owner's approval, and raises the version.

## Version 2 (AI-002a, 2026-10-13)

The owner decided on 2026-10-13 that chat is for signed-in users only, with
limits, and approved fixing three recorded defects. The Next.js handler and
these fixtures changed together. No Go port exists yet; it must pass these
cases unchanged.

| Rule | Answer when broken |
|---|---|
| The caller sends `Authorization: Bearer <Supabase access token>`. Supabase Auth is asked who it belongs to; the token is never decoded locally. An anonymous Supabase account does not count | 401 `Sign in to use chat` |
| Supabase cannot be asked | 503 `Sign-in could not be verified` |
| 30 requests per user in five minutes, title requests included | 429 `Too many requests, please try again shortly`, with `Retry-After` in seconds |
| `messages` is a non-empty list | 400 `Messages array is required` |
| Each message is an object whose role is `user` or `assistant` and whose content is text | 400 `Invalid messages` |
| The newest message is at most 8,000 characters | 400 `Message is too long` |

Order: sign-in, then the allowance, then the body. A refused request never
reaches the provider, and a request refused for its allowance is not counted.

What is forwarded: only `role` and `content` of each message; the most recent
20 messages; then, if those hold more than 8,000 characters, the oldest are
dropped until they fit. Older messages are dropped, not refused, because the
browser sends the whole conversation every time and a refusal would break
every long chat. The application's system prompt always comes first, since a
caller can no longer send a system message.

Any failure after those checks is 500 `Failed to generate AI response`. The
cause goes to the server log and is never in the reply.

Defects fixed, each with the owner's approval: 1 (no sign-in), 2 (system
message replaced), 3 (messages unchecked), 4 (error text returned), 6 (empty
title request answered as chat), and the type failures in 7 and 8. Thirteen
version 1 cases changed and one was removed; seven were renamed to say what
now happens. The three sentences under "Seen but not pinned" no longer
occur: a `null` message is 400, and the other two are the fixed 500.

Still `defect`: the provider's content is returned whatever its type; a
message is pasted into the title prompt between unescaped quotation marks;
the fallback title counts repeated spaces as words.

Next.js also accepts its own session cookie when no bearer is sent, which is
how the browser calls it today. Go cannot read that cookie and will accept
the bearer only, so the shared cases use the bearer and the cookie path has
its own tests in `scripts/contracts/ai-chat.test.mjs`. Before chat is served
by Go, the browser has to send the bearer.

A fixture names its caller with `session` (`a`, `b`, `anonymous-account`,
`no-id`, `outage`, or any other word for a session Supabase refuses) or gives
the header as written in `authorization`. `expect.identity_calls` counts the
questions put to Supabase; `expect.calls` holds provider requests only.

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
