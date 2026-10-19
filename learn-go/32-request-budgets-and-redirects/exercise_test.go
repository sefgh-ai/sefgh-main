package lesson32

import (
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type fakeTransport func(*http.Request) (*http.Response, error)

func (f fakeTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestCopyDoesNotChangeTheOriginal(t *testing.T) {
	transport := &http.Transport{}
	base := &http.Client{Timeout: 2 * time.Second, Transport: transport}
	got := confinedClient(base)
	if got == nil {
		t.Fatal("nil client")
	}
	if got == base || base.CheckRedirect != nil {
		t.Fatal("original client changed or not copied")
	}
	if got.Timeout != base.Timeout || got.Transport != base.Transport {
		t.Fatal("settings lost")
	}
}

func TestRedirectNeverReachesTheSecondDestination(t *testing.T) {
	calls := 0
	base := &http.Client{Transport: fakeTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		status := http.StatusTemporaryRedirect
		if calls > 1 {
			status = 200
		}
		return &http.Response{StatusCode: status, Header: http.Header{"Location": {"http://provider.invalid/capture"}}, Body: io.NopCloser(strings.NewReader("")), Request: r}, nil
	})}
	got := confinedClient(base)
	if got == nil {
		t.Fatal("nil client")
	}
	req, _ := http.NewRequest("POST", "https://provider.invalid/start", strings.NewReader("synthetic conversation"))
	req.Header.Set("Authorization", "Bearer not-a-real-key")
	response, err := got.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if calls != 1 || response.StatusCode != 307 {
		t.Fatalf("requests %d, status %d", calls, response.StatusCode)
	}
}
