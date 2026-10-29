package githubtrending

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

// The UI reads this same artifact through /api/github/languages. Exercise
// every offered language and its lowercase spelling used by UI fallbacks.
func TestEveryCatalogLanguageReachesGitHub(t *testing.T) {
	raw, err := os.ReadFile("../githublanguages/catalog.json")
	if err != nil {
		t.Fatal(err)
	}
	var languages []string
	if err := json.Unmarshal(raw, &languages); err != nil {
		t.Fatal(err)
	}
	if len(languages) == 0 {
		t.Fatal("empty catalog")
	}
	for _, name := range languages {
		for _, language := range []string{name, strings.ToLower(name)} {
			t.Run(language, func(t *testing.T) {
				var query string
				h := &Handler{Now: func() time.Time { return time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC) }, Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
					query = r.URL.Query().Get("q")
					return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"items":[]}`))}, nil
				})}}
				rec := httptest.NewRecorder()
				h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending?language="+url.QueryEscape(language), nil))
				value := language
				if strings.Contains(value, " ") {
					value = `"` + value + `"`
				}
				want := "stars:>100 created:>2026-10-29T12:00:00Z language:" + value
				if rec.Code != 200 || query != want {
					t.Fatalf("status %d, query %q; want 200, %q", rec.Code, query, want)
				}
			})
		}
	}
}
