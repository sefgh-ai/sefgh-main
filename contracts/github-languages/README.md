# GitHub language catalog contract

Version 1, characterized from the Next.js route at `cd8906c` before writing
the Go implementation. Consumer: `src/app/trending/page.js` expects an array.

`cases.json` holds three GET cases. Each references `response.json`, the exact
ordered snapshot of all 565 strings from `src/data/github-languages.js`.
The body is an array, not an object containing `languages`. Names, order,
punctuation and duplicates (if any) are preserved without sorting or filtering.
Query parameters are ignored. The route requires no authentication or token
and makes no upstream request. All cases are `preserve`; no defect was found
in the characterized successful behavior.

The response is 200 with `Content-Type: application/json`, and no explicit
`Cache-Control` or `Retry-After`. Runtime error injection into serialization,
non-GET framework behavior and deployment caching are outside these fixtures.
Go's existing GET registration also supports HEAD; other methods use its 405.

Run `npm run test:contracts` for Next.js. Inside `backend/`, run
`go test -count=1 ./...` for Go, which checks every case in memory and over
local HTTP sockets. Tests require neither secrets nor live GitHub.

The Go production artifact is `backend/internal/githublanguages/catalog.json`,
embedded as an immutable string with `//go:embed`. It is deliberately separate
from the fixture expectation. Node tests catch drift in the original JS array;
Go tests catch drift in the embedded catalog. Do not generate test expectations
at test time from either implementation. A catalog update is a contract change:
obtain owner approval and update both implementations and the snapshot together.

The opt-in route name is `github-languages`. It remains disabled by default.
No existing route's review or cutover gate is waived by adding this route.
