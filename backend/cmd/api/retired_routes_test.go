package main

import (
	"net/http/httptest"
	"testing"
)

// P7-01 retires the endpoint itself, including for a verified caller.
func TestContributionsIsRetired(t *testing.T) {
	upstream := &upstreamLog{}
	handler := serverUnderTest(t, upstream)
	for _, path := range []string{"/api/github/contributions", "/api/github/contributions?username=octocat", "/api/github/contributions?username=-bad-"} {
		for _, signedIn := range []bool{false, true} {
			req := httptest.NewRequest("GET", path, nil)
			if signedIn {
				req.Header.Set("Authorization", "Bearer session-a")
				req.Header.Set("X-GitHub-Token", "gh-a")
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != 404 {
				t.Errorf("%s signedIn=%v: status %d, want 404", path, signedIn, rec.Code)
			}
			if seen := upstream.take(); len(seen) != 0 {
				t.Errorf("retired endpoint reached GitHub resources: %q", seen)
			}
		}
	}
}
