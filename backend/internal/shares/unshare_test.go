package shares

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestUnshareUpdatesAllOwnRowsAndVerifies(t *testing.T) {
	for _, mode := range []string{"success", "silent-no-update", "verification-outage", "malformed-verification"} {
		t.Run(mode, func(t *testing.T) {
			type row struct {
				owner, conversation string
				deleted             bool
			}
			rows := []row{{"u1", "c1", false}, {"u1", "c1", false}, {"u2", "c1", false}, {"u1", "c2", false}, {"u1", "c1", true}}
			calls := 0
			client := &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
				calls++
				u, err := url.ParseRequestURI(r.URL.RequestURI())
				if err != nil {
					t.Fatal(err)
				}
				q := u.Query()
				if r.Header.Get("Authorization") != "Bearer session-a" || r.Header.Get("apikey") != "public-key" {
					t.Error("caller credentials changed")
				}
				if q.Get("created_by") != "eq.u1" || q.Get("conversation_id") != "eq.c1" || q.Get("deleted_at") != "is.null" {
					t.Errorf("unsafe scope %s", r.URL.RequestURI())
				}
				reply := func(status int, body string) (*http.Response, error) {
					return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
				}
				if calls == 1 {
					if r.Method != "PATCH" {
						t.Error("first operation was not the mutation")
					}
					var body map[string]string
					if json.NewDecoder(r.Body).Decode(&body) != nil || body["deleted_at"] != "2026-10-31T00:00:00.000Z" {
						t.Error("deletion marker missing")
					}
					if mode != "silent-no-update" {
						for i := range rows {
							if rows[i].owner == "u1" && rows[i].conversation == "c1" && !rows[i].deleted {
								rows[i].deleted = true
							}
						}
					}
					return reply(204, "")
				}
				if calls != 2 || r.Method != "GET" || q.Get("select") != "id" || q.Get("limit") != "1" {
					t.Error("missing bounded verification")
				}
				if mode == "verification-outage" {
					return reply(500, `{"message":"private error"}`)
				}
				if mode == "malformed-verification" {
					return reply(200, `{}`)
				}
				for _, row := range rows {
					if row.owner == "u1" && row.conversation == "c1" && !row.deleted {
						return reply(200, `[{"id":"still-active"}]`)
					}
				}
				return reply(200, `[]`)
			})}
			h := &Conversation{User: func(*http.Request) (string, string, int) { return "u1", "session-a", 200 }, Database: client, SupabaseURL: "https://contract-supabase.invalid", SupabaseKey: "public-key", Now: func() time.Time { return time.Date(2026, 10, 31, 0, 0, 0, 0, time.UTC) }, Logger: discard}
			r := httptest.NewRequest("DELETE", "/api/conversations/c1/share", nil)
			r.SetPathValue("id", "c1")
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			want := 500
			if mode == "success" {
				want = 200
			}
			if w.Code != want || calls != 2 {
				t.Fatalf("status%d calls%d body%s", w.Code, calls, w.Body)
			}
			if mode != "silent-no-update" && (!rows[0].deleted || !rows[1].deleted) {
				t.Error("an active own share survived")
			}
			if rows[2].deleted || rows[3].deleted || !rows[4].deleted {
				t.Error("unrelated or already deleted share changed")
			}
		})
	}
}
