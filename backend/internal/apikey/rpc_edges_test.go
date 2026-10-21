package apikey

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestStrictRPCResponseRejectsAliasesMissingDuplicatesAndWrongTypes(t *testing.T) {
	row := Metadata{"abcdefghijklmnop", "11111111-1111-4111-8111-111111111111", "Test", Prefix + "abcdefghijklmnop.", []string{"repo:read:public"}, time.Now().UTC(), time.Now().Add(time.Hour).UTC(), nil}
	bytes, _ := json.Marshal(row)
	valid := string(bytes)
	for name, body := range map[string]string{
		"case":      strings.Replace(valid, `"name":`, `"Name":`, 1),
		"duplicate": strings.Replace(valid, `"name":`, `"name":"Wrong","name":`, 1),
		"missing":   strings.Replace(valid, `"name":"Test",`, "", 1),
		"extra":     strings.Replace(valid, `"name":`, `"private_data":"secret","name":`, 1),
		"null":      "null", "trailing": valid + "null", "wrongtype": strings.Replace(valid, `"name":"Test"`, `"name":123`, 1),
	} {
		t.Run(name, func(t *testing.T) {
			var got Metadata
			if strictRPCJSON([]byte(body), &got) != ErrUnavailable {
				t.Fatal("untrusted shape accepted")
			}
		})
	}
	var got Metadata
	if strictRPCJSON(bytes, &got) != nil {
		t.Fatal("canonical SQL metadata rejected")
	}
}

func TestRPCSessionDenialNeverReachesDataAPI(t *testing.T) {
	for _, anonymous := range []bool{false, true} {
		calls := 0
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls++
			if r.URL.Path != "/auth/v1/user" {
				t.Error("data called before verification")
			}
			if anonymous {
				_ = json.NewEncoder(w).Encode(map[string]any{"id": "11111111-1111-4111-8111-111111111111", "is_anonymous": true})
			} else {
				w.WriteHeader(401)
			}
		}))
		client, _ := NewRPCClient(server.URL, "public-fixture")
		if _, _, err := client.Sessions()(context.Background(), "session"); err != ErrOwner {
			t.Fatal("refused identity accepted", err)
		}
		if _, _, err := client.Sessions()(context.Background(), Prefix+"never-send-to-auth"); err != ErrOwner {
			t.Fatal(err)
		}
		if calls != 1 {
			t.Fatal("playground key sent as Supabase bearer")
		}
		server.Close()
	}
}

func TestRPCNoRetryNoErrorPayloadAndNoCredentialRedirect(t *testing.T) {
	for _, kind := range []string{"denial", "ambiguous", "redirect", "malformed-success"} {
		t.Run(kind, func(t *testing.T) {
			var calls, redirects atomic.Int64
			target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirects.Add(1); w.WriteHeader(500) }))
			defer target.Close()
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				switch kind {
				case "denial":
					w.WriteHeader(403)
					_, _ = fmt.Fprint(w, `{"code":"42501","message":"sensitive-session credential query"}`)
				case "ambiguous":
					conn, _, _ := w.(http.Hijacker).Hijack()
					_ = conn.Close()
				case "redirect":
					http.Redirect(w, r, target.URL, 307)
				case "malformed-success":
					_, _ = fmt.Fprint(w, `{"key":null,"secret":"sensitive-plaintext"}`)
				}
			}))
			defer server.Close()
			client, _ := NewRPCClient(server.URL, "public-fixture")
			manager := ownerRPC{client, "11111111-1111-4111-8111-111111111111", "sensitive-session"}
			_, secret, err := manager.Issue(context.Background(), manager.owner, "Test", []string{"repo:read:public"})
			if err != ErrUnavailable || secret != nil || calls.Load() != 1 || redirects.Load() != 0 {
				t.Fatal("ambiguous/failing issuance retried or exposed", err, calls.Load(), redirects.Load())
			}
			for _, value := range []any{manager, &manager} {
				if strings.Contains(fmt.Sprintf("%v %#v", value, value), "sensitive-session") {
					t.Fatal("session formatting")
				}
				if _, err := json.Marshal(value); err == nil {
					t.Fatal("session serialization")
				}
			}
		})
	}
}

func TestRPCAccountingDoesNotFallBackWhenDenied(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Header.Get("Authorization") != "Bearer rejected-accountant" || r.URL.Path != "/rest/v1/rpc/sefgh_key_policy" {
			t.Error("fallback credential/API")
		}
		w.WriteHeader(401)
	}))
	defer server.Close()
	client, _ := NewRPCClient(server.URL, "public-fixture")
	if store, err := client.OpenAccounting(context.Background(), "rejected-accountant"); store != nil || err != ErrUnavailable || calls != 1 {
		t.Fatal("denied capability acquired", err, calls)
	}
	for _, bad := range []string{"", "http://example.com", "https://example.com/path", "https://user:pass@example.com", "https://example.com?token=x"} {
		if _, err := NewRPCClient(bad, "public-fixture"); err != ErrPolicy {
			t.Fatal("unsafe project URL", bad)
		}
	}
}

func TestRPCPendingComparesTimestampInstants(t *testing.T) {
	prior := time.Local
	time.Local = time.FixedZone("fixture-local", 0)
	defer func() { time.Local = prior }()
	stamp := "2026-10-21T00:00:00"
	reservation := `{"RequestID":"pending","Selector":"abcdefghijklmnop","Owner":"11111111-1111-4111-8111-111111111111","Endpoint":"public-search","StartedAt":"` + stamp + `+00:00"}`
	receipt := `{"Reservation":` + strings.Replace(reservation, "+00:00", "Z", 1) + `,"Outcome":"success","Status":200,"FinishedAt":"2026-10-21T00:00:01Z"}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprint(w, `{"items":[{"Reservation":`+reservation+`,"Receipt":`+receipt+`}],"next":null}`)
	}))
	defer server.Close()
	client, _ := NewRPCClient(server.URL, "public-fixture")
	store := &RPCAccounting{client: client, bearer: "accountant"}
	if _, err := store.Pending(context.Background(), nil); err != nil {
		t.Fatal("same instant rejected", err)
	}
}

func TestRPCRefusesLegacyPrivilegedProjectKey(t *testing.T) {
	for _, role := range []string{"service_role", "authenticated", ""} {
		payload, _ := json.Marshal(map[string]string{"role": role})
		key := "eyJhbGciOiJIUzI1NiJ9." + base64.RawURLEncoding.EncodeToString(payload) + ".synthetic"
		if _, err := NewRPCClient("https://example.com", key); err != ErrPolicy {
			t.Fatal("privileged project-key config accepted")
		}
	}
}
