package main

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/apikey"
)

func TestKeyExecutionAndCompletionFitServerDeadline(t *testing.T) {
	// The policy constructors permit at most 10s for detached completion;
	// an additional failed-completion recovery RPC is bounded separately.
	if apikey.MaxHTTPBudget+10*time.Second+apikey.RecoveryBudget >= writeTimeout {
		t.Fatal("key execution, completion and recovery exceed response deadline")
	}
}

func TestKeyPolicyBootstrapFailuresRemainUnavailable(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		body   string
	}{
		{"denied", 401, `{"message":"synthetic-denial"}`},
		{"unavailable", 503, `{"message":"synthetic-outage"}`},
		{"malformed", 200, `not-json`},
		{"incomplete", 200, `{"enabled":true}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var calls atomic.Int32
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.URL.Path != "/rest/v1/rpc/sefgh_key_policy" {
					t.Error("bootstrap failure reached another capability")
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer upstream.Close()
			t.Setenv("SEFGH_KEYS_V1", "1")
			t.Setenv("SEFGH_KEYS_ACCOUNTANT_JWT", "synthetic-accountant")
			t.Setenv("NEXT_PUBLIC_SUPABASE_URL", upstream.URL)
			t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key")
			var logs bytes.Buffer
			h := newHandler(slog.New(slog.NewTextHandler(&logs, nil)))
			w := httptest.NewRecorder()
			h.ServeHTTP(w, httptest.NewRequest("GET", "/api/v1/keys", nil))
			if w.Code != 503 || calls.Load() != 1 {
				t.Fatalf("failure status %d, upstream calls %d", w.Code, calls.Load())
			}
			if !strings.Contains(logs.String(), "stage=policy") || strings.Contains(logs.String(), "synthetic-") {
				t.Fatal("bootstrap log stage missing or configuration exposed")
			}
		})
	}
}

// An API key sent to an inactive v1 path must never fall through to the
// ordinary GitHub session verifier and become a Supabase Auth bearer.
func TestDisabledKeyRoutesDoNotVerifyOrForwardCredentials(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(500)
	}))
	defer upstream.Close()
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", upstream.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key")
	t.Setenv("GITHUB_API_URL", upstream.URL)
	t.Setenv("SEFGH_KEYS_ACCOUNTANT_JWT", "synthetic-accountant")
	for _, flag := range []string{"", "0", "true", "1 "} {
		t.Setenv("SEFGH_KEYS_V1", flag)
		h := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
		for _, path := range []string{"/api/v1/keys", "/api/v1/keys/abcdefghijklmnop", "/api/v1/search?q=go", "/api/v1/unknown"} {
			req := httptest.NewRequest("GET", path, nil)
			req.Header.Set("Authorization", "Bearer synthetic-presented-api-key")
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != 404 || rec.Header().Get("Cache-Control") != "no-store" {
				t.Errorf("disabled v1 path %s: status %d, cache %q", path, rec.Code, rec.Header().Get("Cache-Control"))
			}
		}
	}
	if calls.Load() != 0 {
		t.Fatalf("disabled routes contacted upstream %d times", calls.Load())
	}
}

func TestMissingKeyCapabilityFailsClosedWithoutLeakingConfiguration(t *testing.T) {
	t.Setenv("SEFGH_KEYS_V1", "1")
	t.Setenv("SEFGH_KEYS_ACCOUNTANT_JWT", "")
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic-project.invalid")
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key")
	var logs bytes.Buffer
	h := newHandler(slog.New(slog.NewTextHandler(&logs, nil)))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/keys", nil))
	if rec.Code != 503 || rec.Header().Get("Cache-Control") != "no-store" || !strings.Contains(rec.Body.String(), "Service unavailable") {
		t.Fatalf("missing capability: status %d, body %s", rec.Code, rec.Body)
	}
	for _, value := range []string{"synthetic-project.invalid", "synthetic-public-key"} {
		if strings.Contains(logs.String()+rec.Body.String(), value) {
			t.Fatal("configuration appeared in logs or response")
		}
	}
}
