# 49. Choose a provider from the environment

Real code: [`aiprovider/config.go`](../../backend/internal/aiprovider/config.go)
and `aiMux` in [`cmd/api/main.go`](../../backend/cmd/api/main.go)
(AI-PROVIDER-001). The AI routes can use any OpenAI-compatible service, such
as GitHub Models, Gemini, Groq or OpenRouter. Free tiers change, so the
choice is configuration, not code.

## Pass the environment in

`FromEnv(getenv func(string) string)` does not call `os.Getenv` itself.
Production passes `os.Getenv`; tests pass a small function over a map:

```go
got, err := FromEnv(func(name string) string { return c.env[name] })
```

In JavaScript you would often read `process.env` directly and patch it in
tests. Taking the lookup as a parameter keeps each test independent, so tests
can run side by side without touching the real environment.

## A table of presets

Each provider is one `preset` value in a slice: its name, key name, address,
default model and reasoning effort (added later by BUG-071; see
[lesson 50](../50-leaving-a-field-out/README.md)). The order of the slice is
the order of preference. Adding a provider is one more line, not another `if`.

## `break` inside `switch`

In Go, a `switch` case never falls through, so it needs no `break`. But a
`break` does exit the innermost `for`, `switch` or `select`. In the `default`
case, `break` sits inside a `for` loop, so it stops the loop at the first key
found. That is what we want. The same `break` written directly in a case
would end only the `switch`.

## Comparing whole values

`Provider` holds only strings, so two values can be compared with `==`. The
test writes `got != c.want`. In JavaScript, `===` on two objects asks whether
they are the same object, not whether their fields are equal.

## Exercise

Implement `firstWithKey` in `exercise.go`: given provider names in order of
preference and a lookup function, return the first name whose key is not
empty, or `""` when none is.

From learn-go: `go test ./49-choosing-a-provider`.
The exercise intentionally starts unfinished. To compare the answer:
`go test -tags solution ./49-choosing-a-provider`.
Lesson checks are optional under the repository's tutorial policy.
