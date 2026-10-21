package apikey

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestAccountingOnlyExecutorCannotManageKeys(t *testing.T) {
	manager, store, clock := setup(t)
	_, raw := issue(t, manager, "owner-a")
	executor, err := NewExecutor(struct{ Accounting }{store}, testPolicy(), clock.now)
	if err != nil {
		t.Fatal("accounting-only constructor refused", err)
	}
	if _, err := executor.Execute(context.Background(), raw, "public-search", "separate-execution", func(context.Context) (int, error) { return 200, nil }); err != nil {
		t.Fatal(err)
	}
	if _, _, err := executor.Issue(context.Background(), "owner-a", "Test", []string{"repo:read:public"}); !errors.Is(err, ErrUnavailable) {
		t.Fatal("executor exposed issuance", err)
	}
	if _, err := executor.List(context.Background(), "owner-a"); !errors.Is(err, ErrUnavailable) {
		t.Fatal("executor exposed management", err)
	}
	if err := executor.Revoke(context.Background(), "owner-a", "abcdefghijklmnop"); !errors.Is(err, ErrUnavailable) {
		t.Fatal("executor exposed revocation", err)
	}
	if _, err := New(nil, store, testPolicy(), clock.now); !errors.Is(err, ErrPolicy) {
		t.Fatal("original constructor policy changed", err)
	}
}

func TestRPCAccountingSeparatesCredentialsAndPolicy(t *testing.T) {
	ctx := context.Background()
	material, _ := Generate()
	owner := "11111111-1111-4111-8111-111111111111"
	now := time.Now().UTC().Truncate(time.Microsecond)
	row := Metadata{material.Selector, owner, "Test", Prefix + material.Selector + ".", []string{"repo:read:public"}, now.Add(-time.Minute), now.Add(time.Hour), nil}
	reservation := Reservation{"req-rpc", material.Selector, owner, "public-search", now}
	receipt := Completion{reservation, "success", 200, now.Add(time.Second)}
	calls := map[string]int{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer accountant-only" || r.Header.Get("apikey") != "synthetic-public-key" {
			t.Error("wrong accounting capability")
		}
		if r.Method != "POST" || r.Header.Get("Content-Profile") != "public" {
			t.Error("wrong RPC profile/method")
		}
		name := strings.TrimPrefix(r.URL.Path, "/rest/v1/rpc/")
		calls[name]++
		var args map[string]json.RawMessage
		_ = json.NewDecoder(r.Body).Decode(&args)
		var result any
		switch name {
		case "sefgh_key_policy":
			result = map[string]any{"revision": "fixture-v1", "enabled": true, "max_active": 4, "max_name_runes": 40, "per_key": 3, "per_owner": 4, "lifetime_seconds": 3600, "window_seconds": 86400, "completion_timeout_seconds": 1, "charge_mode": "attempt", "endpoints": map[string]string{"public-search": "repo:read:public"}}
		case "sefgh_key_lookup":
			if len(args) != 1 {
				t.Error("lookup args")
			}
			bytes, _ := json.Marshal(row)
			var fields map[string]any
			_ = json.Unmarshal(bytes, &fields)
			digest := material.Verifier.Bytes()
			fields["verifier_hex"] = fmt.Sprintf("%x", digest)
			result = fields
		case "sefgh_key_reserve":
			if len(args) != 5 || string(args["p_revision"]) != `"fixture-v1"` || args["p_owner"] != nil || args["p_requested_at"] != nil {
				t.Error("database policy bypass", args)
			}
			result = reservation
		case "sefgh_key_complete", "sefgh_key_recovery":
			var got Completion
			_ = json.Unmarshal(args["p_receipt"], &got)
			if got != receipt || len(args) != 1 {
				t.Error("completion binding")
			}
			result = nil
		case "sefgh_key_pending":
			result = map[string]any{"items": []map[string]any{{"Reservation": reservation, "Receipt": receipt}}, "next": nil}
		default:
			t.Error("unexpected accountant operation", name)
			w.WriteHeader(500)
			return
		}
		_ = json.NewEncoder(w).Encode(result)
	}))
	defer server.Close()
	client, _ := NewRPCClient(server.URL, "synthetic-public-key")
	accounting, err := client.OpenAccounting(ctx, "accountant-only")
	if err != nil {
		t.Fatal(err)
	}
	key, err := accounting.Lookup(ctx, material.Selector)
	if err != nil || !key.Verifier.Equal(material.Verifier) {
		t.Fatal("lookup", err)
	}
	attempt := Attempt{material.Selector, material.Verifier, "req-rpc", "public-search", "repo:read:public", now, 86400 * time.Second, 3, 4}
	got, err := accounting.Reserve(ctx, attempt)
	if err != nil || got != reservation {
		t.Fatal("reservation", err, got)
	}
	attempt.PerOwner = 999
	if _, err := accounting.Reserve(ctx, attempt); err != ErrPolicy {
		t.Fatal("unapproved client limit", err)
	}
	if err := accounting.Complete(ctx, receipt); err != nil {
		t.Fatal(err)
	}
	if err := accounting.SaveRecovery(ctx, receipt); err != nil {
		t.Fatal(err)
	}
	pending, err := accounting.Pending(ctx, nil)
	if err != nil || len(pending.Items) != 1 || pending.Items[0].Receipt == nil || *pending.Items[0].Receipt != receipt {
		t.Fatal("pending discovery", err)
	}
	executor, err := accounting.Executor(func() time.Time { return now })
	if err != nil {
		t.Fatal(err)
	}
	if _, err := executor.List(ctx, owner); err != ErrUnavailable {
		t.Fatal("accountant exposes management")
	}
	if calls["sefgh_key_policy"] != 1 || calls["sefgh_key_reserve"] != 1 {
		t.Fatal("unexpected RPC calls", calls)
	}
	for _, value := range []any{*accounting, accounting} {
		if strings.Contains(fmt.Sprintf("%+v %#v", value, value), "accountant-only") {
			t.Fatal("credential formatting")
		}
		if _, err := json.Marshal(value); err == nil {
			t.Fatal("credential serialization")
		}
	}
}

func TestRPCSessionBindsManagementToVerifiedUserBearer(t *testing.T) {
	owner := "11111111-1111-4111-8111-111111111111"
	material, err := Generate()
	if err != nil {
		t.Fatal(err)
	}
	raw, err := material.Secret.Take()
	if err != nil {
		t.Fatal(err)
	}
	metadata := Metadata{Selector: material.Selector, Owner: owner, Name: "Test", Prefix: Prefix + material.Selector + ".", Scopes: []string{"repo:read:public"}, CreatedAt: time.Now().UTC(), ExpiresAt: time.Now().Add(time.Hour).UTC()}
	authCalls, dataCalls := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer session-a" || r.Header.Get("apikey") != "synthetic-public-key" {
			t.Error("wrong user capability")
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/auth/v1/user":
			authCalls++
			_ = json.NewEncoder(w).Encode(map[string]any{"id": owner, "is_anonymous": false})
		case "/rest/v1/rpc/sefgh_key_issue":
			dataCalls++
			var args map[string]any
			if json.NewDecoder(r.Body).Decode(&args) != nil || len(args) != 2 || args["p_name"] != "Test" {
				t.Error("issuance can supply unreviewed fields", args)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"key": metadata, "secret": raw})
		default:
			t.Error("unexpected API", r.URL.Path)
			w.WriteHeader(500)
		}
	}))
	defer server.Close()
	client, err := NewRPCClient(server.URL, "synthetic-public-key")
	if err != nil {
		t.Fatal(err)
	}
	id, manager, err := client.Sessions()(context.Background(), "session-a")
	if err != nil || id != owner || manager == nil {
		t.Fatal("verified factory", err, id)
	}
	row, secret, err := manager.Issue(context.Background(), owner, " Test ", []string{"repo:read:public"})
	if err != nil || row.Selector != material.Selector || secret == nil {
		t.Fatal("SQL issuance", err)
	}
	value, err := secret.Take()
	if err != nil || value != raw {
		t.Fatal("one-time issuance mismatch")
	}
	if value, err := secret.Take(); err != ErrRevealed || value != "" {
		t.Fatal("SQL secret revealed again")
	}
	if _, _, err := manager.Issue(context.Background(), "22222222-2222-4222-8222-222222222222", "Test", []string{"repo:read:public"}); err != ErrOwner {
		t.Fatal("owner rebound", err)
	}
	if authCalls != 1 || dataCalls != 1 {
		t.Fatal("unexpected capability calls", authCalls, dataCalls)
	}
	if strings.Contains(row.Prefix, raw) {
		t.Fatal("metadata contains credential")
	}
}
