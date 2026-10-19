// Package lesson33 chooses a status and a cache header from how many of a
// request's searches worked, as ServeHTTP does in
// backend/internal/trendingtopics/handler.go.
package lesson33

// The three cache headers the trending topics use.
const (
	cacheComplete = "public, max-age=0, s-maxage=21600, stale-while-revalidate=3600"
	cachePartial  = "public, max-age=0, s-maxage=300"
	noStore       = "no-store"
)
