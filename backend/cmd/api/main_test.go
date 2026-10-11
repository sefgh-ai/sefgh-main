package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestSecurityHeadersMatchNextConfig fails when next.config.mjs changes a
// security header without the same change here, or the other way round.
func TestSecurityHeadersMatchNextConfig(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "next.config.mjs"))
	if err != nil {
		t.Fatalf("reading next.config.mjs: %v", err)
	}
	config := string(data)
	for name, value := range securityHeaders {
		if !strings.Contains(config, `key: "`+name+`"`) {
			t.Errorf("next.config.mjs has no %s header", name)
		}
		if !strings.Contains(config, `"`+value+`"`) {
			t.Errorf("next.config.mjs has a different value for %s", name)
		}
	}
	if got := strings.Count(config, "key: \""); got != len(securityHeaders) {
		t.Errorf("next.config.mjs defines %d headers, Go defines %d", got, len(securityHeaders))
	}
}

func TestMarkBackend(t *testing.T) {
	h := markBackend(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if got := rec.Header().Get("X-Sefgh-Backend"); got != "go" {
		t.Errorf("X-Sefgh-Backend = %q, want go", got)
	}
	for name, value := range securityHeaders {
		if got := rec.Header().Get(name); got != value {
			t.Errorf("%s = %q, want %q", name, got, value)
		}
	}
}
