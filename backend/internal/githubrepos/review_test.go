package githubrepos

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// From REVIEW-006. The server builds a new handler for every verified
// request, which already keeps private replies out of the shared cache. This
// pins the handler's own rule as well, so the protection does not depend on
// how the server happens to be wired.
func TestSummaryWithATokenIsNeverCached(t *testing.T) {
	for _, tt := range []struct {
		name  string
		token string
		want  int
	}{
		{"a caller's token: asked every time", "gh-a", 2},
		{"no token: answered from the cache the second time", "", 1},
	} {
		calls := 0
		client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			calls++
			return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"id":1,"name":"demo","full_name":"octo/demo","owner":{"login":"octo"},"html_url":"https://github.com/octo/demo"}`))}, nil
		})}
		h := New(client, "https://api.github.com", tt.token)
		for i := 0; i < 2; i++ {
			rec := httptest.NewRecorder()
			h.summary(rec, httptest.NewRequest("GET", "/api/github/repo?owner=o&name=r", nil))
			if rec.Code != 200 {
				t.Fatalf("%s: status %d", tt.name, rec.Code)
			}
		}
		if calls != tt.want {
			t.Errorf("%s: %d upstream calls, want %d", tt.name, calls, tt.want)
		}
	}
}
