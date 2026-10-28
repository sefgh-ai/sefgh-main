package activity

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

var fixedNow = time.Date(2026, 10, 14, 12, 0, 0, 0, time.UTC)

// handlerWith returns a handler whose user is always "user-a" and whose
// database answers with database.
func handlerWith(database roundTrip) *Handler {
	return &Handler{
		User:        func(*http.Request) (string, string, int) { return "user-a", "session-a", 200 },
		Client:      &http.Client{Transport: database},
		SupabaseURL: "https://project.test", SupabaseKey: "public-key",
		Now:    func() time.Time { return fixedNow },
		Logger: discard,
	}
}

func reply(status int, body string) roundTrip {
	return func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	}
}

func get(h *Handler) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/activity", nil))
	return w
}

func TestSumRowsFollowsTheHandlersLoop(t *testing.T) {
	decode := func(text string) any {
		var value any
		decoder := json.NewDecoder(strings.NewReader(text))
		decoder.UseNumber()
		if err := decoder.Decode(&value); err != nil {
			t.Fatal(err)
		}
		return value
	}
	tests := []struct {
		name   string
		data   string
		counts map[string]float64
		total  float64
		fails  bool
	}{
		{"nothing", `null`, map[string]float64{}, 0, false},
		{"falsy data", `0`, map[string]float64{}, 0, false},
		{"empty text", `""`, map[string]float64{}, 0, false},
		{"an object is not a list", `{"activity_date":"2026-10-14"}`, nil, 0, true},
		{"text is not a list", `"rows"`, nil, 0, true},
		{"true is not a list", `true`, nil, 0, true},
		{"a null row throws", `[{"activity_date":"2026-10-14","activity_count":1},null]`, nil, 0, true},
		{"text as a count", `[{"activity_date":"2026-10-14","activity_count":"3"}]`, nil, 0, true},
		{"true as a count", `[{"activity_date":"2026-10-14","activity_count":true}]`, nil, 0, true},
		{"same date added up", `[{"activity_date":"d","activity_count":2},{"activity_date":"d","activity_count":3}]`, map[string]float64{"d": 5}, 5, false},
		{"falsy counts are 0", `[{"activity_date":"d","activity_count":null},{"activity_date":"d","activity_count":false},{"activity_date":"d","activity_count":""},{"activity_date":"d"}]`, map[string]float64{"d": 0}, 0, false},
		{"rows that are not objects count 0", `[1,"x",[],true]`, map[string]float64{}, 0, false},
		{"a date that is not text counts in the total only", `[{"activity_date":20261014,"activity_count":4}]`, map[string]float64{}, 4, false},
		{"fractions and negatives", `[{"activity_date":"d","activity_count":0.5},{"activity_date":"d","activity_count":-2}]`, map[string]float64{"d": -1.5}, -1.5, false},
		// if (activityMap[date]) is false for a sum of 0, so the next
		// count replaces it; the numbers come out the same.
		{"a sum of 0 is replaced", `[{"activity_date":"d","activity_count":1},{"activity_date":"d","activity_count":-1},{"activity_date":"d","activity_count":7}]`, map[string]float64{"d": 7}, 7, false},
	}
	for _, tt := range tests {
		counts, total, err := sumRows(decode(tt.data))
		if (err != nil) != tt.fails {
			t.Errorf("%s: error %v, want failure %v", tt.name, err, tt.fails)
			continue
		}
		if !tt.fails && (total != tt.total || len(counts) != len(tt.counts)) {
			t.Errorf("%s: counts %v total %v; want %v and %v", tt.name, counts, total, tt.counts, tt.total)
		}
		for date, want := range tt.counts {
			if counts[date] != want {
				t.Errorf("%s: %s counts %v, want %v", tt.name, date, counts[date], want)
			}
		}
	}

	// Infinity minus Infinity is NaN, which "if (activityMap[date])" treats
	// as false: the next count replaces it, and the grid shows NaN as 0.
	counts, _, _ := sumRows(decode(`[{"activity_date":"d","activity_count":1e400},{"activity_date":"d","activity_count":-1e400}]`))
	if !math.IsNaN(counts["d"]) {
		t.Errorf("Infinity - Infinity: %v, want NaN", counts["d"])
	}
	counts, _, _ = sumRows(decode(`[{"activity_date":"d","activity_count":1e400},{"activity_date":"d","activity_count":-1e400},{"activity_date":"d","activity_count":2}]`))
	if counts["d"] != 2 {
		t.Errorf("a count after NaN: %v, want 2", counts["d"])
	}
}

func TestNumbersAreWrittenAsJSONStringifyWritesThem(t *testing.T) {
	for _, tt := range []struct {
		n    float64
		want string
	}{
		{0, "0"}, {math.Copysign(0, -1), "0"}, {math.NaN(), "null"}, {math.Inf(1), "null"}, {math.Inf(-1), "null"},
		{5, "5"}, {0.1, "0.1"}, {1e21, "1e+21"}, {1e-7, "1e-7"}, {123456789012, "123456789012"},
	} {
		got, err := json.Marshal(number(tt.n))
		if err != nil || string(got) != tt.want {
			t.Errorf("number(%v) = %s, %v; want %s", tt.n, got, err, tt.want)
		}
	}
}

// A refused session is 401; Supabase Auth failing is 503, not a sign-out
// (R-063). Either way the database is not asked.
func TestSignInFailures(t *testing.T) {
	for status, want := range map[int]string{
		401: `401 {"error":"Unauthorized"}`,
		403: `401 {"error":"Unauthorized"}`,
		503: `503 {"error":"Sign-in could not be verified"}`,
	} {
		h := handlerWith(func(*http.Request) (*http.Response, error) {
			t.Error("the database was asked without a user")
			return nil, errors.New("unreachable")
		})
		h.User = func(*http.Request) (string, string, int) { return "", "", status }
		w := get(h)
		if got := fmt.Sprintf("%d %s", w.Code, strings.TrimSpace(w.Body.String())); got != want {
			t.Errorf("sign-in status %d: answered %s, want %s", status, got, want)
		}
	}
}

func TestDatabaseFailuresSayOnlyTheFixedSentence(t *testing.T) {
	var log bytes.Buffer
	for name, database := range map[string]roundTrip{
		"offline": func(*http.Request) (*http.Response, error) {
			return nil, errors.New("dial tcp: no route to host user-a")
		},
		"refused":  reply(403, `{"message":"permission denied for table activity_logs"}`),
		"broken":   reply(200, `[{"activity_date":`),
		"too long": reply(200, `[`+strings.Repeat(" ", supabaserest.MaxReplyBytes)+`]`),
	} {
		h := handlerWith(database)
		h.Logger = slog.New(slog.NewTextHandler(&log, nil))
		w := get(h)
		if w.Code != 500 || strings.TrimSpace(w.Body.String()) != `{"error":"Failed to fetch activity data"}` {
			t.Errorf("%s: answered %d %s", name, w.Code, w.Body)
		}
	}
	// The log says what failed, never who asked or what the database said.
	for _, secret := range []string{"user-a", "session-a", "permission denied", "no route"} {
		if strings.Contains(log.String(), secret) {
			t.Errorf("the log contains %q:\n%s", secret, log.String())
		}
	}
}

func TestRowsOfAnUnexpectedKindAreAnInternalError(t *testing.T) {
	w := get(handlerWith(reply(200, `[null]`)))
	if w.Code != 500 || strings.TrimSpace(w.Body.String()) != `{"error":"Internal server error"}` {
		t.Errorf("answered %d %s", w.Code, w.Body)
	}
}

func TestMissingSettingsFailBeforeSignIn(t *testing.T) {
	h := handlerWith(reply(200, `[]`))
	h.SupabaseURL = ""
	h.User = func(*http.Request) (string, string, int) {
		t.Error("sign-in was checked without the project's settings")
		return "", "", 401
	}
	if w := get(h); w.Code != 500 || strings.TrimSpace(w.Body.String()) != `{"error":"Internal server error"}` {
		t.Errorf("answered %d %s", w.Code, w.Body)
	}
}

// A redirect could carry the user's token to another address, so none is
// followed: the redirect reply itself is an error.
func TestRedirectsAreNotFollowed(t *testing.T) {
	asked := 0
	w := get(handlerWith(func(r *http.Request) (*http.Response, error) {
		asked++
		return &http.Response{StatusCode: 302, Header: http.Header{"Location": {"https://elsewhere.test/"}}, Body: io.NopCloser(strings.NewReader(""))}, nil
	}))
	if asked != 1 || w.Code != 500 {
		t.Errorf("asked %d times, answered %d", asked, w.Code)
	}
}

func TestTheDatabaseCallHasADeadline(t *testing.T) {
	h := handlerWith(func(r *http.Request) (*http.Response, error) {
		deadline, ok := r.Context().Deadline()
		if !ok || time.Until(deadline) > Timeout {
			t.Errorf("deadline %v, %v; want one within %v", deadline, ok, Timeout)
		}
		return nil, r.Context().Err()
	})
	get(h)
}

// What reaches the Data API: the user's own token with the public key, and
// the user's id put into the query safely, whatever it contains.
func TestTheQueryIsTheUsersOwn(t *testing.T) {
	var seen *http.Request
	h := handlerWith(func(r *http.Request) (*http.Response, error) {
		seen = r
		return reply(200, `[]`)(r)
	})
	h.User = func(*http.Request) (string, string, int) { return "a&order=x.desc b", "session-a", 200 }
	if w := get(h); w.Code != 200 {
		t.Fatalf("answered %d", w.Code)
	}
	if seen.Header.Get("Authorization") != "Bearer session-a" || seen.Header.Get("apikey") != "public-key" {
		t.Errorf("headers %v", seen.Header)
	}
	if got := seen.URL.Query()["user_id"]; len(got) != 1 || got[0] != "eq.a&order=x.desc b" {
		t.Errorf("user_id %q", got)
	}
	if got := seen.URL.Query()["order"]; len(got) != 1 || got[0] != "activity_date.asc" {
		t.Errorf("order %q", got)
	}
}
