package apikey

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
	"time"
)

// Proposed core state transitions, not a new contract for the live HTTP route.
func TestLifecycleFixtures(t *testing.T) {
	data, err := os.ReadFile("../../../contracts/api-key-lifecycle/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version    int    `json:"contract_version"`
		Status     string `json:"status"`
		Provenance string `json:"policy_provenance"`
		Policy     struct {
			MaxActive  int               `json:"max_active"`
			MaxName    int               `json:"max_name_runes"`
			PerKey     int               `json:"per_key"`
			PerOwner   int               `json:"per_owner"`
			Lifetime   int               `json:"lifetime_seconds"`
			Window     int               `json:"window_seconds"`
			Completion int               `json:"completion_timeout_seconds"`
			Charge     string            `json:"charge_mode"`
			Endpoints  map[string]string `json:"endpoints"`
		} `json:"policy"`
		Cases []struct {
			ID, Reason string
			Steps      []struct {
				Op, Key, Owner, Name, Endpoint string
				Scopes                         []string
				RequestID                      string `json:"request_id"`
				Milliseconds                   int
				Expect                         struct {
					Error  string
					Count  *int
					Status *int
					Events *int
					Calls  *int `json:"upstream_calls"`
				}
			}
		}
	}
	decoder := json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&contract); err != nil {
		t.Fatal(err)
	}
	if contract.Version != 1 || contract.Status != "proposed-unwired-core-not-http" || contract.Provenance != "synthetic-only-not-approved-rollout" || len(contract.Cases) == 0 {
		t.Fatal("invalid fixture provenance")
	}
	seen := map[string]bool{}
	for _, fixture := range contract.Cases {
		if seen[fixture.ID] || fixture.ID == "" || fixture.Reason == "" {
			t.Fatal("fixture identity")
		}
		seen[fixture.ID] = true
		t.Run(fixture.ID, func(t *testing.T) {
			_, store, clock := setup(t)
			p := contract.Policy
			s, err := New(store, store, Policy{MaxActive: p.MaxActive, MaxNameRunes: p.MaxName, PerKey: p.PerKey, PerOwner: p.PerOwner, Lifetime: time.Duration(p.Lifetime) * time.Second, Window: time.Duration(p.Window) * time.Second, CompletionTimeout: time.Duration(p.Completion) * time.Second, ChargeMode: p.Charge, Endpoints: p.Endpoints}, clock.now)
			if err != nil {
				t.Fatal(err)
			}
			metadata := map[string]Metadata{}
			secrets := map[string]*Secret{}
			raw := map[string]string{}
			calls := 0
			for n, step := range fixture.Steps {
				var gotErr error
				status, count := 0, 0
				switch step.Op {
				case "issue":
					var m Metadata
					var secret *Secret
					m, secret, gotErr = s.Issue(context.Background(), step.Owner, step.Name, step.Scopes)
					if gotErr == nil {
						metadata[step.Key] = m
						secrets[step.Key] = secret
					} else if secret != nil {
						t.Fatal("failed issue revealed")
					}
				case "take":
					var value string
					value, gotErr = secrets[step.Key].Take()
					if gotErr == nil {
						raw[step.Key] = value
					} else if value != "" {
						t.Fatal("second reveal returned value")
					}
				case "list":
					var rows []Metadata
					rows, gotErr = s.List(context.Background(), step.Owner)
					count = len(rows)
				case "revoke":
					gotErr = s.Revoke(context.Background(), step.Owner, metadata[step.Key].Selector)
				case "advance":
					clock.add(time.Duration(step.Milliseconds) * time.Millisecond)
				case "execute":
					status, gotErr = s.Execute(context.Background(), raw[step.Key], step.Endpoint, step.RequestID, func(context.Context) (int, error) { calls++; return 200, nil })
				default:
					t.Fatalf("unknown action %q", step.Op)
				}
				class := ""
				if gotErr != nil {
					class = "unexpected"
					for name, target := range map[string]error{"revealed": ErrRevealed, "owner": ErrOwner, "denied": ErrDenied, "limit": ErrLimit, "replay": ErrReplay, "active-limit": ErrActiveLimit, "input": ErrInput} {
						if errors.Is(gotErr, target) {
							class = name
						}
					}
				}
				if class != step.Expect.Error {
					t.Fatalf("step%d %s: errorclass %q want%q (%v)", n, step.Op, class, step.Expect.Error, gotErr)
				}
				for _, check := range []struct {
					name string
					got  int
					want *int
				}{{"count", count, step.Expect.Count}, {"status", status, step.Expect.Status}, {"events", len(store.events), step.Expect.Events}, {"upstream", calls, step.Expect.Calls}} {
					if check.want != nil && check.got != *check.want {
						t.Fatalf("step%d %s got%d want%d", n, check.name, check.got, *check.want)
					}
				}
			}
		})
	}
}
