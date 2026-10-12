//go:build solution

package lesson12

import (
	"io"
	"net/http"
)

func serveCatalog(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = io.WriteString(w, sample)
}
