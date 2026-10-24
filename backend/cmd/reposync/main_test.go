package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/reposync"
)

func env(values map[string]string) func(string) string {
	return func(k string) string { return values[k] }
}

func TestRefusesWithoutApproval(t *testing.T) {
	var errOut bytes.Buffer
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { calls.Add(1) }))
	defer server.Close()
	code := run([]string{"-once"}, env(map[string]string{
		"REPOSYNC_SUPABASE_URL": server.URL, "REPOSYNC_SUPABASE_SERVICE_KEY": "k", "REPOSYNC_GITHUB_KEYS": "g",
	}), nil, &errOut, reposync.Config{GraphQLURL: server.URL})
	if code != 2 || !strings.Contains(errOut.String(), "refusing to start") || calls.Load() != 0 {
		t.Fatalf("code %d, calls %d, output %q", code, calls.Load(), errOut.String())
	}
}

func TestOnceRunsOneCycleAgainstAFake(t *testing.T) {
	var mu sync.Mutex
	var paths []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		paths = append(paths, r.Method+" "+r.URL.Path)
		mu.Unlock()
		_ = json.NewEncoder(w).Encode([]any{}) // no topics at all
	}))
	defer server.Close()
	quiet := slog.New(slog.NewTextHandler(io.Discard, nil))
	code := run([]string{"-once"}, env(map[string]string{
		"REPOSYNC_ENABLED": "1", "REPOSYNC_SUPABASE_URL": server.URL + "/", "REPOSYNC_SUPABASE_SERVICE_KEY": "k", "REPOSYNC_GITHUB_KEYS": "g1, g2",
	}), nil, io.Discard, reposync.Config{GraphQLURL: server.URL + "/graphql", Logger: quiet, Sleep: func(time.Duration) { t.Error("slept with -once") }})
	mu.Lock()
	defer mu.Unlock()
	if code != 0 || strings.Join(paths, ",") != "GET /rest/v1/topic_list" {
		t.Fatalf("code %d, requests %v", code, paths)
	}
}

func TestStopEndsThePollingWait(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]any{})
	}))
	defer server.Close()
	signals := make(chan os.Signal, 1)
	slept := 0
	quiet := slog.New(slog.NewTextHandler(io.Discard, nil))
	code := run(nil, env(map[string]string{
		"REPOSYNC_ENABLED": "1", "REPOSYNC_SUPABASE_URL": server.URL, "REPOSYNC_SUPABASE_SERVICE_KEY": "k", "REPOSYNC_GITHUB_KEYS": "g",
	}), signals, io.Discard, reposync.Config{GraphQLURL: server.URL, Logger: quiet, Sleep: func(time.Duration) {
		if slept++; slept == 3 {
			signals <- os.Interrupt
			time.Sleep(50 * time.Millisecond) // let the stop reach the worker
		}
	}})
	if code != 0 || slept < 3 || slept > 4 {
		t.Fatalf("code %d after %d one-second waits", code, slept)
	}
}
