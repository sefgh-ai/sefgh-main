package apikey

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestHTTPMissingBearerNeverOpensManagement(t *testing.T) {
	service, _, _ := setup(t)
	calls := 0
	h, err := NewHTTP(func(context.Context, string) (string, Manager, error) {
		calls++
		return "owner-a", service, nil
	}, service, HTTPOptions{SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/api/v1/keys", "/api/v1/search?q=go"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 401 || w.Header().Get("Cache-Control") != "no-store" || !strings.Contains(w.Body.String(), `"error":"Unauthorized"`) {
			t.Fatalf("missing bearer %s: %d %v %s", path, w.Code, w.Header(), w.Body)
		}
	}
	if calls != 0 {
		t.Fatal("missing authentication reached management factory")
	}
}

func TestHTTPPublicSearchRejectsPrivateRowsAndFailedCompletion(t *testing.T) {
	for _, scenario := range []struct {
		name, reply    string
		failCompletion bool
		status         int
	}{
		{"private-row", `{"total_count":1,"items":[{"id":1,"private":true}]}`, false, 502},
		{"missing-visibility", `{"total_count":1,"items":[{"id":1}]}`, false, 502},
		{"duplicate-visibility", `{"total_count":1,"items":[{"id":1,"private":true,"private":false}]}`, false, 502},
		{"conflicting-visibility", `{"total_count":1,"items":[{"id":1,"private":false,"visibility":"private"}]}`, false, 502},
		{"internal-visibility", `{"total_count":1,"items":[{"id":1,"private":false,"visibility":"internal"}]}`, false, 502},
		{"aliased-visibility", `{"total_count":1,"items":[{"id":1,"private":false,"Visibility":"public"}]}`, false, 502},
		{"invalid-visibility-type", `{"total_count":1,"items":[{"id":1,"private":false,"visibility":false}]}`, false, 502},
		{"completion-not-confirmed", `{"total_count":1,"items":[{"id":1,"private":false}]}`, true, 503},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			service, store, _ := setup(t)
			_, secret, err := service.Issue(context.Background(), "owner-a", "Test", []string{"repo:read:public"})
			if err != nil {
				t.Fatal(err)
			}
			raw, err := secret.Take()
			if err != nil {
				t.Fatal(err)
			}
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(scenario.reply)) }))
			defer upstream.Close()
			if scenario.failCompletion {
				store.completeErr = errors.New("synthetic-sensitive-completion-error")
			}
			recoveries := []Completion{}
			h, err := NewHTTP(func(context.Context, string) (string, Manager, error) { return "", nil, ErrOwner }, service, HTTPOptions{GitHubURL: upstream.URL, SaveRecovery: func(ctx context.Context, c Completion) error {
				if ctx.Err() != nil {
					t.Error("recovery inherited cancellation")
				}
				deadline, ok := ctx.Deadline()
				if !ok || time.Until(deadline) > time.Second {
					t.Error("recovery unbounded")
				}
				recoveries = append(recoveries, c)
				return errors.New("synthetic-sensitive-recovery-error")
			}})
			if err != nil {
				t.Fatal(err)
			}
			r := httptest.NewRequest("GET", "/api/v1/search?q=go", nil)
			r.Header.Set("Authorization", "Bearer "+raw)
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != scenario.status || strings.Contains(w.Body.String(), `"items"`) || strings.Contains(w.Body.String(), "synthetic-sensitive") || strings.Contains(w.Body.String(), raw) {
				t.Fatalf("unsafe response: %d %s", w.Code, w.Body)
			}
			if scenario.failCompletion {
				if len(recoveries) != 1 || recoveries[0].Status != 200 || recoveries[0].Outcome != "success" {
					t.Fatal("exact completion receipt not retained")
				}
			} else if len(recoveries) != 0 {
				t.Fatal("unexpected recovery")
			}
		})
	}
}

func TestHTTPCreationRevealListAndCrossOwnerRevocation(t *testing.T) {
	service, _, _ := setup(t)
	h, err := NewHTTP(func(_ context.Context, bearer string) (string, Manager, error) {
		switch bearer {
		case "session-a":
			return "owner-a", service, nil
		case "session-b":
			return "owner-b", service, nil
		}
		return "", nil, ErrOwner
	}, service, HTTPOptions{SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+token)
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	created := request("POST", "/api/v1/keys", "session-a", `{"name":"Test","scopes":["repo:read:public"]}`)
	var issuance struct {
		Key    Metadata `json:"key"`
		Secret string   `json:"secret"`
	}
	if created.Code != 201 || json.Unmarshal(created.Body.Bytes(), &issuance) != nil || issuance.Key.Owner != "owner-a" {
		t.Fatalf("creation: %d %s", created.Code, created.Body)
	}
	if _, err := Parse(issuance.Secret); err != nil {
		t.Fatal("no usable one-time credential")
	}
	list := request("GET", "/api/v1/keys", "session-a", "")
	if list.Code != 200 || strings.Contains(list.Body.String(), issuance.Secret) || strings.Contains(list.Body.String(), `"secret"`) || strings.Contains(list.Body.String(), "digest") || !strings.Contains(list.Body.String(), issuance.Key.Selector) {
		t.Fatalf("metadata list leaked or lost key: %d %s", list.Code, list.Body)
	}
	foreign := request("GET", "/api/v1/keys", "session-b", "")
	if foreign.Code != 200 || strings.TrimSpace(foreign.Body.String()) != `{"keys":[]}` {
		t.Fatal("cross-owner list", foreign.Body)
	}
	path := "/api/v1/keys/" + issuance.Key.Selector
	if got := request("DELETE", path, "session-b", ""); got.Code != 204 || got.Body.Len() != 0 {
		t.Fatal("foreign revoke should be indistinguishable from absent key")
	}
	rows, err := service.List(context.Background(), "owner-a")
	if err != nil || rows[0].RevokedAt != nil {
		t.Fatal("foreign owner revoked key")
	}
	for range 2 {
		if got := request("DELETE", path, "session-a", ""); got.Code != 204 || got.Body.Len() != 0 {
			t.Fatal("idempotent owner revoke", got.Code)
		}
	}
	rows, err = service.List(context.Background(), "owner-a")
	if err != nil || rows[0].RevokedAt == nil {
		t.Fatal("owner revocation not stored")
	}
}

func TestHTTPPublicSearchHasNoAmbientCredentials(t *testing.T) {
	service, _, _ := setup(t)
	_, secret, err := service.Issue(context.Background(), "owner-a", "Test", []string{"repo:read:public"})
	if err != nil {
		t.Fatal(err)
	}
	raw, err := secret.Take()
	if err != nil {
		t.Fatal(err)
	}
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		for _, name := range []string{"Authorization", "Cookie", "X-GitHub-Token", "apikey", "X-Request-Id"} {
			if r.Header.Get(name) != "" {
				t.Errorf("upstream received %s", name)
			}
		}
		if r.URL.Path != "/search/repositories" || r.URL.Query().Get("q") != "go" {
			t.Error("public search changed request", r.URL)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"total_count":1,"items":[{"id":1,"private":false,"full_name":"public/example"}]}`))
	}))
	defer upstream.Close()
	h, err := NewHTTP(func(context.Context, string) (string, Manager, error) {
		t.Error("API key used as a Supabase identity")
		return "", nil, ErrOwner
	}, service, HTTPOptions{GitHubURL: upstream.URL, SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("GET", "/api/v1/search?q=go", nil)
	r.Header.Set("Authorization", "Bearer "+raw)
	r.Header.Set("Cookie", "session=synthetic-private-session")
	r.Header.Set("X-GitHub-Token", "synthetic-private-github")
	r.Header.Set("apikey", "synthetic-project-key")
	r.Header.Set("X-Request-Id", "client-chosen-id")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 || calls.Load() != 1 || !strings.Contains(w.Body.String(), `"full_name":"public/example"`) {
		t.Fatalf("public search: %d %s, calls%d", w.Code, w.Body, calls.Load())
	}
	if w.Header().Get("X-Request-Id") == "" || w.Header().Get("X-Request-Id") == "client-chosen-id" {
		t.Fatal("server request ID not generated")
	}
	if strings.Contains(w.Body.String(), raw) {
		t.Fatal("credential echoed")
	}
}

func TestHTTPRejectsOwnerAliasesAndDuplicateFieldsBeforeCreation(t *testing.T) {
	service, store, _ := setup(t)
	h, err := NewHTTP(func(_ context.Context, token string) (string, Manager, error) {
		if token != "session-a" {
			return "", nil, ErrOwner
		}
		return "owner-a", service, nil
	}, service, HTTPOptions{SaveRecovery: func(context.Context, Completion) error { return nil }})
	if err != nil {
		t.Fatal(err)
	}
	for _, body := range []string{
		`{"name":"Test","scopes":["repo:read:public"],"owner_id":"owner-b"}`,
		`{"Name":"Test","scopes":["repo:read:public"]}`,
		`{"name":"First","name":"Second","scopes":["repo:read:public"]}`,
		`{"name":"Test","scopes":["repo:read:public"]} {}`,
		`null`, `[]`,
	} {
		r := httptest.NewRequest("POST", "/api/v1/keys", strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer session-a")
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 400 {
			t.Fatalf("invalid creation accepted: %s status%d %s", body, w.Code, w.Body)
		}
	}
	rows, err := store.ListOwned(context.Background(), "owner-a")
	if err != nil || len(rows) != 0 {
		t.Fatal("invalid JSON reached persistence", err)
	}
}
