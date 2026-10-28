package apikey

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type recoveryFixture struct {
	page                 PendingPage
	listErr, completeErr error
	calls                []Completion
	reads                int
	deadline             bool
	onComplete           func(context.Context)
	onPending            func(context.Context, *PendingCursor)
}

func (f *recoveryFixture) Pending(ctx context.Context, after *PendingCursor) (PendingPage, error) {
	f.reads++
	_, f.deadline = ctx.Deadline()
	if f.onPending != nil {
		f.onPending(ctx, after)
	}
	return f.page, f.listErr
}
func (f *recoveryFixture) Complete(ctx context.Context, c Completion) error {
	f.calls = append(f.calls, c)
	if f.onComplete != nil {
		f.onComplete(ctx)
	}
	return f.completeErr
}
func recoveryRows(count int) []PendingAttempt {
	rows := make([]PendingAttempt, count)
	for i := range rows {
		at := time.Date(2026, 10, 21, 0, 0, i, 0, time.UTC)
		r := Reservation{RequestID: "receipt-" + strings.Repeat("a", i+1), Selector: "AAAAAAAAAAAAAAAA", Owner: "11111111-1111-4111-8111-111111111111", Endpoint: "public-search", StartedAt: at}
		c := Completion{r, "success", 200, at.Add(time.Second)}
		rows[i] = PendingAttempt{r, &c}
	}
	return rows
}
func recoveryOptions() RecoveryPageOptions { return RecoveryPageOptions{100, time.Second} }

func TestRecoveryRetriesOnlyKnownReceiptsAndKeepsUnknownAttempts(t *testing.T) {
	rows := recoveryRows(3)
	rows[1].Receipt = nil
	f := &recoveryFixture{page: PendingPage{Items: rows}}
	r, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions())
	if err != nil || r.Completed != 2 || r.Missing != 1 || r.More || len(f.calls) != 2 || !f.deadline || f.reads != 1 {
		t.Fatal("wrong bounded recovery", r, err, len(f.calls))
	}
	if !sameReservation(f.calls[0].Reservation, rows[0].Reservation) || !sameReservation(f.calls[1].Reservation, rows[2].Reservation) {
		t.Fatal("completion changed")
	}
	if r.Resume == nil || r.Resume.RequestID != rows[2].Reservation.RequestID {
		t.Fatal("cursor missing")
	}
}

func TestRecoveryPartialPagePreservesCursorForNextInvocation(t *testing.T) {
	rows := recoveryRows(3)
	f := &recoveryFixture{page: PendingPage{Items: rows}}
	r, err := RecoverCompletionPage(context.Background(), f, nil, RecoveryPageOptions{1, time.Second})
	if err != nil || r.Completed != 1 || !r.More || len(f.calls) != 1 || r.Resume == nil || r.Resume.RequestID != rows[0].Reservation.RequestID {
		t.Fatal(r, err)
	}
}

func TestRecoveryFailureDoesNotAdvancePastUnconfirmedCompletion(t *testing.T) {
	rows := recoveryRows(2)
	f := &recoveryFixture{page: PendingPage{Items: rows}, completeErr: errors.New("private adapter diagnostic")}
	r, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions())
	if !errors.Is(err, ErrAccounting) || strings.Contains(err.Error(), "private") || r.Completed != 0 || r.Resume != nil || !r.More || len(f.calls) != 1 {
		t.Fatal("uncertain completion advanced or leaked", r, err)
	}
	f.completeErr = nil
	f.calls = nil
	r, err = RecoverCompletionPage(context.Background(), f, r.Resume, recoveryOptions())
	if err != nil || r.Completed != 2 || len(f.calls) != 2 {
		t.Fatal("exact retry failed", r, err)
	}
}

func TestRecoveryValidatesEntirePageBeforeWrites(t *testing.T) {
	for _, kind := range []string{"mismatch", "invalid-outcome", "unordered", "duplicate", "bad-next", "oversized", "nil-items"} {
		t.Run(kind, func(t *testing.T) {
			rows := recoveryRows(2)
			page := PendingPage{Items: rows}
			switch kind {
			case "mismatch":
				rows[1].Receipt.Reservation.Owner = "22222222-2222-4222-8222-222222222222"
			case "invalid-outcome":
				rows[1].Receipt.Outcome = "invented"
			case "unordered":
				rows[1].Reservation.StartedAt = rows[0].Reservation.StartedAt.Add(-time.Second)
			case "duplicate":
				rows[1].Reservation.RequestID = rows[0].Reservation.RequestID
			case "bad-next":
				page.Next = &PendingCursor{rows[1].Reservation.StartedAt, "wrong"}
			case "oversized":
				page.Items = make([]PendingAttempt, 101)
			case "nil-items":
				page.Items = nil
			}
			f := &recoveryFixture{page: page}
			_, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions())
			if !errors.Is(err, ErrAccounting) || len(f.calls) != 0 {
				t.Fatal("bad page wrote", err, len(f.calls))
			}
		})
	}
}

func TestRecoveryRejectsInvalidConfigurationBeforeReading(t *testing.T) {
	for _, options := range []RecoveryPageOptions{{0, time.Second}, {101, time.Second}, {1, 0}, {1, 31 * time.Second}} {
		f := &recoveryFixture{}
		_, err := RecoverCompletionPage(context.Background(), f, nil, options)
		if !errors.Is(err, ErrPolicy) || f.reads != 0 {
			t.Fatal("invalid recovery policy admitted")
		}
	}
	f := &recoveryFixture{}
	_, err := RecoverCompletionPage(context.Background(), f, &PendingCursor{}, recoveryOptions())
	if !errors.Is(err, ErrInput) || f.reads != 0 {
		t.Fatal("invalid cursor admitted")
	}
	if _, err := RecoverCompletionPage(context.Background(), nil, nil, recoveryOptions()); !errors.Is(err, ErrPolicy) {
		t.Fatal("nil capability admitted")
	}
}

func TestRecoveryCancellationStopsWithoutInventingReceipt(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	f := &recoveryFixture{page: PendingPage{Items: recoveryRows(2)}}
	if _, err := RecoverCompletionPage(ctx, f, nil, recoveryOptions()); !errors.Is(err, context.Canceled) || f.reads != 0 {
		t.Fatal("cancelled before read", err)
	}
	ctx, cancel = context.WithCancel(context.Background())
	defer cancel()
	f.onComplete = func(context.Context) { cancel() }
	r, err := RecoverCompletionPage(ctx, f, nil, recoveryOptions())
	if !errors.Is(err, context.Canceled) || len(f.calls) != 1 || r.Completed != 1 || r.Resume == nil || !r.More {
		t.Fatal("cancelled batch continued", r, err)
	}
}

func TestRecoveryAcceptsEquivalentTimestampOffsetsAndRejectsCursorReplay(t *testing.T) {
	rows := recoveryRows(1)
	rows[0].Receipt.Reservation.StartedAt = rows[0].Reservation.StartedAt.In(time.FixedZone("fixture", 3600))
	f := &recoveryFixture{page: PendingPage{Items: rows}}
	if _, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions()); err != nil {
		t.Fatal("same instant rejected", err)
	}
	f.calls = nil
	after := &PendingCursor{rows[0].Reservation.StartedAt, rows[0].Reservation.RequestID}
	if _, err := RecoverCompletionPage(context.Background(), f, after, recoveryOptions()); !errors.Is(err, ErrAccounting) || len(f.calls) != 0 {
		t.Fatal("cursor replay accepted", err)
	}
}

func TestRecoveryScansPastUnknownRowsAndFreshScanRevisitsThem(t *testing.T) {
	rows := recoveryRows(101)
	for i := range 100 {
		rows[i].Receipt = nil
	}
	f := &recoveryFixture{page: PendingPage{Items: rows[:100], Next: &PendingCursor{rows[99].Reservation.StartedAt, rows[99].Reservation.RequestID}}}
	first, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions())
	if err != nil || first.Missing != 100 || first.Completed != 0 || !first.More {
		t.Fatal("unknown page blocked later receipt", first, err)
	}
	f.page = PendingPage{Items: rows[100:]}
	last, err := RecoverCompletionPage(context.Background(), f, first.Resume, recoveryOptions())
	if err != nil || last.Completed != 1 || last.More || len(f.calls) != 1 {
		t.Fatal("later known receipt not reached", last, err)
	}
	// A later receipt may arrive for a row already scanned. A fresh scan starts
	// at nil; an end cursor is not permission to forget unknown attempts.
	c := Completion{rows[0].Reservation, "failure", 503, rows[0].Reservation.StartedAt.Add(time.Second)}
	rows[0].Receipt = &c
	f.page = PendingPage{Items: rows[:1]}
	fresh, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions())
	if err != nil || fresh.Completed != 1 || len(f.calls) != 2 || f.calls[1] != c {
		t.Fatal("fresh scan lost earlier receipt", fresh, err)
	}
}

func TestRecoveryReaderFailureDeadlineAndCursorIsolation(t *testing.T) {
	rows := recoveryRows(2)
	after := &PendingCursor{rows[0].Reservation.StartedAt, rows[0].Reservation.RequestID}
	original := *after
	f := &recoveryFixture{page: PendingPage{Items: rows[1:]}, onPending: func(_ context.Context, cursor *PendingCursor) {
		cursor.RequestID = "mutated-adapter-copy"
	}}
	r, err := RecoverCompletionPage(context.Background(), f, after, recoveryOptions())
	if err != nil || r.Completed != 1 || *after != original {
		t.Fatal("adapter mutated caller cursor", r, err)
	}
	f.listErr = errors.New("private database payload")
	r, err = RecoverCompletionPage(context.Background(), f, after, recoveryOptions())
	if err != ErrAccounting || r.Resume == after || *r.Resume != original || !r.More {
		t.Fatal("reader failure leaked or lost resume", r, err)
	}
	f.listErr = nil
	f.onPending = func(ctx context.Context, _ *PendingCursor) { <-ctx.Done() }
	f.calls = nil
	r, err = RecoverCompletionPage(context.Background(), f, after, RecoveryPageOptions{MaxRows: 1, Budget: time.Millisecond})
	if !errors.Is(err, context.DeadlineExceeded) || len(f.calls) != 0 || !r.More || *r.Resume != original {
		t.Fatal("reader budget did not stop writes", r, err)
	}
}

func TestRecoveryChecksRowsBeyondProcessingCapAndBoundsCompletion(t *testing.T) {
	rows := recoveryRows(2)
	rows[1].Receipt.Status = 0
	f := &recoveryFixture{page: PendingPage{Items: rows}}
	if _, err := RecoverCompletionPage(context.Background(), f, nil, RecoveryPageOptions{1, time.Second}); err != ErrAccounting || len(f.calls) != 0 {
		t.Fatal("row beyond processing cap escaped page validation", err)
	}
	rows = recoveryRows(1)
	f.page.Items = rows
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	f.onComplete = func(inner context.Context) {
		<-inner.Done()
		f.completeErr = inner.Err()
	}
	r, err := RecoverCompletionPage(ctx, f, nil, recoveryOptions())
	if !errors.Is(err, context.DeadlineExceeded) || r.Completed != 0 || r.Resume != nil || !r.More || len(f.calls) != 1 {
		t.Fatal("blocked completion advanced ambiguous row", r, err)
	}
}

func TestRecoveryFailureAfterProgressResumesBeforeFailedRow(t *testing.T) {
	rows := recoveryRows(3)
	f := &recoveryFixture{page: PendingPage{Items: rows}}
	f.onComplete = func(_ context.Context) {
		if len(f.calls) == 2 {
			f.completeErr = ErrUnavailable
		}
	}
	r, err := RecoverCompletionPage(context.Background(), f, nil, recoveryOptions())
	if err != ErrAccounting || r.Completed != 1 || !r.More || r.Resume.RequestID != rows[0].Reservation.RequestID || len(f.calls) != 2 {
		t.Fatal("failed receipt skipped after progress", r, err)
	}
	f.completeErr, f.onComplete = nil, nil
	f.page.Items = rows[1:]
	last, err := RecoverCompletionPage(context.Background(), f, r.Resume, recoveryOptions())
	if err != nil || last.Completed != 2 || last.More || f.calls[1] != f.calls[2] {
		t.Fatal("retry changed ambiguous receipt", last, err)
	}
	f.page = PendingPage{Items: []PendingAttempt{}}
	empty, err := RecoverCompletionPage(context.Background(), f, last.Resume, recoveryOptions())
	if err != nil || empty.More || empty.Completed != 0 || empty.Missing != 0 || empty.Resume == last.Resume || *empty.Resume != *last.Resume {
		t.Fatal("empty page changed progress", empty, err)
	}
}

func TestRecoveryUsesOnlyAccountantPendingAndExactCompletionRPCs(t *testing.T) {
	rows := recoveryRows(1)
	var paths, receipts []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.Header.Get("Authorization") != "Bearer fixture-accountant" || r.Header.Get("apikey") != "fixture-public" {
			t.Error("wrong accounting request")
		}
		paths = append(paths, r.URL.Path)
		switch r.URL.Path {
		case "/rest/v1/rpc/sefgh_key_pending":
			_ = json.NewEncoder(w).Encode(PendingPage{Items: rows})
		case "/rest/v1/rpc/sefgh_key_complete":
			var args struct {
				Receipt Completion `json:"p_receipt"`
			}
			if json.NewDecoder(r.Body).Decode(&args) != nil || args.Receipt != *rows[0].Receipt {
				t.Error("receipt changed on retry")
			}
			bytes, _ := json.Marshal(args)
			receipts = append(receipts, string(bytes))
			if len(receipts) == 1 {
				w.WriteHeader(500)
				_, _ = w.Write([]byte("private adapter diagnostic"))
				return
			}
			_, _ = w.Write([]byte("null"))
		default:
			t.Error("recovery called unrelated capability", r.URL.Path)
			w.WriteHeader(500)
		}
	}))
	defer server.Close()
	client, err := NewRPCClient(server.URL, "fixture-public")
	if err != nil {
		t.Fatal(err)
	}
	// Synthetic capability only. Real provisioning and recovery while admission
	// is disabled remain separate runtime gates, not bypassed by this test.
	store := &RPCAccounting{client: client, bearer: "fixture-accountant"}
	first, err := RecoverCompletionPage(context.Background(), store, nil, recoveryOptions())
	if err != ErrAccounting || first.Resume != nil || len(paths) != 2 {
		t.Fatal("ambiguous RPC retried automatically", first, err, paths)
	}
	last, err := RecoverCompletionPage(context.Background(), store, first.Resume, recoveryOptions())
	if err != nil || last.Completed != 1 || last.More || len(paths) != 4 || len(receipts) != 2 || receipts[0] != receipts[1] {
		t.Fatal("exact manual retry failed", last, err, paths)
	}
}
