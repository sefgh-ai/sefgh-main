package ailimit

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type deadlineWriter struct {
	*httptest.ResponseRecorder
	deadline time.Time
	calls    int
}

func (w *deadlineWriter) SetReadDeadline(d time.Time) error { w.deadline = d; w.calls++; return nil }

func TestBoundRequestUsesEarlierParentDeadline(t *testing.T) {
	ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(time.Second))
	defer cancel()
	r := httptest.NewRequest("POST", "/", nil).WithContext(ctx)
	w := &deadlineWriter{ResponseRecorder: httptest.NewRecorder()}
	bounded, stop := BoundRequest(w, r)
	want, _ := ctx.Deadline()
	got, ok := bounded.Context().Deadline()
	if !ok || !got.Equal(want) || !w.deadline.Equal(want) {
		t.Fatal("parent deadline was extended or connection not bounded")
	}
	stop()
	if bounded.Context().Err() != context.Canceled {
		t.Error("cancel not propagated")
	}
	if w.calls != 1 || w.deadline.IsZero() {
		t.Error("read deadline cleared before server drain")
	}
}

func TestBoundRequestIncludesIdentityAndProvider(t *testing.T) {
	w := &deadlineWriter{ResponseRecorder: httptest.NewRecorder()}
	r, stop := BoundRequest(w, httptest.NewRequest(http.MethodPost, "/", nil))
	defer stop()
	d, ok := r.Context().Deadline()
	if !ok || time.Until(d) > RequestBudget || w.deadline != d {
		t.Fatal("missing whole-request deadline")
	}
}
