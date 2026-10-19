//go:build !solution

package lesson32

import "net/http"

// TODO: return a copy with CheckRedirect returning http.ErrUseLastResponse.
// Keep the original client's settings unchanged.
func confinedClient(base *http.Client) *http.Client {
	return base
}
