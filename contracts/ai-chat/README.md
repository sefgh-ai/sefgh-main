# AI chat characterization (AI-001c)

Version 1 records what `POST /api/ai/chat` does today, before any port. There
are 42 cases, 16 marked `defect`, plus an integrity check. The caller is
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
