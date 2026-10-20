package supabaserest

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"
)

type deadlineResponse struct {
	*httptest.ResponseRecorder
	deadline time.Time
	calls    int
}

func (w *deadlineResponse) SetReadDeadline(d time.Time) error { w.deadline = d; w.calls++; return nil }

func TestRequestBudgetAndEarlierDeadline(t *testing.T) {
	for _, earlier := range []bool{false, true} {
		parent := context.Background()
		if earlier {
			var cancel context.CancelFunc
			parent, cancel = context.WithTimeout(parent, time.Second)
			defer cancel()
		}
		w := &deadlineResponse{ResponseRecorder: httptest.NewRecorder()}
		r, cancel := BoundRequest(w, httptest.NewRequest("POST", "/", nil).WithContext(parent))
		deadline, ok := r.Context().Deadline()
		if !ok || time.Until(deadline) > RequestBudget || !deadline.Equal(w.deadline) {
			t.Fatal("context and connection must share a bounded deadline")
		}
		if want, ok := parent.Deadline(); ok && !deadline.Equal(want) {
			t.Fatal("extended parent deadline")
		}
		cancel()
		if r.Context().Err() != context.Canceled || w.calls != 1 || w.deadline.IsZero() {
			t.Fatal("cancellation or server-drain deadline lost")
		}
	}
}
