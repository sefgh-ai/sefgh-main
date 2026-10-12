//go:build solution

package lesson06

import (
	"encoding/json"
	"io"
	"net/http"
)

func ping(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"status":"ok"}`) // the status is 200 unless you say otherwise
}

func greet(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Hello, " + name})
}

// writeJSON is a small helper, like the one in the real handler.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func withHeader(name, value string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(name, value)
		next.ServeHTTP(w, r)
	})
}
