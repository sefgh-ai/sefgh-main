# 50. Leave a field out of the JSON you send

Real code: `ReasoningEffort` and the presets in
[`aiprovider/config.go`](../../backend/internal/aiprovider/config.go), the
`request` struct in [`aiprovider/provider.go`](../../backend/internal/aiprovider/provider.go),
and `withOpenAI` in [`aienhance/handler.go`](../../backend/internal/aienhance/handler.go)
(BUG-071, R-214).

## The bug

Some models think before they answer. That hidden thinking is counted in
`max_tokens`, the same budget as the answer. Enhance-query allows 100 tokens.
NVIDIA's Nemotron on OpenRouter spent all 100 thinking, stopped with
`finish_reason: "length"`, and sent `content: null`. The route then fell back
to its word lists every time.

The fix asks for no thinking: the OpenAI-standard field
`"reasoning_effort": "none"`. The OpenRouter preset sends it by default.
`SEFGH_AI_REASONING_EFFORT` can change it for any provider.

## `omitempty`: a field that is only sometimes there

GitHub Models' `gpt-4o` does not reason, and the chat contract records its
request byte for byte. So the field must be absent, not empty, when no
effort is set:

```go
Reasoning string `json:"reasoning_effort,omitempty"`
```

The text in backquotes is a *struct tag*. `encoding/json` reads it: the name
to write, and `omitempty`, which means "leave this field out when it holds its
zero value". For a string the zero value is `""`.

In JavaScript, `JSON.stringify({a: undefined})` gives `{}`, but `{a: ""}`
gives `{"a":""}`. Go strings cannot be `undefined`, so `omitempty` does that
job.

Enhance-query builds its body as a `map[string]any` instead of a struct. There
the same rule is an `if` that adds the key only when it has a value.

## A method on a small type

```go
func (p preset) provider(getenv func(string) string) Provider {
	return Provider{p.name, p.endpoint, getenv(p.keyName), p.model, p.reasoning}
}
```

`(p preset)` before the name makes this a method of `preset`. `FromEnv` built
a `Provider` from a preset in three places; adding a field would have meant
changing all three. Now it is one line. The positional form
`Provider{a, b, c, d, e}` must list every field, so the compiler reports any
place that was missed.

## `switch` with a statement first

```go
switch effort := strings.ToLower(strings.TrimSpace(setting)); effort {
case "":
	return preset, nil
case "none", "minimal", "low", "medium", "high", "xhigh":
	return effort, nil
}
```

A `switch` can start with a short statement, as `if` can. `effort` exists only
inside the `switch`. One `case` can list several values; JavaScript would
need several `case` lines that fall through to the same code.

## Exercise

Implement `reasoningEffort` in `exercise.go`. Given the setting someone typed
and the preset's own choice, return:

- the preset's choice when the setting is empty or only spaces;
- `""` (send no field) for `default`;
- the lower-case value for `none`, `minimal`, `low`, `medium`, `high` or `xhigh`,
  ignoring spaces around it and letter case;
- an error for anything else.

This is the rule that decides what the AI routes send, so it is worth getting
exactly right. Five to ten lines is enough.

From learn-go: `go test ./50-leaving-a-field-out`.
The exercise intentionally starts unfinished. To compare the answer:
`go test -tags solution ./50-leaving-a-field-out`.
Lesson checks are optional under the repository's tutorial policy.
