// Package lesson21 wraps an http.RoundTripper. agentTransport is a small
// cousin of publictoken.Transport in backend/internal/publictoken: it adds a
// header to requests that do not have one, without changing the caller's
// request.
package lesson21

import (
	"errors"
	"net/http"
)

// agentTransport adds User-Agent: Agent to every request that has none, and
// passes every request on to Base.
type agentTransport struct {
	Base  http.RoundTripper
	Agent string
	sent  int // requests passed on, either way
}

var errNotWritten = errors.New("RoundTrip is not written yet")
