package apikey

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type testClock struct {
	mu sync.Mutex
	at time.Time
}

func (c *testClock) now() time.Time      { c.mu.Lock(); defer c.mu.Unlock(); return c.at }
func (c *testClock) add(d time.Duration) { c.mu.Lock(); defer c.mu.Unlock(); c.at = c.at.Add(d) }
func testPolicy() Policy {
	return Policy{MaxActive: 4, MaxNameRunes: 40, PerKey: 3, PerOwner: 4, Lifetime: time.Hour, Window: time.Minute, CompletionTimeout: time.Second, ChargeMode: "attempt", Endpoints: map[string]string{"public-search": "repo:read:public"}}
}
func setup(t *testing.T) (*Service, *memoryStore, *testClock) {
	t.Helper()
	store := newMemoryStore()
	clock := &testClock{at: time.Date(2026, 10, 20, 9, 0, 0, 0, time.UTC)}
	store.now = clock.now
	s, err := New(store, store, testPolicy(), clock.now)
	if err != nil {
		t.Fatal(err)
	}
	return s, store, clock
}
func issue(t *testing.T, s *Service, owner string) (Metadata, string) {
	t.Helper()
	m, secret, err := s.Issue(context.Background(), owner, " Test ", []string{"repo:read:public"})
	if err != nil {
		t.Fatal(err)
	}
	raw, err := secret.Take()
	if err != nil {
		t.Fatal(err)
	}
	return m, raw
}
func execute(s *Service, raw, id string) (int, error) {
	return s.Execute(context.Background(), raw, "public-search", id, func(context.Context) (int, error) { return 200, nil })
}

func TestIssueListRevokeAndOwnerIsolation(t *testing.T) {
	s, store, clock := setup(t)
	metadata, raw := issue(t, s, "owner-a")
	if metadata.Name != "Test" || metadata.Prefix != Prefix+metadata.Selector+"." || !metadata.ExpiresAt.Equal(clock.now().Add(time.Hour)) {
		t.Fatal("metadata")
	}
	rows, err := s.List(context.Background(), "owner-a")
	if err != nil || len(rows) != 1 {
		t.Fatal(err)
	}
	data, _ := json.Marshal(rows)
	digest := store.keys[metadata.Selector].Verifier.Bytes()
	if strings.Contains(string(data), raw) || strings.Contains(string(data), hex.EncodeToString(digest[:])) {
		t.Fatal("list revealed private material")
	}
	rows[0].Scopes[0] = "modified"
	again, _ := s.List(context.Background(), "owner-a")
	if again[0].Scopes[0] != "repo:read:public" {
		t.Fatal("caller altered stored scopes")
	}
	foreign, err := s.List(context.Background(), "owner-b")
	if err != nil || len(foreign) != 0 {
		t.Fatal("foreign list")
	}
	if err := s.Revoke(context.Background(), "owner-b", metadata.Selector); err != nil {
		t.Fatal(err)
	}
	if _, err := execute(s, raw, "before-own-revoke"); err != nil {
		t.Fatal("foreign revoke affected owner")
	}
	if _, _, err := s.Issue(context.Background(), "", "Test", []string{"repo:read:public"}); err != ErrOwner {
		t.Fatal(err)
	}
	if _, err := s.List(context.Background(), ""); err != ErrOwner {
		t.Fatal(err)
	}
	if err := s.Revoke(context.Background(), "", metadata.Selector); err != ErrOwner {
		t.Fatal(err)
	}
	for range 2 {
		if err := s.Revoke(context.Background(), "owner-a", metadata.Selector); err != nil {
			t.Fatal(err)
		}
	}
	second, err := New(store, store, testPolicy(), clock.now)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := execute(second, raw, "after-revoke"); err != ErrDenied {
		t.Fatal("another instance accepted revocation")
	}
}

func TestIssueFailureNeverRevealsOrRetriesAmbiguousWrite(t *testing.T) {
	for _, ambiguous := range []bool{false, true} {
		t.Run(fmt.Sprint(ambiguous), func(t *testing.T) {
			s, store, _ := setup(t)
			store.ambiguousCreate = ambiguous
			if !ambiguous {
				store.createErr = errors.New("sensitive database details")
			}
			_, secret, err := s.Issue(context.Background(), "owner-a", "Test", []string{"repo:read:public"})
			if err != ErrUnavailable || secret != nil || store.createCalls != 1 {
				t.Fatal("ambiguous write retried/revealed")
			}
			rows, _ := s.List(context.Background(), "owner-a")
			if ambiguous && len(rows) != 1 {
				t.Fatal("lost ambiguous metadata")
			}
		})
	}
	s, store, _ := setup(t)
	s.generate = func() (Material, error) { return Material{}, errors.New("sensitive entropy details") }
	if _, secret, err := s.Issue(context.Background(), "a", "Test", []string{"repo:read:public"}); err != ErrEntropy || secret != nil || store.createCalls != 0 {
		t.Fatal("entropy failure wrote")
	}
	s, store, _ = setup(t)
	store.createErr = ErrCollision
	if _, secret, err := s.Issue(context.Background(), "a", "Test", []string{"repo:read:public"}); err != ErrUnavailable || secret != nil || store.createCalls != 3 {
		t.Fatal("collision cap")
	}
}

func TestPolicyAndIssueInputAreExplicit(t *testing.T) {
	s, store, clock := setup(t)
	for _, mutate := range []func(*Policy){
		func(p *Policy) { p.PerKey = 0 }, func(p *Policy) { p.PerOwner = 0 }, func(p *Policy) { p.MaxActive = 0 }, func(p *Policy) { p.MaxNameRunes = 0 }, func(p *Policy) { p.Lifetime = 0 }, func(p *Policy) { p.Window = 0 }, func(p *Policy) { p.CompletionTimeout = 0 }, func(p *Policy) { p.CompletionTimeout = 11 * time.Second }, func(p *Policy) { p.ChargeMode = "" }, func(p *Policy) { p.Endpoints = nil }, func(p *Policy) { p.Endpoints = map[string]string{"https://visitor.test": "scope"} },
	} {
		p := testPolicy()
		mutate(&p)
		if _, err := New(store, store, p, clock.now); err != ErrPolicy {
			t.Fatal("invalid policy accepted")
		}
	}
	p := testPolicy()
	instance, err := New(store, store, p, clock.now)
	if err != nil {
		t.Fatal(err)
	}
	p.Endpoints["private-search"] = "repo:read:private"
	if _, _, err := instance.Issue(context.Background(), "owner", "Test", []string{"repo:read:private"}); err != ErrInput {
		t.Fatal("policy map remained mutable")
	}
	for _, name := range []string{" ", strings.Repeat("x", 41), string([]byte{0xff})} {
		if _, _, err := s.Issue(context.Background(), "a", name, []string{"repo:read:public"}); err != ErrInput {
			t.Fatal("bad name")
		}
	}
	for _, scopes := range [][]string{nil, {"private"}, {"repo:read:public", "repo:read:public"}} {
		if _, _, err := s.Issue(context.Background(), "a", "Test", scopes); err != ErrInput {
			t.Fatal("bad scopes")
		}
	}
}

func TestDenialsNeverInvokeUpstream(t *testing.T) {
	for _, kind := range []string{"malformed", "digest", "unknown", "wrong-secret", "expired", "exact-expiry", "revoked", "scope", "unsupported", "lookup-failure", "reserve-failure", "revoke-between-lookup-reserve", "expiry-between-lookup-reserve", "scope-between-lookup-reserve"} {
		t.Run(kind, func(t *testing.T) {
			s, store, clock := setup(t)
			m, raw := issue(t, s, "a")
			endpoint := "public-search"
			switch kind {
			case "malformed":
				raw = "Bearer " + raw
			case "wrong-secret":
				i := len(Prefix) + 17
				replacement := "A"
				if raw[i] == 'A' {
					replacement = "B"
				}
				raw = raw[:i] + replacement + raw[i+1:]
			case "digest":
				d := store.keys[m.Selector].Verifier.Bytes()
				raw = hex.EncodeToString(d[:])
			case "unknown":
				_, raw = issue(t, s, "other")
				delete(store.keys, strings.Split(strings.TrimPrefix(raw, Prefix), ".")[0])
			case "expired":
				clock.add(time.Hour + time.Nanosecond)
			case "exact-expiry":
				clock.add(time.Hour)
			case "revoked":
				_ = s.Revoke(context.Background(), "a", m.Selector)
			case "scope":
				r := store.keys[m.Selector]
				r.Scopes = []string{"other"}
				store.keys[m.Selector] = r
			case "unsupported":
				endpoint = "private-search"
			case "lookup-failure":
				store.lookupErr = errors.New("sensitive storage")
			case "reserve-failure":
				store.reserveErr = errors.New("sensitive storage")
			case "revoke-between-lookup-reserve":
				store.beforeReserve = func() { _ = s.Revoke(context.Background(), "a", m.Selector) }
			case "expiry-between-lookup-reserve":
				store.beforeReserve = func() { clock.add(time.Hour) }
			case "scope-between-lookup-reserve":
				store.beforeReserve = func() {
					store.mu.Lock()
					defer store.mu.Unlock()
					r := store.keys[m.Selector]
					r.Scopes = nil
					store.keys[m.Selector] = r
				}
			}
			calls := 0
			_, err := s.Execute(context.Background(), raw, endpoint, "request", func(context.Context) (int, error) { calls++; return 200, nil })
			if err == nil || calls != 0 || len(store.events) != 0 {
				t.Fatal("denied request admitted")
			}
			if strings.Contains(err.Error(), "sensitive") {
				t.Fatal("storage payload leaked")
			}
		})
	}
}

func TestConcurrentPerKeyAndOwnerLimitsAcrossInstances(t *testing.T) {
	for _, kind := range []string{"key", "owner"} {
		t.Run(kind, func(t *testing.T) {
			s, store, clock := setup(t)
			p := testPolicy()
			p.PerKey = 7
			p.PerOwner = 9
			first, _ := New(store, store, p, clock.now)
			second, _ := New(store, store, p, clock.now)
			_, rawA := issue(t, s, "owner-a")
			_, rawB := issue(t, s, "owner-a")
			var admitted atomic.Int32
			var wg sync.WaitGroup
			for i := range 80 {
				wg.Go(func() {
					service := first
					if i%2 == 0 {
						service = second
					}
					raw := rawA
					if kind == "owner" && i%2 == 0 {
						raw = rawB
					}
					_, err := service.Execute(context.Background(), raw, "public-search", fmt.Sprintf("parallel-%d", i), func(context.Context) (int, error) { admitted.Add(1); return 200, nil })
					if err != nil && err != ErrLimit {
						t.Error(err)
					}
				})
			}
			wg.Wait()
			want := int32(7)
			if kind == "owner" {
				want = 9
			}
			if admitted.Load() != want || len(store.events) != int(want) {
				t.Fatalf("admitted %d want %d", admitted.Load(), want)
			}
			_, rawOther := issue(t, s, "owner-b")
			if _, err := execute(first, rawOther, "other-owner"); err != nil {
				t.Fatal("unrelated owner blocked")
			}
			clock.add(time.Minute)
			if _, err := execute(first, rawA, "next-window"); err != nil {
				t.Fatal("window did not reset")
			}
		})
	}
}

func TestConcurrentActiveKeyLimitAndReclaimedSlot(t *testing.T) {
	s, store, clock := setup(t)
	p := testPolicy()
	p.MaxActive = 2
	first, _ := New(store, store, p, clock.now)
	second, _ := New(store, store, p, clock.now)
	var admitted atomic.Int32
	var wg sync.WaitGroup
	for i := range 30 {
		wg.Go(func() {
			service := first
			if i%2 == 0 {
				service = second
			}
			_, secret, err := service.Issue(context.Background(), "a", "Test", []string{"repo:read:public"})
			if err == nil {
				if secret == nil {
					t.Error("missing reveal")
				}
				admitted.Add(1)
			} else if err != ErrActiveLimit {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if admitted.Load() != 2 {
		t.Fatalf("created %d", admitted.Load())
	}
	rows, _ := s.List(context.Background(), "a")
	if err := first.Revoke(context.Background(), "a", rows[0].Selector); err != nil {
		t.Fatal(err)
	}
	if _, _, err := second.Issue(context.Background(), "a", "replacement", []string{"repo:read:public"}); err != nil {
		t.Fatal("revocation did not free slot")
	}
	clock.add(time.Hour)
	if _, _, err := second.Issue(context.Background(), "a", "after expiry", []string{"repo:read:public"}); err != nil {
		t.Fatal("expiry did not free slots")
	}
}

func TestDenialDoesNotPartiallySpendOwnerQuotaAndWindowBoundary(t *testing.T) {
	_, store, clock := setup(t)
	p := testPolicy()
	p.PerKey = 1
	p.PerOwner = 2
	s, _ := New(store, store, p, clock.now)
	_, rawA := issue(t, s, "owner")
	_, rawB := issue(t, s, "owner")
	if _, err := execute(s, rawA, "first"); err != nil {
		t.Fatal(err)
	}
	if _, err := execute(s, rawA, "key-denied"); err != ErrLimit {
		t.Fatal(err)
	}
	if _, err := execute(s, rawB, "second"); err != nil {
		t.Fatal("denial partially spent owner quota")
	}
	clock.add(time.Minute - time.Nanosecond)
	if _, err := execute(s, rawB, "before-boundary"); err != ErrLimit {
		t.Fatal(err)
	}
	clock.add(time.Nanosecond)
	if _, err := execute(s, rawA, "at-boundary"); err != nil {
		t.Fatal(err)
	}
	if len(store.events) != 3 {
		t.Fatal("denials wrote attempts")
	}
}

func TestRequestReplayAndCompletionIdempotency(t *testing.T) {
	s, store, _ := setup(t)
	_, raw := issue(t, s, "a")
	var calls atomic.Int32
	var wg sync.WaitGroup
	for range 30 {
		wg.Go(func() {
			_, err := s.Execute(context.Background(), raw, "public-search", "same", func(context.Context) (int, error) { calls.Add(1); return 200, nil })
			if err != nil && err != ErrReplay {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if calls.Load() != 1 || len(store.events) != 1 {
		t.Fatal("replay double spent/executed")
	}
	e := store.events["same"]
	completion := *e.completion
	if err := store.Complete(context.Background(), completion); err != nil {
		t.Fatal("identical completion rejected")
	}
	completion.Status = 201
	if err := store.Complete(context.Background(), completion); err == nil {
		t.Fatal("conflicting completion accepted")
	}
	completion = *e.completion
	completion.Reservation.Owner = "foreign"
	if err := store.Complete(context.Background(), completion); err == nil {
		t.Fatal("foreign completion accepted")
	}
	completion = *e.completion
	completion.Reservation.RequestID = "unknown"
	if err := store.Complete(context.Background(), completion); err == nil {
		t.Fatal("unknown completion accepted")
	}
	_, other := issue(t, s, "b")
	if _, err := execute(s, other, "same"); err != ErrReplay {
		t.Fatal("rebound request ID accepted")
	}
}

func TestFailuresCancellationAndRetryableCompletion(t *testing.T) {
	for _, kind := range []string{"upstream-error", "upstream-status", "cancel-before", "cancel-before-reserve", "cancel-after-reserve", "cancel-in-work", "completion-failure", "ambiguous-reserve", "panic"} {
		t.Run(kind, func(t *testing.T) {
			s, store, _ := setup(t)
			_, raw := issue(t, s, "a")
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			if kind == "cancel-before" {
				cancel()
			}
			if kind == "cancel-before-reserve" {
				store.beforeReserve = func() { cancel() }
			}
			if kind == "cancel-after-reserve" {
				store.cancelAfterReserve = cancel
			}
			if kind == "completion-failure" {
				store.completeErr = errors.New("sensitive storage details")
			}
			if kind == "ambiguous-reserve" {
				store.ambiguousReserve = true
			}
			calls := 0
			var gotErr error
			panicked := false
			func() {
				defer func() { panicked = recover() != nil }()
				_, gotErr = s.Execute(ctx, raw, "public-search", "request", func(context.Context) (int, error) {
					calls++
					switch kind {
					case "upstream-error":
						return 502, errors.New("sensitive upstream details")
					case "upstream-status":
						return 503, nil
					case "cancel-in-work":
						cancel()
						return 200, nil
					case "panic":
						panic("synthetic callback panic")
					}
					return 200, nil
				})
			}()
			if kind == "panic" {
				if panicked || gotErr != ErrUpstream || store.events["request"].completion == nil {
					t.Fatal("panic lost accounting")
				}
				return
			}
			if gotErr == nil {
				t.Fatal("failure returned success")
			}
			if strings.Contains(gotErr.Error(), "sensitive") {
				t.Fatal("payload leaked")
			}
			if kind == "cancel-before" || kind == "cancel-before-reserve" {
				if calls != 0 || len(store.events) != 0 {
					t.Fatal("cancelled request admitted")
				}
				return
			}
			if kind == "cancel-after-reserve" {
				if calls != 0 || len(store.events) != 1 || store.events["request"].completion == nil || store.events["request"].completion.Outcome != "cancelled" {
					t.Fatal("post-reservation cancellation lost attempt or invoked work")
				}
			}
			if kind == "ambiguous-reserve" {
				if calls != 0 || len(store.events) != 1 {
					t.Fatal("ambiguous admission")
				}
				store.ambiguousReserve = false
				if _, err := execute(s, raw, "request"); err != ErrReplay {
					t.Fatal("ambiguous reservation charged twice")
				}
				return
			}
			if !store.completionHasDeadline || store.completionContextError != nil {
				t.Fatal("completion did not use bounded uncancelled context")
			}
			if kind == "completion-failure" {
				var completionErr *CompletionError
				if !errors.As(gotErr, &completionErr) || !errors.Is(gotErr, ErrAccounting) {
					t.Fatal("completion cannot be recovered")
				}
				store.completeErr = nil
				if err := store.Complete(context.Background(), completionErr.Completion); err != nil {
					t.Fatal(err)
				}
				if err := store.Complete(context.Background(), completionErr.Completion); err != nil {
					t.Fatal("completion retry not idempotent")
				}
			}
			e := store.events["request"]
			if e.completion == nil {
				t.Fatal("missing completion")
			}
			if kind == "cancel-in-work" && e.completion.Outcome != "cancelled" {
				t.Fatal("cancellation hidden")
			}
			if (kind == "upstream-error" || kind == "upstream-status") && e.completion.Outcome != "failure" {
				t.Fatal("failure hidden")
			}
		})
	}
}

func TestPanicAndFailedCompletionReturnsExactRecovery(t *testing.T) {
	s, store, _ := setup(t)
	_, raw := issue(t, s, "owner")
	store.completeErr = errors.New("sensitive storage details")
	var recovered any
	var gotErr error
	status, calls := 0, 0
	func() {
		defer func() { recovered = recover() }()
		status, gotErr = s.Execute(context.Background(), raw, "public-search", "panic-and-accounting", func(context.Context) (int, error) { calls++; panic(raw) })
	}()
	if recovered != nil {
		t.Fatal("callback panic escaped instead of yielding recovery record")
	}
	var completionErr *CompletionError
	if status != 500 || !errors.As(gotErr, &completionErr) || !errors.Is(gotErr, ErrAccounting) {
		t.Fatal("missing typed completion recovery")
	}
	if strings.Contains(gotErr.Error(), raw) {
		t.Fatal("panic credential leaked")
	}
	store.completeErr = nil
	for range 2 {
		if err := store.Complete(context.Background(), completionErr.Completion); err != nil {
			t.Fatal(err)
		}
	}
	if calls != 1 || len(store.events) != 1 || store.events["panic-and-accounting"].completion.Outcome != "failure" {
		t.Fatal("recovery reexecuted or changed outcome")
	}
}

func TestNilPanicFailsClosed(t *testing.T) {
	for _, mode := range []string{"0", "1"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("GODEBUG", "panicnil="+mode)
			s, store, _ := setup(t)
			_, raw := issue(t, s, "owner")
			status, err := s.Execute(context.Background(), raw, "public-search", "nil-panic", func(context.Context) (int, error) { panic(nil) })
			if status != 500 || err != ErrUpstream || store.events["nil-panic"].completion == nil || store.events["nil-panic"].completion.Outcome != "failure" {
				t.Fatal("nil panic reported success or lost accounting")
			}
		})
	}
}

func TestCompletionAmbiguityAndDeadlineRecoverWithoutRepeatingWork(t *testing.T) {
	for _, kind := range []string{"committed-response-failed", "deadline"} {
		t.Run(kind, func(t *testing.T) {
			_, store, clock := setup(t)
			p := testPolicy()
			p.CompletionTimeout = time.Millisecond
			s, _ := New(store, store, p, clock.now)
			_, raw := issue(t, s, "owner")
			if kind == "deadline" {
				store.waitForCompletionDeadline = true
			} else {
				store.ambiguousComplete = true
			}
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			calls := 0
			_, err := s.Execute(ctx, raw, "public-search", "completion-recovery", func(context.Context) (int, error) {
				calls++
				if kind == "deadline" {
					cancel()
				}
				return 200, nil
			})
			var completionErr *CompletionError
			if !errors.As(err, &completionErr) {
				t.Fatal("failure returned no recovery record")
			}
			if kind == "deadline" && (!store.completionDeadlineObserved || store.completionContextError != nil) {
				t.Fatal("completion did not detach cancellation and exhaust its own deadline")
			}
			if kind == "committed-response-failed" && store.events["completion-recovery"].completion == nil {
				t.Fatal("ambiguous completion did not commit")
			}
			store.waitForCompletionDeadline = false
			store.ambiguousComplete = false
			for range 2 {
				if err := store.Complete(context.Background(), completionErr.Completion); err != nil {
					t.Fatal(err)
				}
			}
			if _, err := execute(s, raw, "completion-recovery"); err != ErrReplay || calls != 1 || len(store.events) != 1 {
				t.Fatal("completion recovery repeated upstream or accounting")
			}
		})
	}
}
