//go:build solution

package lesson21

import "net/http"

func (t *agentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	t.sent++
	if req.Header.Get("User-Agent") != "" {
		return t.Base.RoundTrip(req)
	}
	withAgent := req.Clone(req.Context())
	withAgent.Header.Set("User-Agent", t.Agent)
	return t.Base.RoundTrip(withAgent)
}
