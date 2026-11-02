// Package githublanguages serves the existing static language catalog.
package githublanguages

import (
	_ "embed"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

// Keep this artifact aligned with the approved contract snapshot. P7-02
// retired the duplicate Next.js catalog; Go tests still check all fixtures.
// A string is immutable and embedding removes runtime filesystem dependencies.
//
//go:embed catalog.json
var catalog string

// knownNames is built once from the exact catalog served to the selector.
// It remains private and is read-only after initialization.
var knownNames = func() map[string]struct{} {
	var names []string
	if err := json.Unmarshal([]byte(catalog), &names); err != nil {
		panic("invalid embedded language catalog")
	}
	known := make(map[string]struct{}, len(names))
	for _, name := range names {
		known[strings.ToLower(name)] = struct{}{}
	}
	return known
}()

// Contains accepts catalog names case-insensitively, including the lowercase
// values used by the UI's fallback list. It exposes no mutable catalog data.
func Contains(name string) bool {
	_, ok := knownNames[strings.ToLower(name)]
	return ok
}

func Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/github/languages", serve)
}

func serve(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = io.WriteString(w, catalog)
}
