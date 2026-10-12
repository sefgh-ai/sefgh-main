# Lesson 10: Sharing a cache safely

**You will learn:** mutexes, time comparisons, and why network calls stay
outside a lock.

**Real code:** `repoCache.get` and `repoCache.fill` in
`backend/internal/githubrepos/cache.go`.

The repository summary route asks Next.js to cache GitHub replies for an
hour. The Go version keeps its own cache. A new process starts empty; this
cache does not share Next.js's persistent storage or other Go processes.

## More than one request can run at once

A Node handler often waits with `await`. A Go server runs handlers in
separate goroutines. Two handlers can reach the same map at the same time.
Ordinary Go maps are not safe for concurrent writes or for reading while
another goroutine writes.

`sync.Mutex` lets one goroutine use the shared map at a time:

```go
c.mu.Lock()
entry, found := c.entries[key]
c.mu.Unlock()
```

Every access to the shared state must follow the same locking rule. A
mutex is not attached to the map automatically. Do not copy a cache after
using its mutex; pass a pointer to it.

## Fresh, stale, or absent

Our production cache has three paths:

| State | What happens |
|---|---|
| Missing | Fetch GitHub, then store a status-200 reply |
| Younger than one hour | Return the stored reply |
| At least one hour old | Return the old reply and start a background refresh |

If refresh fails, keep the old reply. That is **stale-while-revalidate**.
The cache combines concurrent misses for the same key using a channel:
the first request fetches, and other requests wait for its completion.
Closing the channel wakes all waiting requests. A waiting caller can
cancel without blocking everyone else.

Look at `get`: it releases the mutex **before** fetching or waiting. Holding
the lock during a slow GitHub request would block unrelated repositories.
`fill` takes the lock again only to publish the result.

The production cache limits both the entry count and stored key/header/body
bytes. When full, it evicts the oldest stored entry. Those are resource
limits, not proof of production cache parity; persistence and multiple
instances must be considered before cutover.

## Your turn: classify an entry

The exercise is smaller than the production cache. `lesson.go` supplies a
map and a mutex. Implement `state(key, now)`:

- Return `"miss"` if the key is absent.
- Return `"fresh"` if less than one hour has passed.
- Return `"stale"` otherwise, including exactly one hour.

Lock before reading the map. Use `defer c.mu.Unlock()` after locking so
every return releases it. `now.Sub(saved)` returns a `time.Duration`.
Tests pass time explicitly; they never wait an hour.

```text
go test ./10-shared-cache
go test -tags solution ./10-shared-cache
```

Do not change the real cache to complete this exercise. Your function only
classifies entries; fetching, refresh channels and eviction stay in the
backend code for you to read next.
