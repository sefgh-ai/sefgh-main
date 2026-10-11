//go:build solution

package lesson07

import "net/http"

func isRateLimited(status int, header http.Header) bool {
	if status == http.StatusTooManyRequests {
		return true
	}
	return status == http.StatusForbidden &&
		(header.Get("Retry-After") != "" || header.Get("X-RateLimit-Remaining") == "0")
}

func headerValue(header http.Header, name string) *string {
	values := header.Values(name)
	if len(values) == 0 {
		return nil
	}
	return &values[0]
}

func fetchStatus(client *http.Client, url string) (int, error) {
	resp, err := client.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	return resp.StatusCode, nil
}
