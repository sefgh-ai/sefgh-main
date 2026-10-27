package starred

import "net/http"

// The repository read itself and its contract test live in
// backend/internal/publicrepo (REPO-PAGE-001).

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }
