# Lesson 33: Partial answers and shared caches

**You will learn:** how one Go handler runs six searches at once with `sync.WaitGroup.Go`, keeps the ones that worked when others fail, and then tells a CDN how long it may keep the answer. You will also see why an answer cached for everyone must never depend on who asked.

**Real code:** `ServeHTTP` and `search` in `backend/internal/trendingtopics/handler.go`, and `Item` in `backend/internal/githubtrending/handler.go`.

## The problem in the app

The trending page has topic sections: AI, web, mobile and three more. They used to come from a database table that a refresh job was meant to fill. The job could not write the table, so it stayed empty (bug register R-077). The owner chose to drop the table: Go searches GitHub for each topic when asked, and a CDN keeps the answer for a few hours. Nothing writes shared data any more.

That means six GitHub searches for one request. Any of them can fail.

## `WaitGroup.Go`

Lessons 18 and 28 started goroutines with `wg.Add(1)`, `go func()` and `defer wg.Done()`. Since Go 1.25 a `WaitGroup` can do all three for you:

```go
var wg sync.WaitGroup
for i, topic := range Topics {
	wg.Go(func() {
		slots <- struct{}{}
		defer func() { <-slots }()
		repos, err := h.search(ctx, topic, since, current)
		...
		answers[i] = topicAnswer{ID: topic.ID, Complete: err == nil, Repos: repos}
	})
}
wg.Wait()
```

The slots channel (lesson 18) still limits how many run at once, here two, because GitHub limits searches more tightly than its other calls. Each goroutine writes only its own `answers[i]`, so they need no lock. Since Go 1.22, `i` and `topic` are new variables in every turn of the loop, so each goroutine sees its own.

## Keep what worked

`Promise.all` in lesson 28 failed everything when one task failed. Here that would be wrong: five good sections are better than none. So each topic records `Complete: false` and an empty list when its search fails. The answer only fails as a whole when **every** search failed.

## Tell the cache how long

The answer is the same for every visitor, so a CDN may keep it:

| Result | Status | `Cache-Control` |
|---|---|---|
| Every topic found | 200 | `public, max-age=0, s-maxage=21600, stale-while-revalidate=3600` |
| Some topics failed | 200 | `public, max-age=0, s-maxage=300` |
| Every topic failed | 502 | `no-store` |

`max-age` is for the browser, and 0 means "ask again every time". `s-maxage` is for shared caches like a CDN: six hours here. `stale-while-revalidate` lets the CDN serve the old answer for one more hour while it fetches a new one. A partial answer is kept for five minutes only, so a short GitHub outage does not hide a section for six hours. A failure is never kept.

## Never cache who asked

A response with `public` and `s-maxage` is handed to everyone. So this handler never reads the caller's `Authorization` or `X-GitHub-Token`, and never sends them to GitHub. The contract test sends both and fails if either reaches the stand-in GitHub. If the answer ever depended on the caller, one person's data could be served to the next.

## Sharing one mapping

The topic sections must look like the main trending list. Instead of copying the code that turns a GitHub repository into a page item, `githubtrending` now exports it as `Item`: a capital letter makes it visible to other packages (lesson 23). Both lists call the same function.

## Your turn

Open `exercise.go` and write `answer`, which picks the status and the cache header from how many topics were found.

```text
go test ./33-partial-answers-and-shared-caches
go test -tags solution ./33-partial-answers-and-shared-caches
```

## You now know

- `wg.Go(f)` starts `f` in a goroutine and counts it, replacing `Add`, `go` and `Done`.
- A partial answer is often better than none: record what failed, and fail as a whole only when nothing worked.
- `max-age` is for the browser, `s-maxage` for shared caches, and `no-store` keeps an answer out of every cache.
- Never let an answer that a shared cache may keep depend on who asked.
