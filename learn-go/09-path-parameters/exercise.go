//go:build !solution

package lesson09

import "net/http"

// describe returns {"owner": "...", "repo": "..."} as application/json.
func describe(w http.ResponseWriter, r *http.Request) {
	// TODO: Read the two path values and encode a JSON reply.
}
