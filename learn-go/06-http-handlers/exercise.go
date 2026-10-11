//go:build !solution

package lesson06

import "net/http"

// ping answers every request with status 200, the header
// Content-Type: application/json, and the body {"status":"ok"}.
func ping(w http.ResponseWriter, r *http.Request) {
	// TODO
}

// greet answers /greet?name=Ada with status 200 and {"message":"Hello, Ada"}.
// Without a name it answers status 400 and {"error":"name is required"}.
// Both replies have Content-Type: application/json.
//
// Build the JSON with encoding/json, not by gluing strings together: a name
// may contain a quote character.
func greet(w http.ResponseWriter, r *http.Request) {
	// TODO: read the name with r.URL.Query().Get("name").
	// Set headers first, then w.WriteHeader(status), then write the body.
}

// withHeader returns a handler that sets one response header and then lets
// next handle the request. Wrapping a handler like this is what "middleware"
// means in Go.
func withHeader(name, value string, next http.Handler) http.Handler {
	// TODO: return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { ... })
	return next
}
