//go:build !solution

package lesson07

import "net/http"

// isRateLimited reports whether a reply from GitHub means "you are sending
// too many requests":
//
//   - status 429, always
//   - status 403 when the Retry-After header is not empty,
//     or when X-RateLimit-Remaining is exactly "0"
//
// Anything else is not a rate limit.
func isRateLimited(status int, header http.Header) bool {
	// TODO: read a header with header.Get("Retry-After").
	return false
}

// headerValue returns a pointer to the first value of a header, or nil when
// the header is absent. An empty header is still present: it returns a
// pointer to "".
func headerValue(header http.Header, name string) *string {
	// TODO: header.Values(name) returns a slice of all values for the name.
	return nil
}

// fetchStatus sends a GET request to url using client and returns the status
// code of the reply. It returns an error when the request itself fails.
func fetchStatus(client *http.Client, url string) (int, error) {
	// TODO: resp, err := client.Get(url)
	// Check err first. Then: defer resp.Body.Close()
	return 0, nil
}
