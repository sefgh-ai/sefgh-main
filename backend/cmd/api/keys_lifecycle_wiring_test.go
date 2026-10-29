package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/apikey"
)

// This is a local stand-in for the reviewed RPC boundary, not evidence of
// live SQL grants, distributed quotas, signing configuration or activation.
type keyGateway struct {
	t                     *testing.T
	mu                    sync.Mutex
	material              apikey.Material
	raw                   string
	row                   apikey.Metadata
	enabled, failComplete bool
	events                []string
	reservation           apikey.Reservation
}

func (g *keyGateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	g.mu.Lock()
	defer g.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	answer := func(value any) { _ = json.NewEncoder(w).Encode(value) }
	if r.URL.Path == "/search/repositories" {
		for _, name := range []string{"Authorization", "apikey", "Cookie", "X-GitHub-Token"} {
			if r.Header.Get(name) != "" {
				g.t.Errorf("public key search received credential header %s", name)
			}
		}
		g.events = append(g.events, "github")
		answer(map[string]any{"total_count": 1, "items": []map[string]any{{"full_name": "fixture/public", "private": false, "visibility": "public"}}})
		return
	}
	if r.Header.Get("apikey") != "synthetic-public-key" {
		g.t.Error("RPC/Auth missing the public project key")
	}
	if r.URL.Path == "/auth/v1/user" {
		g.events = append(g.events, "auth")
		if r.Header.Get("Authorization") != "Bearer synthetic-owner-session" {
			w.WriteHeader(401)
			answer(map[string]string{"msg": "refused"})
			return
		}
		answer(map[string]any{"id": g.row.Owner, "is_anonymous": false})
		return
	}
	name := strings.TrimPrefix(r.URL.Path, "/rest/v1/rpc/")
	g.events = append(g.events, name)
	var args map[string]json.RawMessage
	if json.NewDecoder(r.Body).Decode(&args) != nil {
		g.t.Error("invalid RPC body")
	}
	ownerCall := name == "sefgh_key_issue" || name == "sefgh_key_list" || name == "sefgh_key_revoke"
	want := "Bearer synthetic-accountant"
	if ownerCall {
		want = "Bearer synthetic-owner-session"
	}
	if r.Header.Get("Authorization") != want {
		g.t.Error("owner/accountant capability crossed")
	}
	if r.Header.Get("Cookie") != "" || r.Header.Get("X-GitHub-Token") != "" {
		g.t.Error("unrelated credential reached RPC")
	}
	switch name {
	case "sefgh_key_policy":
		answer(map[string]any{"revision": "fixture-v1", "enabled": g.enabled, "max_active": 4, "max_name_runes": 40, "per_key": 5, "per_owner": 10, "lifetime_seconds": 3600, "window_seconds": 60, "completion_timeout_seconds": 1, "charge_mode": "attempt", "endpoints": map[string]string{"public-search": "repo:read:public"}})
	case "sefgh_key_issue":
		if len(args) != 2 || args["p_owner"] != nil {
			g.t.Error("caller selected owner in issuance RPC")
		}
		answer(map[string]any{"key": g.row, "secret": g.raw})
	case "sefgh_key_list":
		answer(map[string]any{"items": []apikey.Metadata{g.row}, "next": nil})
	case "sefgh_key_revoke":
		at := time.Now().UTC()
		g.row.RevokedAt = &at
		w.WriteHeader(204)
	case "sefgh_key_lookup":
		raw, _ := json.Marshal(g.row)
		var fields map[string]any
		_ = json.Unmarshal(raw, &fields)
		digest := g.material.Verifier.Bytes()
		fields["verifier_hex"] = fmt.Sprintf("%x", digest)
		answer(fields)
	case "sefgh_key_reserve":
		if len(args) != 5 || string(args["p_revision"]) != `"fixture-v1"` {
			g.t.Error("reservation bypassed database policy")
		}
		var requestID string
		_ = json.Unmarshal(args["p_request_id"], &requestID)
		g.reservation = apikey.Reservation{RequestID: requestID, Selector: g.row.Selector, Owner: g.row.Owner, Endpoint: "public-search", StartedAt: time.Now().UTC()}
		answer(g.reservation)
	case "sefgh_key_complete", "sefgh_key_recovery":
		var receipt apikey.Completion
		_ = json.Unmarshal(args["p_receipt"], &receipt)
		if receipt.Reservation != g.reservation {
			g.t.Error("completion lost the reservation binding")
		}
		if name == "sefgh_key_complete" && g.failComplete {
			w.WriteHeader(503)
			answer(map[string]string{"message": "synthetic write unavailable"})
			return
		}
		answer(nil)
	default:
		g.t.Error("unexpected runtime RPC")
		w.WriteHeader(500)
		answer(nil)
	}
}

func setupKeyRuntime(t *testing.T, enabled bool) (*keyGateway, http.Handler) {
	t.Helper()
	material, err := apikey.Generate()
	if err != nil {
		t.Fatal(err)
	}
	raw, err := material.Secret.Take()
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	g := &keyGateway{t: t, material: material, raw: raw, enabled: enabled, row: apikey.Metadata{Selector: material.Selector, Owner: "11111111-1111-4111-8111-111111111111", Name: "Example", Prefix: apikey.Prefix + material.Selector + ".", Scopes: []string{"repo:read:public"}, CreatedAt: now.Add(-time.Minute), ExpiresAt: now.Add(time.Hour)}}
	server := httptest.NewServer(g)
	t.Cleanup(server.Close)
	t.Setenv("SEFGH_KEYS_V1", "1")
	t.Setenv("SEFGH_KEYS_ACCOUNTANT_JWT", "synthetic-accountant")
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "synthetic-server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "synthetic-public-read-token")
	return g, newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func askKeyRuntime(h http.Handler, method, path, token, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-GitHub-Token", "synthetic-unrelated-caller-token")
	req.Header.Set("Cookie", "synthetic-unrelated-cookie=1")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	return w
}

func TestKeyRuntimeConnectsOwnerLifecycleAndAccountedSearch(t *testing.T) {
	g, h := setupKeyRuntime(t, true)
	created := askKeyRuntime(h, "POST", "/api/v1/keys", "synthetic-owner-session", `{"name":"Example","scopes":["repo:read:public"]}`)
	if created.Code != 201 || !strings.Contains(created.Body.String(), g.raw) {
		t.Fatalf("create status %d or missing show-once result", created.Code)
	}
	listed := askKeyRuntime(h, "GET", "/api/v1/keys", "synthetic-owner-session", "")
	if listed.Code != 200 || strings.Contains(listed.Body.String(), g.raw) || strings.Contains(listed.Body.String(), "verifier") {
		t.Fatal("list failed or revealed key material")
	}
	searched := askKeyRuntime(h, "GET", "/api/v1/search?q=go", g.raw, "")
	if searched.Code != 200 || !strings.Contains(searched.Body.String(), "fixture/public") || searched.Header().Get("X-Request-Id") == "" {
		t.Fatalf("accounted search status %d", searched.Code)
	}
	if searched.Header().Get("Cache-Control") != "no-store" || searched.Header().Get("X-Sefgh-Backend") != "go" {
		t.Fatal("key route response headers missing")
	}
	g.mu.Lock()
	events := strings.Join(g.events, ",")
	g.mu.Unlock()
	if !strings.Contains(events, "sefgh_key_lookup,sefgh_key_reserve,github,sefgh_key_complete") {
		t.Fatal("provider work was not enclosed by reservation/completion")
	}
	revoked := askKeyRuntime(h, "DELETE", "/api/v1/keys/"+g.row.Selector, "synthetic-owner-session", "")
	if revoked.Code != 204 {
		t.Fatalf("revoke status %d", revoked.Code)
	}
	denied := askKeyRuntime(h, "GET", "/api/v1/search?q=go", g.raw, "")
	if denied.Code != 401 {
		t.Fatalf("revoked key status %d", denied.Code)
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	github := 0
	for _, event := range g.events {
		if event == "github" {
			github++
		}
	}
	if github != 1 {
		t.Fatal("revoked key reached the provider")
	}
}

func TestKeyRuntimeRefusesDisabledDatabasePolicy(t *testing.T) {
	g, h := setupKeyRuntime(t, false)
	w := askKeyRuntime(h, "GET", "/api/v1/keys", "synthetic-owner-session", "")
	if w.Code != 503 {
		t.Fatalf("disabled policy status %d", w.Code)
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if strings.Join(g.events, ",") != "sefgh_key_policy" {
		t.Fatal("disabled policy permitted downstream work")
	}
}

func TestKeyRuntimeWiresDurableCompletionRecovery(t *testing.T) {
	g, h := setupKeyRuntime(t, true)
	g.mu.Lock()
	g.failComplete = true
	g.mu.Unlock()
	w := askKeyRuntime(h, "GET", "/api/v1/search?q=go", g.raw, "")
	if w.Code != 503 || strings.Contains(w.Body.String(), "fixture/public") {
		t.Fatal("failed accounting exposed provider success")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if !strings.Contains(strings.Join(g.events, ","), "sefgh_key_complete,sefgh_key_recovery") {
		t.Fatal("runtime omitted the durable receipt sink")
	}
}
