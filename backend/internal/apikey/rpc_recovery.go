package apikey

import (
	"context"
	"fmt"
	"io"
	"strings"
)

// OpenRecovery establishes a pending/complete-only capability independently of
// admission policy. It neither provisions credentials nor enables admissions.
func (c *RPCClient) OpenRecovery(ctx context.Context, bearer string) (CompletionRecovery, error) {
	if c == nil {
		return nil, ErrUnavailable
	}
	if bearer == "" || len(bearer) > 8192 || strings.ContainsAny(bearer, " \r\n\t") || strings.HasPrefix(bearer, "sk_") {
		return nil, ErrPolicy
	}
	ctx, cancel := context.WithTimeout(ctx, MaxHTTPBudget)
	defer cancel()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	// SQL/gateway grants verify the supplied server capability. Do not infer
	// authority from decoded claims, or enable policy merely to open recovery.
	accounting := &RPCAccounting{client: c, bearer: bearer}
	if _, err := accounting.Pending(ctx, nil); err != nil {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		return nil, ErrUnavailable
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return recoveryRPC{accounting}, nil
}

// A separate concrete type also prevents a type assertion from widening the
// returned interface into lookup/reservation, management, or an executor.
type recoveryRPC struct{ accounting *RPCAccounting }

func (r recoveryRPC) Pending(ctx context.Context, after *PendingCursor) (PendingPage, error) {
	return r.accounting.Pending(ctx, after)
}
func (r recoveryRPC) Complete(ctx context.Context, receipt Completion) error {
	return r.accounting.Complete(ctx, receipt)
}
func (r recoveryRPC) Format(f fmt.State, _ rune)   { _, _ = io.WriteString(f, "[recovery RPC redacted]") }
func (r recoveryRPC) MarshalJSON() ([]byte, error) { return nil, ErrUnavailable }
