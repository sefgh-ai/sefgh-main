package apikey

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
	"time"
)

// RPCAccounting has only server accounting capabilities. The role JWT must be
// provisioned separately; it is not an anon, user, or service-role credential.
// PostgREST verifies that JWT and SQL grants enforce its authority. This adapter
// never mints JWTs or falls back to another credential.
type RPCAccounting struct {
	client           *RPCClient
	bearer, revision string
	policy           Policy
}
type PendingAttempt struct {
	Reservation Reservation
	Receipt     *Completion
}
type PendingCursor struct {
	StartedAt time.Time
	RequestID string
}
type PendingPage struct {
	Items []PendingAttempt `json:"items"`
	Next  *PendingCursor   `json:"next"`
}
type rpcPolicy struct {
	Revision          string            `json:"revision"`
	Enabled           bool              `json:"enabled"`
	MaxActive         int               `json:"max_active"`
	MaxNameRunes      int               `json:"max_name_runes"`
	PerKey            int               `json:"per_key"`
	PerOwner          int               `json:"per_owner"`
	Lifetime          int               `json:"lifetime_seconds"`
	Window            int               `json:"window_seconds"`
	CompletionTimeout int               `json:"completion_timeout_seconds"`
	ChargeMode        string            `json:"charge_mode"`
	Endpoints         map[string]string `json:"endpoints"`
}

func (a RPCAccounting) Format(f fmt.State, _ rune) {
	_, _ = io.WriteString(f, "[accounting RPC redacted]")
}
func (a RPCAccounting) MarshalJSON() ([]byte, error) { return nil, ErrUnavailable }

func (c *RPCClient) OpenAccounting(ctx context.Context, bearer string) (*RPCAccounting, error) {
	if bearer == "" || len(bearer) > 8192 || strings.ContainsAny(bearer, " \r\n\t") || strings.HasPrefix(bearer, "sk_") {
		return nil, ErrPolicy
	}
	var p rpcPolicy
	if err := c.call(ctx, bearer, "sefgh_key_policy", struct{}{}, &p); err != nil {
		return nil, ErrUnavailable
	}
	if !p.Enabled || !identifier(p.Revision) || len(p.Revision) > 64 || strings.Contains(p.Revision, ":") || p.MaxActive < 1 || p.MaxActive > 1000 || p.MaxNameRunes < 1 || p.MaxNameRunes > 200 || p.PerKey < 1 || p.PerKey > 1000000 || p.PerOwner < 1 || p.PerOwner > 1000000 || p.Lifetime < 1 || p.Lifetime > 31536000 || p.Window < 1 || p.Window > 86400 || p.CompletionTimeout < 1 || p.CompletionTimeout > 10 || p.ChargeMode != "attempt" || len(p.Endpoints) != 1 || p.Endpoints["public-search"] != "repo:read:public" {
		return nil, ErrPolicy
	}
	policy := Policy{p.MaxActive, p.MaxNameRunes, p.PerKey, p.PerOwner, time.Duration(p.Lifetime) * time.Second, time.Duration(p.Window) * time.Second, time.Duration(p.CompletionTimeout) * time.Second, p.ChargeMode, map[string]string{"public-search": "repo:read:public"}}
	return &RPCAccounting{c, bearer, p.Revision, policy}, nil
}
func (a *RPCAccounting) Executor(now func() time.Time) (*Service, error) {
	if a == nil {
		return nil, ErrPolicy
	}
	return NewExecutor(a, a.policy, now)
}
func (a *RPCAccounting) Lookup(ctx context.Context, selector string) (Record, error) {
	if a == nil {
		return Record{}, ErrUnavailable
	}
	if !canonicalSelector(selector) {
		return Record{}, ErrDenied
	}
	var reply struct {
		Metadata
		VerifierHex string `json:"verifier_hex"`
	}
	if err := a.client.call(ctx, a.bearer, "sefgh_key_lookup", map[string]string{"p_selector": selector}, &reply); err != nil {
		return Record{}, err
	}
	digest, err := hex.DecodeString(reply.VerifierHex)
	if err != nil || hex.EncodeToString(digest) != reply.VerifierHex || reply.Selector != selector || !validMetadata(reply.Metadata, "") {
		return Record{}, ErrUnavailable
	}
	verifier, err := RestoreVerifier(digest)
	if err != nil {
		return Record{}, ErrUnavailable
	}
	return Record{copyMetadata(reply.Metadata), verifier}, nil
}
func (a *RPCAccounting) Reserve(ctx context.Context, attempt Attempt) (Reservation, error) {
	if a == nil {
		return Reservation{}, ErrUnavailable
	}
	if attempt.Scope != a.policy.Endpoints[attempt.Endpoint] || attempt.Scope == "" || attempt.Window != a.policy.Window || attempt.PerKey != a.policy.PerKey || attempt.PerOwner != a.policy.PerOwner {
		return Reservation{}, ErrPolicy
	}
	if !canonicalSelector(attempt.Selector) || !identifier(attempt.RequestID) {
		return Reservation{}, ErrDenied
	}
	digest := attempt.Verifier.Bytes()
	if _, err := RestoreVerifier(digest[:]); err != nil {
		return Reservation{}, ErrDenied
	}
	args := map[string]string{"p_selector": attempt.Selector, "p_verifier_hex": hex.EncodeToString(digest[:]), "p_request_id": attempt.RequestID, "p_endpoint": attempt.Endpoint, "p_revision": a.revision}
	var reservation Reservation
	if err := a.client.call(ctx, a.bearer, "sefgh_key_reserve", args, &reservation); err != nil {
		return Reservation{}, err
	}
	if !validReservation(reservation) || reservation.RequestID != attempt.RequestID || reservation.Selector != attempt.Selector || reservation.Endpoint != attempt.Endpoint {
		return Reservation{}, ErrUnavailable
	}
	return reservation, nil
}
func validReservation(r Reservation) bool {
	return identifier(r.RequestID) && canonicalSelector(r.Selector) && ownerUUID(r.Owner) && r.Endpoint == "public-search" && !r.StartedAt.IsZero()
}
func validCompletion(c Completion) bool {
	if !validReservation(c.Reservation) || c.FinishedAt.IsZero() || c.FinishedAt.Before(c.Reservation.StartedAt) {
		return false
	}
	switch c.Outcome {
	case "success":
		return c.Status >= 200 && c.Status < 400
	case "failure":
		return c.Status >= 100 && c.Status <= 599
	case "cancelled":
		return c.Status == 0 || c.Status >= 100 && c.Status <= 599
	}
	return false
}
func (a *RPCAccounting) complete(ctx context.Context, name string, receipt Completion) error {
	if a == nil {
		return ErrUnavailable
	}
	if !validCompletion(receipt) {
		return ErrAccounting
	}
	return a.client.call(ctx, a.bearer, name, map[string]Completion{"p_receipt": receipt}, nil)
}
func (a *RPCAccounting) Complete(ctx context.Context, receipt Completion) error {
	return a.complete(ctx, "sefgh_key_complete", receipt)
}
func (a *RPCAccounting) SaveRecovery(ctx context.Context, receipt Completion) error {
	return a.complete(ctx, "sefgh_key_recovery", receipt)
}

// Pending discovers process-death/lost-receipt attempts too. A missing receipt is
// unknown, not proof of provider failure or permission to repeat provider work.
func (a *RPCAccounting) Pending(ctx context.Context, after *PendingCursor) (PendingPage, error) {
	if a == nil {
		return PendingPage{}, ErrUnavailable
	}
	args := map[string]any{"p_after_started": nil, "p_after_request": nil}
	if after != nil {
		if after.StartedAt.IsZero() || !identifier(after.RequestID) {
			return PendingPage{}, ErrInput
		}
		args["p_after_started"] = after.StartedAt
		args["p_after_request"] = after.RequestID
	}
	var page PendingPage
	if err := a.client.call(ctx, a.bearer, "sefgh_key_pending", args, &page); err != nil {
		return PendingPage{}, err
	}
	if page.Items == nil || len(page.Items) > 100 {
		return PendingPage{}, ErrUnavailable
	}
	seen := map[string]bool{}
	for _, row := range page.Items {
		if !validReservation(row.Reservation) || seen[row.Reservation.RequestID] {
			return PendingPage{}, ErrUnavailable
		}
		if after != nil && !(row.Reservation.StartedAt.After(after.StartedAt) || row.Reservation.StartedAt.Equal(after.StartedAt) && row.Reservation.RequestID > after.RequestID) {
			return PendingPage{}, ErrUnavailable
		}
		after = &PendingCursor{row.Reservation.StartedAt, row.Reservation.RequestID}
		seen[row.Reservation.RequestID] = true
		if row.Receipt != nil && (!validCompletion(*row.Receipt) || !sameReservation(row.Receipt.Reservation, row.Reservation)) {
			return PendingPage{}, ErrUnavailable
		}
	}
	if page.Next != nil && (len(page.Items) != 100 || after == nil || !page.Next.StartedAt.Equal(after.StartedAt) || page.Next.RequestID != after.RequestID) {
		return PendingPage{}, ErrUnavailable
	}
	return page, nil
}

func sameReservation(a, b Reservation) bool {
	return a.RequestID == b.RequestID && a.Selector == b.Selector && a.Owner == b.Owner && a.Endpoint == b.Endpoint && a.StartedAt.Equal(b.StartedAt)
}
