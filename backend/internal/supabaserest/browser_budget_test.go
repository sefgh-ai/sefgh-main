package supabaserest_test

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/onboarding"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/searchhistory"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

type budgetTransport func(*http.Request) (*http.Response, error)

func (f budgetTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// With no caller deadline, the verifier must already see the whole-route
// budget. With an earlier caller deadline, the database must inherit it
// rather than starting a fresh per-call budget after verification.
func TestBrowserBudgetStartsBeforeIdentityAndReachesDatabase(t *testing.T) {
	for _, earlier := range []bool{false, true} {
		for _, area := range []string{"history", "onboarding"} {
			t.Run(area+map[bool]string{false: "/default", true: "/earlier"}[earlier], func(t *testing.T) {
				var identityDeadline time.Time
				var identityContext context.Context
				calls := 0
				user := func(r *http.Request) (string, string, int) {
					identityContext = r.Context()
					var ok bool
					identityDeadline, ok = identityContext.Deadline()
					if !ok || time.Until(identityDeadline) > supabaserest.RequestBudget {
						t.Error("identity has no whole-request budget")
					}
					return "user-a", "session-a", 200
				}
				client := &http.Client{Transport: budgetTransport(func(r *http.Request) (*http.Response, error) {
					calls++
					d, ok := r.Context().Deadline()
					if !ok || d.After(identityDeadline) {
						t.Error("database extended or lost the identity's deadline")
					}
					if r.Header.Get("Authorization") != "Bearer session-a" {
						t.Error("caller credential changed")
					}
					return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"id":"row"}`)), Request: r}, nil
				})}
				mux := http.NewServeMux()
				logger := slog.New(slog.NewTextHandler(io.Discard, nil))
				method, path, body := "POST", "/api/search-history", `{"user":"user-a","query":"go"}`
				if area == "history" {
					h := &searchhistory.Handler{User: user, Database: client, SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: logger}
					h.Register(mux)
				} else {
					h := &onboarding.Handler{User: user, Database: client, SupabaseURL: "https://project.invalid", SupabaseKey: "public-key", Logger: logger}
					h.Register(mux)
					method, path, body = "PATCH", "/api/onboarding", `{"user":"user-a","updates":{"current_step":2}}`
				}
				parent := context.Background()
				if earlier {
					var cancel context.CancelFunc
					parent, cancel = context.WithTimeout(parent, time.Second)
					defer cancel()
				}
				w := httptest.NewRecorder()
				mux.ServeHTTP(w, httptest.NewRequest(method, path, strings.NewReader(body)).WithContext(parent))
				// A saved search is then counted (R-102): a second call, within
				// the same budget, which the transport above checks for each.
				want := 1
				if area == "history" {
					want = 2
				}
				if w.Code != 200 || calls != want {
					t.Fatalf("status %d, database calls %d, want %d", w.Code, calls, want)
				}
				if identityContext == nil || identityContext.Err() != context.Canceled {
					t.Error("route context not canceled on return")
				}
			})
		}
	}
}
