package apikey

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestRPCRecoveryOpensAndCompletesWithAdmissionsDisabled(t *testing.T) {
	rows := recoveryRows(1)
	var paths []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer fixture-accountant" || r.Header.Get("apikey") != "fixture-public" {
			t.Error("wrong recovery credentials")
		}
		paths = append(paths, r.URL.Path)
		switch r.URL.Path {
		case "/rest/v1/rpc/sefgh_key_policy":
			_ = json.NewEncoder(w).Encode(rpcPolicy{Enabled: false})
		case "/rest/v1/rpc/sefgh_key_pending":
			_ = json.NewEncoder(w).Encode(PendingPage{Items: rows})
		case "/rest/v1/rpc/sefgh_key_complete":
			var args struct {
				Receipt Completion `json:"p_receipt"`
			}
			if json.NewDecoder(r.Body).Decode(&args) != nil || args.Receipt != *rows[0].Receipt {
				t.Error("changed completion receipt")
			}
			_, _ = w.Write([]byte("null"))
		default:
			t.Error("recovery acquired unrelated capability", r.URL.Path)
			w.WriteHeader(500)
		}
	}))
	defer server.Close()
	client, err := NewRPCClient(server.URL, "fixture-public")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.OpenAccounting(context.Background(), "fixture-accountant"); err != ErrPolicy {
		t.Fatal("disabled admissions opened", err)
	}
	paths = nil
	store, err := client.OpenRecovery(context.Background(), "fixture-accountant")
	if err != nil || store == nil {
		t.Fatal("recovery coupled to admissions", err)
	}
	if _, ok := store.(Accounting); ok {
		t.Fatal("recovery exposes reservation/lookup")
	}
	if _, ok := store.(Manager); ok {
		t.Fatal("recovery exposes owner management")
	}
	result, err := RecoverCompletionPage(context.Background(), store, nil, RecoveryPageOptions{1, time.Second})
	if err != nil || result.Completed != 1 || result.More {
		t.Fatal(result, err)
	}
	want := []string{"/rest/v1/rpc/sefgh_key_pending", "/rest/v1/rpc/sefgh_key_pending", "/rest/v1/rpc/sefgh_key_complete"}
	if !reflect.DeepEqual(paths, want) {
		t.Fatal("unexpected recovery calls", paths)
	}
	for _, format := range []string{"%v", "%+v", "%#v"} {
		if strings.Contains(fmt.Sprintf(format, store), "fixture-accountant") {
			t.Fatal("credential formatted")
		}
	}
	if _, err := json.Marshal(store); err == nil {
		t.Fatal("credential serialized")
	}
}

func TestRPCRecoveryRejectsInvalidCredentialsBeforeIO(t *testing.T) {
	var client *RPCClient
	if _, err := client.OpenRecovery(context.Background(), "fixture-accountant"); err != ErrUnavailable {
		t.Fatal(err)
	}
	client, _ = NewRPCClient("http://127.0.0.1:1", "fixture-public")
	for _, bearer := range []string{"", "sk_fake", "token with space", "token\nline", strings.Repeat("a", 8193)} {
		if store, err := client.OpenRecovery(context.Background(), bearer); err != ErrPolicy || store != nil {
			t.Fatal("invalid credential admitted", err)
		}
	}
}

func TestRPCRecoveryDenialAndMalformedPageCannotOpenCapability(t *testing.T) {
	for _, body := range []string{"denied", `{"items":null,"next":null}`, `{"items":[],"next":{"StartedAt":"2026-10-21T00:00:00Z","RequestID":"bad"}}`} {
		t.Run(body, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				if body == "denied" {
					w.WriteHeader(403)
					_, _ = w.Write([]byte(`{"message":"private diagnostic"}`))
					return
				}
				_, _ = w.Write([]byte(body))
			}))
			defer server.Close()
			client, _ := NewRPCClient(server.URL, "fixture-public")
			store, err := client.OpenRecovery(context.Background(), "fixture-accountant")
			if err != ErrUnavailable || store != nil {
				t.Fatal("unverified capability opened", err)
			}
		})
	}
}

func TestRPCRecoveryOpeningHonorsCallerCancellation(t *testing.T) {
	client, _ := NewRPCClient("http://127.0.0.1:1", "fixture-public")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if store, err := client.OpenRecovery(ctx, "fixture-accountant"); !errors.Is(err, context.Canceled) || store != nil {
		t.Fatal("cancel ignored", err)
	}
}

func TestRPCRecoveryOpeningCancellationDuringPendingRead(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		select {
		case <-r.Context().Done():
		case <-release:
		}
	}))
	defer func() { close(release); server.Close() }()
	client, _ := NewRPCClient(server.URL, "fixture-public")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() {
		_, err := client.OpenRecovery(ctx, "fixture-accountant")
		done <- err
	}()
	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("pending read did not start")
	}
	cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatal("cancelled pending opening", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("cancelled pending opening did not stop")
	}
}
