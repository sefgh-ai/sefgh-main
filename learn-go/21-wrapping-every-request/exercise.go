//go:build !solution

package lesson21

import "net/http"

// RoundTrip passes req on to t.Base, adding User-Agent: t.Agent when req has
// no User-Agent of its own. It must not change req itself.
//
// TODO:
//  1. If req.Header.Get("User-Agent") is not empty, count the request in
//     t.sent and return t.Base.RoundTrip(req).
//  2. Otherwise make a copy with req.Clone(req.Context()), set the header on
//     the copy, count the request, and return t.Base.RoundTrip(copy).
func (t *agentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return nil, errNotWritten
}
