//go:build solution

package lesson32

import "net/http"

func confinedClient(base *http.Client) *http.Client {
	copy := *base
	copy.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	return &copy
}
