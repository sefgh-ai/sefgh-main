package lesson09

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDescribe(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /repos/{owner}/{repo}", describe)
	for _, tc := range []struct{ path, owner, repo string }{{"/repos/octo/demo", "octo", "demo"}, {"/repos/alice/a%20b", "alice", "a b"}} {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest("GET", tc.path, nil))
		var got map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Errorf("reply must be JSON: %v", err)
			continue
		}
		if got["owner"] != tc.owner || got["repo"] != tc.repo {
			t.Errorf("got %v", got)
		}
		if rec.Header().Get("Content-Type") != "application/json" {
			t.Error("missing JSON content type")
		}
	}
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("POST", "/repos/octo/demo", nil))
	if rec.Code != 405 {
		t.Errorf("POST status %d", rec.Code)
	}
}
