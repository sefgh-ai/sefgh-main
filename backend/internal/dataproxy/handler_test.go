package dataproxy

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

type seen struct {
	method, url, authorization, apikey, accept, prefer, contentType, body string
}

// proxy builds the handler around a stand-in Data API that records each
// request and answers status, body and header.
func proxy(t *testing.T, status int, body string, header http.Header) (*http.ServeMux, *[]seen) {
	t.Helper()
	var got []seen
	h := &Handler{
		Policy: DefaultPolicy(),
		Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			b, _ := io.ReadAll(r.Body)
			got = append(got, seen{r.Method, r.URL.String(), r.Header.Get("Authorization"), r.Header.Get("apikey"), r.Header.Get("Accept"), r.Header.Get("Prefer"), r.Header.Get("Content-Type"), string(b)})
			h := http.Header{"Content-Type": {"application/json; charset=utf-8"}}
			for k, v := range header {
				h[k] = v
			}
			return &http.Response{StatusCode: status, Header: h, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
		})},
		SupabaseURL: "https://project.invalid/", SupabaseKey: "public-key", Logger: discard,
	}
	mux := http.NewServeMux()
	h.Register(mux)
	return mux, &got
}

func send(mux *http.ServeMux, method, target, body string, headers map[string]string) *httptest.ResponseRecorder {
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	r := httptest.NewRequest(method, target, reader)
	for k, v := range headers {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	return w
}

// An allowed request reaches the Data API as it was sent, with the caller's
// own token and the project's public key, and its reply comes back as it is.
func TestForwardsAsItIs(t *testing.T) {
	mux, got := proxy(t, 206, `[{"id":"n1"}]`, http.Header{"Content-Range": {"0-0/7"}})
	query := "select=%2A&user_id=eq.u1&order=created_at.desc&limit=20"
	w := send(mux, "GET", "/api/data/notifications/rest/v1/notifications?"+query, "", map[string]string{
		"Authorization": "Bearer user-token", "apikey": "something-else", "Accept": "application/vnd.pgrst.object+json", "Prefer": "count=exact", "X-Other": "dropped",
	})
	if w.Code != 206 || w.Body.String() != `[{"id":"n1"}]` || w.Header().Get("Content-Range") != "0-0/7" || w.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("%d %s %v", w.Code, w.Body, w.Header())
	}
	want := seen{"GET", "https://project.invalid/rest/v1/notifications?" + query, "Bearer user-token", "public-key", "application/vnd.pgrst.object+json", "count=exact", "", ""}
	if len(*got) != 1 || (*got)[0] != want {
		t.Errorf("upstream saw %+v\nwant %+v", *got, want)
	}
}

// Writes may set only the fields the rules list, in an object or a list
// of objects; anything else is refused without asking.
func TestWritesAreChecked(t *testing.T) {
	mux, got := proxy(t, 201, `{"id":"x"}`, nil)
	json := map[string]string{"Authorization": "Bearer user-token", "Content-Type": "application/json"}
	for _, tt := range []struct {
		method, target, body string
		status               int
	}{
		{"POST", "/api/data/notifications/rest/v1/notifications?select=%2A", `{"user_id":"u1","title":"Hi","message":"m","type":"info","link":null}`, 201},
		{"PATCH", "/api/data/notifications/rest/v1/notifications?id=eq.n1", `{"is_read":true}`, 201},
		{"POST", "/api/data/home/rest/v1/categories?columns=%22name%22&select=%2A", `[{"name":"Go","icon":"x","type":"language","description":"d","usage_count":0,"is_active":true}]`, 201},
		{"PATCH", "/api/data/notifications/rest/v1/notifications?id=eq.n1", `{"user_id":"someone-else"}`, 201},
		{"POST", "/api/data/notifications/rest/v1/notifications", `{"title":"Hi","is_admin":true}`, 403},
		{"POST", "/api/data/home/rest/v1/categories", `[{"name":"Go"},{"name":"x","owner":"me"}]`, 403},
		{"PATCH", "/api/data/user-stats/rest/v1/user_stats?user_id=eq.u1", `{"xp":99999}`, 403},
		{"POST", "/api/data/user-stats/rest/v1/user_stats?select=%2A", `{"user_id":"u1","level":50}`, 403},
		{"POST", "/api/data/conversations/rest/v1/user_conversations", `"not an object"`, 403},
		{"DELETE", "/api/data/profile/rest/v1/profiles?id=eq.u1", "", 403},
	} {
		before := len(*got)
		w := send(mux, tt.method, tt.target, tt.body, json)
		if w.Code != tt.status {
			t.Errorf("%s %s %s: %d %s, want %d", tt.method, tt.target, tt.body, w.Code, w.Body, tt.status)
		}
		asked := len(*got) - before
		if (tt.status == 201) != (asked == 1) {
			t.Errorf("%s %s: asked the database %d times", tt.method, tt.target, asked)
		}
		if tt.status == 403 && !strings.Contains(w.Body.String(), `"code":"42501"`) {
			t.Errorf("%s %s: refusal %s, want the Data API's error shape", tt.method, tt.target, w.Body)
		}
	}
}

// Only the area's own tables and functions are served, each by its own
// path; anything else is refused without asking.
func TestOnlyTheAreasTablesAreServed(t *testing.T) {
	mux, got := proxy(t, 200, `[]`, nil)
	for _, tt := range []struct {
		target string
		status int
	}{
		{"/api/data/home/rest/v1/projects?select=%2A", 200},
		{"/api/data/home/rest/v1/notifications?select=%2A", 403},
		{"/api/data/nowhere/rest/v1/projects", 404},
		{"/api/data/home/rest/v1/projects/extra", 403},
		{"/api/data/home/rest/v1/rpc/increment_category_usage", 403},
		{"/api/data/activity/rest/v1/rpc/log_user_activity", 403}, // GET of a function is not allowed
	} {
		before := len(*got)
		w := send(mux, "GET", tt.target, "", nil)
		if w.Code != tt.status || (len(*got)-before == 1) != (tt.status == 200) {
			t.Errorf("GET %s: %d, asked %d, want %d", tt.target, w.Code, len(*got)-before, tt.status)
		}
	}
}

// A function's arguments are checked as fields; the call goes as the caller.
func TestFunctionArguments(t *testing.T) {
	mux, got := proxy(t, 204, ``, nil)
	headers := map[string]string{"Authorization": "Bearer user-token", "Content-Type": "application/json"}
	if w := send(mux, "POST", "/api/data/activity/rest/v1/rpc/log_user_activity", `{"p_user_id":"u1","p_activity_type":"search","p_metadata":{}}`, headers); w.Code != 204 {
		t.Errorf("allowed call: %d %s", w.Code, w.Body)
	}
	if w := send(mux, "POST", "/api/data/activity/rest/v1/rpc/log_user_activity", `{"p_user_id":"u1","p_extra":1}`, headers); w.Code != 403 {
		t.Errorf("extra argument: %d", w.Code)
	}
	if len(*got) != 1 || (*got)[0].url != "https://project.invalid/rest/v1/rpc/log_user_activity" || (*got)[0].body != `{"p_user_id":"u1","p_activity_type":"search","p_metadata":{}}` {
		t.Errorf("upstream saw %+v", *got)
	}
}

// Without a bearer, the request goes with the public key, as a signed-out
// browser's does; a HEAD count passes its Content-Range back without a body.
func TestSignedOutAndCounts(t *testing.T) {
	mux, got := proxy(t, 200, ``, http.Header{"Content-Range": {"*/12"}})
	w := send(mux, "HEAD", "/api/data/search-stats/rest/v1/platform_stats?select=%2A", "", map[string]string{"Prefer": "count=exact"})
	if w.Code != 200 || w.Header().Get("Content-Range") != "*/12" || w.Body.Len() != 0 {
		t.Errorf("%d %q %q", w.Code, w.Header().Get("Content-Range"), w.Body)
	}
	if len(*got) != 1 || (*got)[0].authorization != "Bearer public-key" || (*got)[0].method != "HEAD" {
		t.Errorf("upstream saw %+v", *got)
	}
}

// No reply from the database is a 502 in the Data API's error shape, which
// supabase-js reads as an error.
func TestUnreachableDatabase(t *testing.T) {
	var logs bytes.Buffer
	h := &Handler{
		Policy: DefaultPolicy(),
		Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
			return nil, errors.New("dial failed for " + r.URL.String())
		})},
		SupabaseURL: "https://project.invalid", SupabaseKey: "public-key",
		Logger: slog.New(slog.NewTextHandler(&logs, nil)),
	}
	mux := http.NewServeMux()
	h.Register(mux)
	w := send(mux, "PATCH", "/api/data/conversations/rest/v1/user_conversations?id=eq.secret-conversation&select=%2A", `{"messages":[{"content":"secret-message"}]}`, map[string]string{"Authorization": "Bearer secret-token"})
	var answer map[string]any
	if w.Code != 502 || json.Unmarshal(w.Body.Bytes(), &answer) != nil || answer["message"] != "the database could not be reached" {
		t.Errorf("%d %s", w.Code, w.Body)
	}
	for _, secret := range []string{"secret-conversation", "secret-message", "secret-token"} {
		if strings.Contains(logs.String(), secret) {
			t.Errorf("the log holds %q: %s", secret, logs.String())
		}
	}
	if !strings.Contains(logs.String(), "area=conversations") {
		t.Errorf("the failure was not logged: %s", logs.String())
	}
}

// Every rule names real methods, and every write method comes with fields.
func TestPolicyIsWellFormed(t *testing.T) {
	methods := map[string]bool{"GET": true, "HEAD": true, "POST": true, "PATCH": true, "DELETE": true}
	for area, rules := range DefaultPolicy() {
		for target, rule := range rules {
			writes := false
			for _, m := range rule.Methods {
				if !methods[m] {
					t.Errorf("%s %s: method %q", area, target, m)
				}
				writes = writes || m == "POST" || m == "PATCH"
			}
			if writes && len(rule.Writable) == 0 {
				t.Errorf("%s %s: a write with no writable fields", area, target)
			}
		}
	}
}
