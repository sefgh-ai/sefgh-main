package apikey

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
)

func TestHTTPFixtures(t *testing.T) {
	data, err := os.ReadFile("../../../contracts/api-key-http/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version    int    `json:"contract_version"`
		Status     string `json:"status"`
		Provenance string `json:"policy_provenance"`
		Cases      []struct {
			ID, Method, Path, Bearer, Body, Error, Allow, Result string
			Headers                                              map[string][]string
			Prepared                                             bool   `json:"prepared_key"`
			Failure                                              string `json:"store_failure"`
			UpstreamBody                                         string `json:"upstream_body"`
			UpstreamStatus                                       int    `json:"upstream_status"`
			Status, Events, Recoveries                           int
			Calls                                                int `json:"upstream_calls"`
		}
	}
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if err := d.Decode(&contract); err != nil {
		t.Fatal(err)
	}
	if contract.Version != 1 || contract.Status != "proposed-unwired-http" || contract.Provenance != "synthetic-only-not-approved-rollout" || len(contract.Cases) == 0 {
		t.Fatal("HTTP fixture provenance")
	}
	seen := map[string]bool{}
	for _, c := range contract.Cases {
		if c.ID == "" || seen[c.ID] {
			t.Fatal("HTTP fixture identity")
		}
		seen[c.ID] = true
		t.Run(c.ID, func(t *testing.T) {
			service, store, _ := setup(t)
			var metadata Metadata
			raw := ""
			if c.Prepared {
				metadata, raw = issue(t, service, "owner-a")
			}
			failure := errors.New("synthetic-private-database-error")
			switch c.Failure {
			case "create":
				store.createErr = failure
			case "complete":
				store.completeErr = failure
			case "reserve":
				store.reserveErr = failure
			}
			var calls atomic.Int32
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" {
					t.Error("credential reached GitHub")
				}
				status := c.UpstreamStatus
				if status == 0 {
					status = 200
				}
				w.WriteHeader(status)
				body := c.UpstreamBody
				if body == "" {
					body = `{"total_count":1,"items":[{"id":1,"private":false}]}`
				}
				_, _ = w.Write([]byte(body))
			}))
			defer upstream.Close()
			recoveries := 0
			h, err := NewHTTP(func(_ context.Context, bearer string) (string, Manager, error) {
				switch bearer {
				case "session-a":
					return "owner-a", service, nil
				case "session-b":
					return "owner-b", service, nil
				case "session-down":
					return "", nil, ErrUnavailable
				case "session-panic":
					panic("synthetic-private-session")
				}
				return "", nil, ErrOwner
			}, service, HTTPOptions{GitHubURL: upstream.URL, SaveRecovery: func(context.Context, Completion) error { recoveries++; return nil }})
			if err != nil {
				t.Fatal(err)
			}
			r := httptest.NewRequest(c.Method, strings.ReplaceAll(c.Path, "$id", metadata.Selector), strings.NewReader(c.Body))
			if c.Method == "POST" {
				r.Header.Set("Content-Type", "application/json")
			}
			if c.Bearer != "" {
				r.Header.Set("Authorization", "Bearer "+strings.ReplaceAll(c.Bearer, "$key", raw))
			}
			for k, v := range c.Headers {
				r.Header[k] = v
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != c.Status || w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("Allow") != c.Allow {
				t.Fatalf("response: %d %v %s", w.Code, w.Header(), w.Body)
			}
			if calls.Load() != int32(c.Calls) || len(store.events) != c.Events || recoveries != c.Recoveries {
				t.Fatalf("side effects: calls%d events%d recoveries%d", calls.Load(), len(store.events), recoveries)
			}
			if c.Error != "" {
				var got map[string]string
				if json.Unmarshal(w.Body.Bytes(), &got) != nil || len(got) != 1 || got["error"] != c.Error {
					t.Fatalf("error response %s", w.Body)
				}
			}
			body := w.Body.String()
			if strings.Contains(body, "synthetic-private") || (raw != "" && strings.Contains(body, raw)) || strings.Contains(body, "verifier") {
				t.Fatal("private material returned")
			}
			switch c.Result {
			case "created":
				var got struct {
					Key    Metadata
					Secret string
				}
				if json.Unmarshal(w.Body.Bytes(), &got) != nil || got.Key.Owner != "owner-a" || got.Key.Name != "Test" {
					t.Fatal("creation", body)
				}
				if _, err := Parse(got.Secret); err != nil {
					t.Fatal("unusable secret")
				}
			case "empty-list":
				if strings.TrimSpace(body) != `{"keys":[]}` {
					t.Fatal("empty list", body)
				}
			case "metadata":
				if !strings.Contains(body, metadata.Selector) || strings.Contains(body, `"secret"`) {
					t.Fatal("metadata", body)
				}
			case "revoked", "not-revoked":
				rows, err := service.List(context.Background(), "owner-a")
				if err != nil || len(rows) != 1 || (rows[0].RevokedAt != nil) != (c.Result == "revoked") || body != "" {
					t.Fatal("revoke result")
				}
			case "search":
				if !strings.Contains(body, `"private":false`) || w.Header().Get("X-Request-Id") == "" {
					t.Fatal("public result", body)
				}
			}
		})
	}
}
