// Package githublanguages serves the existing static language catalog.
package githublanguages

import (
	_ "embed"
	"io"
	"net/http"
)

// Keep this artifact aligned with the approved contract snapshot and the
// Next.js catalog. Both implementations are checked against the same fixtures.
// A string is immutable and embedding removes runtime filesystem dependencies.
//
//go:embed catalog.json
var catalog string

func Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/github/languages", serve)
}

func serve(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = io.WriteString(w, catalog)
}
