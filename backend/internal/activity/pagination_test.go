package activity

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func fullPage(t *testing.T) string {
	t.Helper()
	rows := make([]map[string]any, 1000)
	for i := range rows {
		rows[i] = map[string]any{"activity_date": "2026-10-14", "activity_count": 1}
	}
	raw, err := json.Marshal(rows)
	if err != nil {
		t.Fatal(err)
	}
	return string(raw)
}

func TestPagesShareOneDeadline(t *testing.T) {
	page := fullPage(t)
	calls := 0
	var first time.Time
	h := handlerWith(func(r *http.Request) (*http.Response, error) {
		calls++
		deadline, ok := r.Context().Deadline()
		if !ok {
			t.Fatal("page has no deadline")
		}
		if calls == 1 {
			first = deadline
			return reply(200, page)(r)
		}
		if !deadline.Equal(first) {
			t.Errorf("page %d reset the total deadline", calls)
		}
		return reply(200, `[]`)(r)
	})
	if w := get(h); w.Code != 200 || calls != 2 {
		t.Fatalf("status %d, calls %d; want 200 and 2", w.Code, calls)
	}
}

func TestCanceledPagingDoesNotReturnPartialTotals(t *testing.T) {
	page := fullPage(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	h := handlerWith(func(r *http.Request) (*http.Response, error) {
		if err := r.Context().Err(); err != nil {
			return nil, err
		}
		cancel()
		return reply(200, page)(r)
	})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/activity", nil).WithContext(ctx))
	if w.Code != 500 || strings.TrimSpace(w.Body.String()) != `{"error":"Failed to fetch activity data"}` {
		t.Fatalf("canceled paging returned %d %s", w.Code, w.Body)
	}
}

func TestMalformedLaterPageDoesNotReturnPartialTotals(t *testing.T) {
	for _, body := range []string{`null`, `{}`, `false`, `""`} {
		t.Run(body, func(t *testing.T) {
			page := fullPage(t)
			calls := 0
			h := handlerWith(func(r *http.Request) (*http.Response, error) {
				calls++
				if calls == 1 {
					return reply(200, page)(r)
				}
				return reply(200, body)(r)
			})
			if w := get(h); w.Code != 500 || strings.TrimSpace(w.Body.String()) != `{"error":"Failed to fetch activity data"}` {
				t.Fatalf("malformed later page returned %d %s", w.Code, w.Body)
			}
		})
	}
}
