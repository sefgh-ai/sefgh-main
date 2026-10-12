//go:build solution

package lesson09

import (
	"encoding/json"
	"net/http"
)

func describe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"owner": r.PathValue("owner"), "repo": r.PathValue("repo")})
}
