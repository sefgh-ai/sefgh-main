package githubaccess

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestVerifierRejectsRedirectAndCancellation(t *testing.T) {
	redirected := 0
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirected++; w.WriteHeader(200) }))
	defer destination.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, destination.URL, 302) }))
	defer origin.Close()
	v := Verifier{SupabaseURL: origin.URL, SupabaseKey: "public-key"}
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer session")
	r.Header.Set("X-GitHub-Token", "gh-a")
	if _, status := v.Resolve(r); status != 503 || redirected != 0 {
		t.Fatalf("redirect followed or not rejected: %d", status)
	}
	ctx, cancel := context.WithCancel(r.Context())
	cancel()
	if _, status := v.Resolve(r.WithContext(ctx)); status != 503 {
		t.Fatalf("cancelled identity accepted: %d", status)
	}
}

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestContract(t *testing.T) {
	raw, err := os.ReadFile("../../../contracts/github-access/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Cases []struct {
			ID      string            `json:"id"`
			Headers map[string]string `json:"headers"`
			Status  int               `json:"status"`
			Token   string            `json:"token"`
			Calls   []struct {
				Service string          `json:"service"`
				Status  int             `json:"status"`
				Body    json.RawMessage `json:"body"`
				Network bool            `json:"network_error"`
			} `json:"calls"`
		} `json:"cases"`
	}
	if err = json.Unmarshal(raw, &contract); err != nil {
		t.Fatal(err)
	}
	for _, c := range contract.Cases {
		t.Run(c.ID, func(t *testing.T) {
			calls := 0
			v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", GitHubURL: "https://github.test"}
			v.Client = &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
				if calls >= len(c.Calls) {
					t.Fatal("unexpected identity call")
				}
				step := c.Calls[calls]
				calls++
				wantURL, wantToken := "https://auth.test/auth/v1/user", c.Headers["Authorization"]
				if step.Service == "github" {
					wantURL = "https://github.test/user"
					wantToken = "Bearer " + c.Headers["X-GitHub-Token"]
				}
				if r.URL.String() != wantURL || r.Header.Get("Authorization") != wantToken {
					t.Error("wrong identity destination or credential")
				}
				// The public key goes to Supabase and nowhere else.
				wantKey := "public-key"
				if step.Service == "github" {
					wantKey = ""
				}
				if r.Header.Get("apikey") != wantKey {
					t.Errorf("apikey sent to %s = %q, want %q", step.Service, r.Header.Get("apikey"), wantKey)
				}
				if step.Service == "github" && (r.Header.Get("Accept") != "application/vnd.github+json" || r.Header.Get("User-Agent") != "SEFGH") {
					t.Error("GitHub identity request lacks its Accept or User-Agent header")
				}
				if step.Network {
					return nil, errors.New("offline")
				}
				return &http.Response{StatusCode: step.Status, Body: io.NopCloser(strings.NewReader(string(step.Body))), Header: http.Header{}}, nil
			})}
			r := httptest.NewRequest("GET", "/api/github/search?q=test", nil)
			for k, val := range c.Headers {
				r.Header.Set(k, val)
			}
			token, status := v.Resolve(r)
			if status != c.Status || token != c.Token || calls != len(c.Calls) {
				t.Errorf("status=%d token-match=%t calls=%d, want %d/%d", status, token == c.Token, calls, c.Status, len(c.Calls))
			}
		})
	}
}
