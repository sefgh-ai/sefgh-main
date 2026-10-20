package supabaserest

import (
	"context"
	"net/http"
	"time"
)

// RequestBudget bounds the browser-data endpoints' identity check,
// incoming body and Data API call together, below the 30-second write limit.
const RequestBudget = 24 * time.Second

// BoundRequest starts the budget before verification or body I/O. The
// context interrupts outbound calls; the read deadline interrupts incoming
// Body.Read too. Keep it while net/http drains the body after returning.
func BoundRequest(w http.ResponseWriter, r *http.Request) (*http.Request, context.CancelFunc) {
	ctx, cancel := context.WithTimeout(r.Context(), RequestBudget)
	deadline, _ := ctx.Deadline()
	_ = http.NewResponseController(w).SetReadDeadline(deadline)
	return r.WithContext(ctx), cancel
}
