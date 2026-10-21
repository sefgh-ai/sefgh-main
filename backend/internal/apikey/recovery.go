package apikey

import (
	"context"
	"time"
)

// CompletionRecovery cannot reserve quota, issue keys, or call a provider.
type CompletionRecovery interface {
	Pending(context.Context, *PendingCursor) (PendingPage, error)
	Complete(context.Context, Completion) error
}

type RecoveryPageOptions struct {
	// No defaults: each invocation must choose 1..100 rows and at most 30s.
	MaxRows int
	Budget  time.Duration
}

type RecoveryPageResult struct {
	Completed, Missing int
	// Resume is a position within this scan, not a durable high-water mark.
	// A later fresh scan must revisit missing receipts from the beginning.
	Resume *PendingCursor
	More   bool
}

// RecoverCompletionPage retries exact stored receipts, never provider work.
// Complete must be idempotent: an ambiguous reply leaves its row eligible for
// the same retry. Missing receipts stay pending; no outcome is inferred.
// Nothing schedules this function or registers it with the HTTP runtime.
func RecoverCompletionPage(ctx context.Context, store CompletionRecovery, after *PendingCursor, options RecoveryPageOptions) (RecoveryPageResult, error) {
	result := RecoveryPageResult{Resume: copyPendingCursor(after), More: true}
	if store == nil || options.MaxRows < 1 || options.MaxRows > 100 || options.Budget <= 0 || options.Budget > 30*time.Second {
		return result, ErrPolicy
	}
	if after != nil && (after.StartedAt.IsZero() || !identifier(after.RequestID)) {
		return result, ErrInput
	}
	ctx, cancel := context.WithTimeout(ctx, options.Budget)
	defer cancel()
	if err := ctx.Err(); err != nil {
		return result, err
	}
	page, err := store.Pending(ctx, copyPendingCursor(after))
	if err != nil {
		return result, recoveryError(ctx)
	}
	if err := ctx.Err(); err != nil {
		return result, err
	}
	// Validate the whole bounded page before making any accounting write.
	if !validRecoveryPage(page, after) {
		return result, ErrAccounting
	}
	for i, row := range page.Items {
		if i == options.MaxRows {
			return result, nil
		}
		if err := ctx.Err(); err != nil {
			return result, err
		}
		if row.Receipt == nil {
			result.Missing++
		} else {
			if err := store.Complete(ctx, *row.Receipt); err != nil {
				return result, recoveryError(ctx)
			}
			result.Completed++
		}
		result.Resume = &PendingCursor{row.Reservation.StartedAt, row.Reservation.RequestID}
	}
	result.More = page.Next != nil
	return result, nil
}

func recoveryError(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return ErrAccounting
}

func copyPendingCursor(cursor *PendingCursor) *PendingCursor {
	if cursor == nil {
		return nil
	}
	copy := *cursor
	return &copy
}

func validRecoveryPage(page PendingPage, after *PendingCursor) bool {
	if page.Items == nil || len(page.Items) > 100 {
		return false
	}
	seen := make(map[string]bool, len(page.Items))
	for _, row := range page.Items {
		r := row.Reservation
		if !validReservation(r) || seen[r.RequestID] || after != nil && !(r.StartedAt.After(after.StartedAt) || r.StartedAt.Equal(after.StartedAt) && r.RequestID > after.RequestID) {
			return false
		}
		if row.Receipt != nil && (!validCompletion(*row.Receipt) || !sameReservation(row.Receipt.Reservation, r)) {
			return false
		}
		seen[r.RequestID] = true
		after = &PendingCursor{r.StartedAt, r.RequestID}
	}
	return page.Next == nil || len(page.Items) == 100 && after != nil && page.Next.StartedAt.Equal(after.StartedAt) && page.Next.RequestID == after.RequestID
}
