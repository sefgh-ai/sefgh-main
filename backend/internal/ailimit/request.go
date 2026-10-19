package ailimit

import (
	"context"
	"net/http"
	"time"
)

// RequestBudget covers identity verification, incoming JSON and the provider
// together, below cmd/api's 30-second write limit. A provider's own timeout
// may shorten the remaining budget but cannot extend it.
const RequestBudget = 25 * time.Second

// BoundRequest starts the AI route's budget before any input or identity I/O.
// Context cancellation stops outbound calls; the connection deadline also
// stops an incoming Body.Read. Keep that deadline while net/http drains the
// body on return: clearing it early can make the drain block forever.
func BoundRequest(w http.ResponseWriter, r *http.Request) (*http.Request, context.CancelFunc) {
	ctx, cancel := context.WithTimeout(r.Context(), RequestBudget)
	deadline, _ := ctx.Deadline()
	_ = http.NewResponseController(w).SetReadDeadline(deadline)
	return r.WithContext(ctx), cancel
}
