# 48. Split a search without losing a boundary

Real code: [`discover/slices.go`](../../backend/internal/discover/slices.go).
This is an offline part of the future ingestion worker. It calls neither
GitHub nor a database, and does not enable the legacy RepoSync command.

GitHub search exposes at most 1,000 results for one search. `Plan` receives an
inclusive date range, star bounds and an observed count. At most 1,000 means
the executor may enumerate pages; it does **not** mean the work is complete.
Larger searches become two smaller searches. Dates split first, then bounded
stars if the date range contains only one day.

For inclusive integer bounds 10 through 15, the children are 10 through 12 and
13 through 15. The second lower bound is `mid + 1`: using `mid` twice creates
an overlap. JavaScript would express the midpoint as
`low + Math.floor((high - low) / 2)`. In Go, integer division discards the
fraction. Here both bounds are nonnegative, so it has that same effect.

The expression `low + (high-low)/2` avoids overflowing by adding two large
positive bounds first. Dates use UTC midnight and Unix seconds rather than a
`time.Duration`, whose nanosecond representation cannot hold thousands of years.

`StarsMax *int64` is a pointer: nil means there is no upper bound. Copying a
struct copies its pointer, not the integer it points to. `clone` makes a fresh
integer for each child so changing a child's bound cannot change the parent.
In JavaScript, this resembles copying an object that contains another object:
a shallow spread still shares that nested object.

`NeedStarBound` means a one-day search needs a verified upper star bound before
splitting. `Blocked` means even one exact date/star pair exceeds the cap. The
worker must report that honestly and wait for a further partition strategy;
it cannot label the topic complete. An incomplete upstream count is an error.

## Exercise

Implement `splitBounds` in the new exercise file. For a valid nonnegative
inclusive range with at least two values, return the left upper bound, right
lower bound and true. Otherwise return zero, zero and false.

From learn-go: `go test ./48-splitting-search-ranges`.
The exercise intentionally starts unfinished. To compare the answer:
`go test -tags solution ./48-splitting-search-ranges`.
Lesson checks are optional under the repository's tutorial policy.
