package apikey

// Test-only conformance model, deliberately absent from production builds.
// A future database adapter must prove the same atomicity/isolation behavior.
import (
	"context"
	"errors"
	"reflect"
	"slices"
	"sync"
	"time"
)

type counterKey struct {
	kind, id string
	bucket   int64
	window   time.Duration
}
type event struct {
	reservation Reservation
	completion  *Completion
}
type memoryStore struct {
	mu                                                    sync.Mutex
	keys                                                  map[string]Record
	counts                                                map[counterKey]int
	events                                                map[string]event
	createCalls, lookupCalls, reserveCalls, completeCalls int
	createErr, lookupErr, reserveErr, completeErr         error
	ambiguousCreate, ambiguousReserve                     bool
	ambiguousComplete, waitForCompletionDeadline          bool
	completionDeadlineObserved                            bool
	beforeReserve                                         func()
	completionHasDeadline                                 bool
	completionContextError                                error
	now                                                   func() time.Time
	cancelAfterReserve                                    context.CancelFunc
}

func newMemoryStore() *memoryStore {
	return &memoryStore{keys: map[string]Record{}, counts: map[counterKey]int{}, events: map[string]event{}, now: time.Now}
}
func (m *memoryStore) CreateOwned(ctx context.Context, record Record, maxActive int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.createCalls++
	if err := ctx.Err(); err != nil {
		return err
	}
	if m.createErr != nil {
		return m.createErr
	}
	if _, ok := m.keys[record.Selector]; ok {
		return ErrCollision
	}
	active := 0
	for _, key := range m.keys {
		if key.Verifier.Equal(record.Verifier) {
			return ErrCollision
		}
		if key.Owner == record.Owner && key.RevokedAt == nil && m.now().Before(key.ExpiresAt) {
			active++
		}
	}
	if active >= maxActive {
		return ErrActiveLimit
	}
	record.Metadata = copyMetadata(record.Metadata)
	m.keys[record.Selector] = record
	if m.ambiguousCreate {
		return errors.New("synthetic ambiguous write")
	}
	return nil
}
func (m *memoryStore) ListOwned(ctx context.Context, owner string) ([]Metadata, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	rows := []Metadata{}
	for _, key := range m.keys {
		if key.Owner == owner {
			rows = append(rows, copyMetadata(key.Metadata))
		}
	}
	slices.SortFunc(rows, func(a, b Metadata) int {
		if a.Selector < b.Selector {
			return -1
		}
		if a.Selector > b.Selector {
			return 1
		}
		return 0
	})
	return rows, nil
}
func (m *memoryStore) RevokeOwned(ctx context.Context, owner, selector string, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return err
	}
	if key, ok := m.keys[selector]; ok && key.Owner == owner && key.RevokedAt == nil {
		key.RevokedAt = &at
		m.keys[selector] = key
	}
	return nil // unknown/foreign keys are deliberately indistinguishable.
}
func (m *memoryStore) Lookup(ctx context.Context, selector string) (Record, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lookupCalls++
	if err := ctx.Err(); err != nil {
		return Record{}, err
	}
	if m.lookupErr != nil {
		return Record{}, m.lookupErr
	}
	key, ok := m.keys[selector]
	if !ok {
		return Record{}, ErrDenied
	}
	key.Metadata = copyMetadata(key.Metadata)
	return key, nil
}
func (m *memoryStore) Reserve(ctx context.Context, attempt Attempt) (Reservation, error) {
	if m.beforeReserve != nil {
		m.beforeReserve()
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.reserveCalls++
	if err := ctx.Err(); err != nil {
		return Reservation{}, err
	}
	if m.reserveErr != nil {
		return Reservation{}, m.reserveErr
	}
	at := m.now().UTC()
	key, ok := m.keys[attempt.Selector]
	if !ok || !key.Verifier.Equal(attempt.Verifier) || key.RevokedAt != nil || !at.Before(key.ExpiresAt) || !slices.Contains(key.Scopes, attempt.Scope) {
		return Reservation{}, ErrDenied
	}
	if _, ok := m.events[attempt.RequestID]; ok {
		return Reservation{}, ErrReplay
	}
	if attempt.Window <= 0 || attempt.PerKey <= 0 || attempt.PerOwner <= 0 {
		return Reservation{}, ErrPolicy
	}
	bucket := at.UnixNano() / int64(attempt.Window)
	perKey := counterKey{"key", attempt.Selector, bucket, attempt.Window}
	perOwner := counterKey{"owner", key.Owner, bucket, attempt.Window}
	if m.counts[perKey] >= attempt.PerKey || m.counts[perOwner] >= attempt.PerOwner {
		return Reservation{}, ErrLimit
	}
	reservation := Reservation{attempt.RequestID, attempt.Selector, key.Owner, attempt.Endpoint, at}
	// The mutex models one transaction: neither counter can commit alone, and
	// no reservation is returned unless the attempt record exists too.
	m.counts[perKey]++
	m.counts[perOwner]++
	m.events[attempt.RequestID] = event{reservation: reservation}
	if m.cancelAfterReserve != nil {
		m.cancelAfterReserve()
	}
	if m.ambiguousReserve {
		return Reservation{}, errors.New("synthetic ambiguous reservation")
	}
	return reservation, nil
}
func (m *memoryStore) Complete(ctx context.Context, completion Completion) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.completeCalls++
	_, m.completionHasDeadline = ctx.Deadline()
	m.completionContextError = ctx.Err()
	if err := ctx.Err(); err != nil {
		return err
	}
	if m.completeErr != nil {
		return m.completeErr
	}
	if m.waitForCompletionDeadline {
		select {
		case <-ctx.Done():
			m.completionDeadlineObserved = errors.Is(ctx.Err(), context.DeadlineExceeded)
			return ctx.Err()
		case <-time.After(time.Second):
			return errors.New("completion context did not expire")
		}
	}
	e, ok := m.events[completion.Reservation.RequestID]
	if !ok || e.reservation != completion.Reservation || completion.FinishedAt.Before(e.reservation.StartedAt) {
		return ErrDenied
	}
	if completion.Outcome != "success" && completion.Outcome != "failure" && completion.Outcome != "cancelled" {
		return ErrInput
	}
	if completion.Status < 100 || completion.Status > 599 {
		if completion.Status != 0 || completion.Outcome != "cancelled" {
			return ErrInput
		}
	}
	if e.completion != nil {
		if reflect.DeepEqual(*e.completion, completion) {
			return nil
		}
		return ErrReplay
	}
	e.completion = &completion
	m.events[e.reservation.RequestID] = e
	if m.ambiguousComplete {
		return errors.New("synthetic completion committed before response failure")
	}
	return nil
}
