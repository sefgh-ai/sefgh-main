# 39: Comparing frozen search runs

Two lists can look alike and still come from different experiments. Before a
Python search worker moves to Go, we need the same model revision, document
preparation, corpus, query, vector column and database function on both sides.

The real code is in
[`backend/internal/searchparity/parity.go`](../../backend/internal/searchparity/parity.go)
and [`backend/cmd/searchparity/main.go`](../../backend/cmd/searchparity/main.go).
It reads local JSON captures; it never calls a model or database. This is a
migration check, not the app's search handler.

## A struct can be compared

`Identity` holds strings and an integer. Go can compare two values of that struct:

```go
if baseline.Identity != candidate.Identity {
    return Report{}, errors.New("retrieval identities differ; freeze the same model, corpus, preprocessing and RPC")
}
```

Every field participates. Changing only the model while keeping 768 dimensions
still refuses the comparison. In JavaScript, comparing two objects with `!==`
checks whether they are the same object; it does not compare their properties.
Go lets you compare structs when all of their fields support comparison.
You cannot use `==` on a struct that contains a slice or map.

The strings describe a claimed experiment. The tool does not prove a capture
really used that model or corpus. The operator must verify the artifacts and
their SHA-256 hashes before treating real captures as evidence.

## A map acts as a set

`quality` builds `map[string]bool` from the baseline's relevant repository IDs:

```go
ids := map[string]bool{}
for _, id := range relevant {
    ids[id] = true
}
```

Reading an absent key gives `false`. The JavaScript comparison is a `Set` and
`set.has(id)`. Other checks use maps to refuse duplicate query IDs and hit IDs;
counting the same repository twice would inflate recall.

For two relevant repositories, finding one gives recall `1 / 2`. If the first
relevant result is second, its reciprocal rank is `1 / 2`. The code uses
`float64` conversions because integer division would give zero:

```go
q.Recall = float64(found) / float64(len(relevant))
```

These quality numbers answer a different question from parity. Two equally bad
lists can match exactly. With no relevance judgments, the report uses `null`
quality fields, rather than inventing a quality score.

## A pointer distinguishes missing from zero

A hit can have a real score of zero. Decoding directly into `float64` would also
turn a missing score into zero. `Hit.UnmarshalJSON` first decodes into `*float64`:
`nil` means missing or JSON `null`; a pointer to `0` is a supplied score. It then
requires a supplied numeric score. The outer reader rejects unknown fields,
duplicate members, trailing JSON and files larger than 8 MiB.

There is another Go detail to watch: `encoding/json` matches struct fields
without requiring the same letter case. Both `model` and `Model` can fill the
same field; the later one wins. Version 1 requires lowercase ASCII keys, so the
token pass rejects case variants before decoding into structs. It also rejects
Unicode letters that Go could fold to an ASCII field name. This prevents a
capture from hiding a different model or repository ID behind a second spelling.
The regression tests try aliases at every level and through the actual CLI.

## The command has three outcomes

`main` is small: `os.Exit(run(...))`. Passing writers to `run` lets a test capture
output without starting another process. It returns:

- `0`: matching top-k IDs and scores within the chosen tolerance.
- `1`: a comparable experiment with a ranking or score difference; JSON report printed.
- `2`: invalid input, different experiments, or an I/O failure.

From `backend/`, try the synthetic example:

```powershell
go run ./cmd/searchparity -baseline ../contracts/semantic-search/example-baseline.json -candidate ../contracts/semantic-search/example-candidate.json -k 3
```

`go run` itself wraps a nonzero program exit; use the built executable when a
script needs the exact exit code. See the
[contract guide](../../contracts/semantic-search/README.md).

## Your exercise

Write `recallAtK(hits, relevant []string, k int) float64` in `exercise.go`.

- Use at most the first `k` hits; nonpositive `k` gives zero.
- Count each relevant ID and each hit only once.
- No relevant IDs means zero for this exercise. The real report represents
  absent judgments as `null`.
- Use floating-point division.

From `learn-go/`:

```powershell
go test ./39-comparing-frozen-search-runs
go test -tags solution ./39-comparing-frozen-search-runs
```

The first command intentionally fails until you finish your exercise. Try it
before reading `solution.go`.
