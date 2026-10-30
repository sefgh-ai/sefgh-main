package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"
)

// videosUpstream stands in for Supabase Auth, its admin API and the Data
// API, and records each call as "METHOD path?query|Authorization|apikey|X-GitHub-Token".
type videosUpstream struct {
	mu   sync.Mutex
	seen []string
}

func (s *videosUpstream) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.seen = append(s.seen, r.Method+" "+r.URL.RequestURI()+"|"+r.Header.Get("Authorization")+"|"+r.Header.Get("apikey")+"|"+r.Header.Get("X-GitHub-Token"))
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.URL.Path == "/auth/v1/user" && r.Header.Get("Authorization") == "Bearer session-a":
		io.WriteString(w, `{"id":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b","email":"a@example.test"}`)
	case r.URL.Path == "/rest/v1/repo_videos" && r.Method == "GET":
		io.WriteString(w, `[{"id":"v1","uploaded_by":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"},{"id":"v2","uploaded_by":null}]`)
	case r.URL.Path == "/rest/v1/repo_videos" && r.Method == "POST":
		w.WriteHeader(201)
		io.WriteString(w, `{"id":"v9","video_type":"youtube"}`)
	case r.URL.Path == "/rest/v1/repo_videos" && r.Method == "DELETE":
		io.WriteString(w, `{"id":"v1"}`)
	default:
		w.WriteHeader(403)
		io.WriteString(w, `{}`)
	}
}

func videosServer(t *testing.T) (http.Handler, *videosUpstream) {
	t.Helper()
	stand := &videosUpstream{}
	server := httptest.NewServer(stand)
	t.Cleanup(server.Close)
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", server.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_API_URL", server.URL)
	t.Setenv("GITHUB_TOKEN", "server-github-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	return newHandler(slog.New(slog.NewTextHandler(io.Discard, nil))), stand
}

// Signed in, the video list and the uploader's public profile go with the
// caller's token, and nothing asks Supabase Auth about another user: no admin
// lookup since contract version 3 (bug register R-040). A video without an
// uploader is answered as it is. No GitHub credential goes anywhere.
func TestVideosListAsTheCaller(t *testing.T) {
	handler, stand := videosServer(t)
	req := httptest.NewRequest("GET", "/api/repo/videos?repo=octo%2Fdemo", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	req.Header.Set("X-GitHub-Token", "caller-github-token")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	want := `{"videos":[{"id":"v1","uploaded_by":"0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b","uploader_name":null,"uploader_email":null,"uploader_avatar":null},{"id":"v2","uploaded_by":null}]}`
	if rec.Code != 200 || rec.Body.String() != want {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	seen := append([]string(nil), stand.seen...)
	sort.Strings(seen)
	wantSeen := []string{
		"GET /rest/v1/profiles?select=full_name%2Cavatar_url&id=eq.0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b|Bearer session-a|public-key|",
		"GET /rest/v1/repo_videos?select=*&repo_full_name=eq.octo%2Fdemo&order=is_featured.desc%2Ccreated_at.desc|Bearer session-a|public-key|",
	}
	if strings.Join(seen, "\n") != strings.Join(wantSeen, "\n") {
		t.Errorf("upstream saw\n%s\nwant\n%s", strings.Join(seen, "\n"), strings.Join(wantSeen, "\n"))
	}
}

// A new video is written as the caller, and the reply carries the email
// Supabase Auth gave.
func TestVideosPostAsTheCaller(t *testing.T) {
	handler, stand := videosServer(t)
	req := httptest.NewRequest("POST", "/api/repo/videos", strings.NewReader(`{"repoFullName":"octo/demo","videoUrl":"https://youtu.be/dQw4w9WgXcQ"}`))
	req.Header.Set("Authorization", "Bearer session-a")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	want := `{"success":true,"video":{"id":"v9","video_type":"youtube","uploader_name":null,"uploader_email":"a@example.test","uploader_avatar":null}}`
	if rec.Code != 200 || rec.Body.String() != want {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if got := stand.seen[1]; got != "POST /rest/v1/repo_videos?select=*|Bearer session-a|public-key|" {
		t.Errorf("the insert went as %q", got)
	}
}

// A delete goes as the caller and names the caller as the uploader. Other
// methods are not served.
func TestVideosDeleteAsTheCaller(t *testing.T) {
	handler, stand := videosServer(t)
	req := httptest.NewRequest("DELETE", "/api/repo/videos?id=v1", nil)
	req.Header.Set("Authorization", "Bearer session-a")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != 200 || rec.Body.String() != `{"success":true}` {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if got := stand.seen[1]; got != "DELETE /rest/v1/repo_videos?id=eq.v1&uploaded_by=eq.0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b&select=*|Bearer session-a|public-key|" {
		t.Errorf("the delete went as %q", got)
	}
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("PATCH", "/api/repo/videos", nil))
	if rec.Code != 405 {
		t.Errorf("PATCH: %d, want 405", rec.Code)
	}
}
