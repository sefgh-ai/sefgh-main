# Lesson 12: Put static data in the binary

**You will learn:** `//go:embed`, blank imports, and serving immutable JSON.

**Real code:** `backend/internal/githublanguages/handler.go` and `catalog.json`.

The language endpoint returns the same 565 names every time. In JavaScript,
the Next.js route imports an array from another module and serializes it.
In Go, we store the approved JSON in a file and compile it into the program:

```go
import _ "embed"

//go:embed catalog.json
var catalog string
```

The comment is a **compiler directive**, not ordinary documentation. The file
path is relative to this Go package. A missing file makes the build fail.
The blank import `_ "embed"` enables the directive without naming a Go value
from that package. The built executable needs no separate `catalog.json`
beside it and can run from another working directory.

We embed a string rather than a mutable byte slice. The handlers only read it,
so concurrent requests do not need a mutex. The embedded content changes only
when we rebuild; this is suitable for a static list, not live user data.

## Serve the approved representation

The handler sets `Content-Type` before writing. `io.WriteString(w, catalog)`
writes the JSON text as-is. Do not call `json.Marshal(catalog)`: that would
encode the JSON as a quoted string instead of returning the intended array.
Our contract tests compare parsed JSON and also check headers, so either
changing the array or changing its outer shape fails the test.

The production file is independent of the expected contract snapshot. This
matters: testing a file against itself would never catch accidental changes.
The Next.js array and Go artifact must both match the approved snapshot.

## Your turn

`lesson.go` embeds a tiny `sample.json`. Implement `serveCatalog` in
`exercise.go`: set the JSON content type and write the embedded string. Ignore
query parameters as the real route does. No file reads or network are needed.

From `learn-go`:

```text
go test ./12-embedded-data
go test -tags solution ./12-embedded-data
```

The first command fails until you finish your exercise. The second uses the
separate solution. Do not edit the real catalog to complete this lesson.

## You now know

- How Go includes a static file at build time.
- Why an immutable string is convenient for concurrent reads.
- Why serving JSON text differs from encoding that text as a JSON string.
- Why an independent fixture is needed to detect catalog drift.
