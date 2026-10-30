package avatar

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// Two independent handlers share Storage, not a process-local mutex.
func TestExclusiveReplacementAcrossHandlers(t *testing.T) {
	var mu sync.Mutex
	held := false
	releases := 0
	paths := map[string]bool{}
	started := make(chan struct{})
	proceed := make(chan struct{})
	var closeOnce sync.Once
	defer closeOnce.Do(func() { close(proceed) })
	client := &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		reply := func(status int, body string) (*http.Response, error) {
			return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
		}
		if r.Method == "POST" && strings.HasSuffix(r.URL.RequestURI(), "/"+uploadLockName) {
			if r.Header.Get("X-Upsert") != "false" {
				t.Error("lock may overwrite")
			}
			mu.Lock()
			defer mu.Unlock()
			if held {
				return reply(400, `{"error":"Duplicate"}`)
			}
			held = true
			return reply(200, `{}`)
		}
		if r.Method == "POST" && strings.Contains(r.URL.RequestURI(), "/object/avatars/user/avatar-") {
			if r.Header.Get("X-Upsert") != "false" {
				t.Error("avatar may overwrite")
			}
			mu.Lock()
			if paths[r.URL.RequestURI()] {
				t.Error("filename reused")
			}
			paths[r.URL.RequestURI()] = true
			first := len(paths) == 1
			mu.Unlock()
			if first {
				close(started)
				select {
				case <-proceed:
				case <-r.Context().Done():
					return nil, r.Context().Err()
				}
			}
			return reply(200, `{}`)
		}
		if r.Method == "DELETE" {
			var data struct{ Prefixes []string }
			_ = json.NewDecoder(r.Body).Decode(&data)
			if len(data.Prefixes) != 1 || data.Prefixes[0] != "user/"+uploadLockName {
				t.Error("unexpected removal")
			}
			mu.Lock()
			held = false
			releases++
			mu.Unlock()
			return reply(200, `[]`)
		}
		if strings.Contains(r.URL.RequestURI(), "/list/") {
			return reply(200, `[]`)
		}
		return reply(200, `{}`)
	})}
	makeHandler := func() *Handler {
		return &Handler{User: func(*http.Request) (string, string, int) { return "user", "session", 200 }, HTTP: client, SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Logger: quiet, Now: func() time.Time { return time.UnixMilli(1792229400000) }}
	}
	first, second := makeHandler(), makeHandler()
	data, kind := fixtureBody(t, fixture{File: validPNGFile("photo.png")})
	request := func() *http.Request {
		r := httptest.NewRequest("POST", "/api/upload-avatar", bytes.NewReader(data))
		r.Header.Set("Content-Type", kind)
		return r
	}
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { w := httptest.NewRecorder(); first.ServeHTTP(w, request()); done <- w }()
	select {
	case <-started:
	case w := <-done:
		t.Fatalf("first returned before upload: %d %s", w.Code, w.Body)
	case <-time.After(5 * time.Second):
		t.Fatal("first upload did not start")
	}
	blocked := httptest.NewRecorder()
	second.ServeHTTP(blocked, request())
	if blocked.Code != 409 {
		t.Fatalf("second status%d", blocked.Code)
	}
	mu.Lock()
	if len(paths) != 1 || releases != 0 {
		t.Error("blocked upload wrote data or released foreign lock")
	}
	mu.Unlock()
	closeOnce.Do(func() { close(proceed) })
	if w := <-done; w.Code != 200 {
		t.Fatalf("first %d %s", w.Code, w.Body)
	}
	next := httptest.NewRecorder()
	second.ServeHTTP(next, request())
	if next.Code != 200 {
		t.Fatalf("next %d %s", next.Code, next.Body)
	}
	mu.Lock()
	defer mu.Unlock()
	if held || releases != 2 || len(paths) != 2 {
		t.Errorf("held%v releases%d files%d", held, releases, len(paths))
	}
}

func TestCleanupNamesStayWithinTheFolder(t *testing.T) {
	for _, name := range []string{"", ".", "..", "../x", "a/b", "a\\b", "bad\x00name"} {
		if safeName(name) {
			t.Errorf("unsafe name %q", name)
		}
	}
	if !safeName("old.png") {
		t.Error("normal name refused")
	}
}
