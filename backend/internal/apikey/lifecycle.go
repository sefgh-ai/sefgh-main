package apikey

import (
	"context"
	"errors"
	"fmt"
	"io"
	"slices"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	ErrInput       = errors.New("invalid key lifecycle input")
	ErrOwner       = errors.New("verified owner required")
	ErrPolicy      = errors.New("explicit bounded key policy required")
	ErrUnavailable = errors.New("key storage unavailable")
	ErrDenied      = errors.New("API credential not authorized")
	ErrLimit       = errors.New("API quota exhausted")
	ErrReplay      = errors.New("request already reserved")
	ErrCollision   = errors.New("key selector already exists")
	ErrActiveLimit = errors.New("active key limit reached")
	ErrAccounting  = errors.New("usage completion not confirmed")
	ErrUpstream    = errors.New("upstream operation failed")
)

type Metadata struct {
	Selector  string     `json:"id"`
	Owner     string     `json:"owner_id"`
	Name      string     `json:"name"`
	Prefix    string     `json:"prefix"`
	Scopes    []string   `json:"scopes"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt time.Time  `json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at"`
}
type Record struct {
	Metadata
	Verifier Verifier `json:"-"`
}

func (r Record) Format(f fmt.State, _ rune) { _, _ = io.WriteString(f, "[API key record redacted]") }

// Management receives only a verified owner's identity from a future adapter.
// It is not the capability that may validate keys or write usage counters.
type Management interface {
	// CreateOwned atomically enforces selector uniqueness and per-owner active
	// key limits. A failed/ambiguous write must not return a saved secret.
	CreateOwned(context.Context, Record, int) error
	ListOwned(context.Context, string) ([]Metadata, error)
	RevokeOwned(context.Context, string, string, time.Time) error
}

type Attempt struct {
	Selector    string
	Verifier    Verifier `json:"-"`
	RequestID   string
	Endpoint    string
	Scope       string
	RequestedAt time.Time
	Window      time.Duration
	PerKey      int
	PerOwner    int
}
type Reservation struct {
	RequestID, Selector, Owner, Endpoint string
	StartedAt                            time.Time
}
type Completion struct {
	Reservation Reservation
	Outcome     string
	Status      int
	FinishedAt  time.Time
}

// A server recovery worker can retry this exact completion without repeating
// upstream work. Error text contains no storage/provider payload or credential.
type CompletionError struct{ Completion Completion }

func (e *CompletionError) Error() string { return ErrAccounting.Error() }
func (e *CompletionError) Unwrap() error { return ErrAccounting }

// Accounting is a server-only capability. Reserve must recheck digest, scope,
// expiry/revocation and BOTH limits while atomically recording an attempt. A
// repeated request ID never grants a second execution. Eligibility/window checks
// use the authoritative storage clock; RequestedAt is not authorization time.
// All instances share this capability and the approved policy configuration.
// Complete is an at-most-once transition: identical retries are idempotent;
// unknown or conflicting bindings/results fail without altering the event.
type Accounting interface {
	Lookup(context.Context, string) (Record, error)
	Reserve(context.Context, Attempt) (Reservation, error)
	Complete(context.Context, Completion) error
}

type Policy struct {
	MaxActive, MaxNameRunes, PerKey, PerOwner int
	Lifetime, Window, CompletionTimeout       time.Duration
	// The only implemented accounting mode spends an admitted attempt even on
	// failure/cancel. It must be selected explicitly, not used as a default.
	ChargeMode string
	// Server-controlled endpoint ID -> required scope; never arbitrary URLs.
	Endpoints map[string]string
}
type Service struct {
	management Management
	accounting Accounting
	policy     Policy
	now        func() time.Time
	generate   func() (Material, error)
}

func New(management Management, accounting Accounting, policy Policy, now func() time.Time) (*Service, error) {
	if management == nil || accounting == nil || policy.MaxActive < 1 || policy.MaxNameRunes < 1 || policy.PerKey < 1 || policy.PerOwner < 1 || policy.Lifetime <= 0 || policy.Window <= 0 || policy.CompletionTimeout <= 0 || policy.CompletionTimeout > 10*time.Second || policy.ChargeMode != "attempt" || len(policy.Endpoints) == 0 {
		return nil, ErrPolicy
	}
	endpoints := make(map[string]string, len(policy.Endpoints))
	for endpoint, scope := range policy.Endpoints {
		if !identifier(endpoint) || !identifier(scope) {
			return nil, ErrPolicy
		}
		endpoints[endpoint] = scope
	}
	policy.Endpoints = endpoints
	if now == nil {
		now = time.Now
	}
	return &Service{management, accounting, policy, now, Generate}, nil
}

func identifier(s string) bool {
	if len(s) < 1 || len(s) > 128 {
		return false
	}
	for _, c := range s {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '_' || c == '-' || c == ':') {
			return false
		}
	}
	return true
}
func copyMetadata(m Metadata) Metadata {
	m.Scopes = slices.Clone(m.Scopes)
	if m.RevokedAt != nil {
		at := *m.RevokedAt
		m.RevokedAt = &at
	}
	return m
}

// Issue uses a verified owner, not an owner ID from HTTP request JSON. There is
// intentionally no HTTP adapter in this batch. A secret is returned only after
// CreateOwned succeeds; no ambiguous-write retry can recover its plaintext.
func (s *Service) Issue(ctx context.Context, owner, name string, scopes []string) (Metadata, *Secret, error) {
	if owner == "" {
		return Metadata{}, nil, ErrOwner
	}
	if err := ctx.Err(); err != nil {
		return Metadata{}, nil, err
	}
	name = strings.TrimSpace(name)
	if !utf8.ValidString(name) || name == "" || utf8.RuneCountInString(name) > s.policy.MaxNameRunes || len(scopes) == 0 {
		return Metadata{}, nil, ErrInput
	}
	allowed := map[string]bool{}
	for _, scope := range s.policy.Endpoints {
		allowed[scope] = true
	}
	seen := map[string]bool{}
	for _, scope := range scopes {
		if !allowed[scope] || seen[scope] {
			return Metadata{}, nil, ErrInput
		}
		seen[scope] = true
	}
	for range 3 {
		material, err := s.generate()
		if err != nil {
			return Metadata{}, nil, ErrEntropy
		}
		at := s.now().UTC()
		metadata := Metadata{material.Selector, owner, name, Prefix + material.Selector + ".", slices.Clone(scopes), at, at.Add(s.policy.Lifetime), nil}
		err = s.management.CreateOwned(ctx, Record{copyMetadata(metadata), material.Verifier}, s.policy.MaxActive)
		if err == nil {
			return metadata, material.Secret, nil
		}
		if errors.Is(err, ErrCollision) {
			continue
		}
		if errors.Is(err, ErrActiveLimit) {
			return Metadata{}, nil, ErrActiveLimit
		}
		return Metadata{}, nil, ErrUnavailable
	}
	return Metadata{}, nil, ErrUnavailable
}
func (s *Service) List(ctx context.Context, owner string) ([]Metadata, error) {
	if owner == "" {
		return nil, ErrOwner
	}
	rows, err := s.management.ListOwned(ctx, owner)
	if err != nil {
		return nil, ErrUnavailable
	}
	result := make([]Metadata, 0, len(rows))
	for _, row := range rows {
		if row.Owner != owner {
			return nil, ErrUnavailable
		}
		result = append(result, copyMetadata(row))
	}
	return result, nil
}
func (s *Service) Revoke(ctx context.Context, owner, selector string) error {
	if owner == "" {
		return ErrOwner
	}
	if !identifier(selector) {
		return ErrInput
	}
	if err := s.management.RevokeOwned(ctx, owner, selector, s.now().UTC()); err != nil {
		return ErrUnavailable
	}
	return nil
}

// Execute admits a fixed server-controlled endpoint before invoking work. It
// passes no key, digest or owner credential upstream. Attempt charge policy is
// explicit; a completion failure returns ErrAccounting, never false success.
func (s *Service) Execute(ctx context.Context, raw, endpoint, requestID string, work func(context.Context) (int, error)) (status int, err error) {
	if err = ctx.Err(); err != nil {
		return 0, err
	}
	scope, ok := s.policy.Endpoints[endpoint]
	if !ok || !identifier(requestID) || work == nil {
		return 0, ErrDenied
	}
	presented, parseErr := Parse(raw)
	if parseErr != nil {
		return 0, ErrDenied
	}
	key, lookupErr := s.accounting.Lookup(ctx, presented.Selector)
	if lookupErr != nil {
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}
		if errors.Is(lookupErr, ErrDenied) {
			return 0, ErrDenied
		}
		return 0, ErrUnavailable
	}
	at := s.now().UTC()
	if key.Selector != presented.Selector || key.Owner == "" || !key.Verifier.Equal(presented.Verifier) || key.RevokedAt != nil || !at.Before(key.ExpiresAt) || !slices.Contains(key.Scopes, scope) {
		return 0, ErrDenied
	}
	reservation, reserveErr := s.accounting.Reserve(ctx, Attempt{presented.Selector, presented.Verifier, requestID, endpoint, scope, at, s.policy.Window, s.policy.PerKey, s.policy.PerOwner})
	if reserveErr != nil {
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}
		for _, known := range []error{ErrDenied, ErrLimit, ErrReplay} {
			if errors.Is(reserveErr, known) {
				return 0, known
			}
		}
		return 0, ErrUnavailable
	}
	if reservation.RequestID != requestID || reservation.Selector != key.Selector || reservation.Owner != key.Owner || reservation.Endpoint != endpoint || reservation.StartedAt.IsZero() {
		return 0, ErrUnavailable
	}
	completion := Completion{Reservation: reservation, Outcome: "failure", Status: 500}
	workStarted, workReturned := false, false
	defer func() {
		_ = recover()
		if workStarted && !workReturned {
			// A callback panic is an internal failure, never a credential/error
			// payload. Return normally so a failed completion can carry recovery.
			completion.Outcome = "failure"
			completion.Status = 500
			status = 500
			err = ErrUpstream
		}
		completion.FinishedAt = s.now().UTC()
		if completion.FinishedAt.Before(reservation.StartedAt) {
			completion.FinishedAt = reservation.StartedAt
		}
		completionCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), s.policy.CompletionTimeout)
		defer cancel()
		if completeErr := s.accounting.Complete(completionCtx, completion); completeErr != nil {
			err = &CompletionError{completion}
		}
	}()
	if err = ctx.Err(); err != nil {
		completion.Outcome = "cancelled"
		completion.Status = 0
		return 0, err
	}
	workStarted = true
	status, err = work(ctx)
	workReturned = true
	completion.Status = status
	if status < 100 || status > 599 {
		completion.Status = 500
		err = ErrUpstream
	}
	if ctx.Err() != nil {
		completion.Outcome = "cancelled"
		err = ctx.Err()
	} else if err != nil || status < 200 || status >= 400 {
		completion.Outcome = "failure"
		err = ErrUpstream
	} else {
		completion.Outcome = "success"
	}
	return status, err
}
