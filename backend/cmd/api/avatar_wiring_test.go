package main

import (
	"bytes"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"sync"
	"testing"
)

func TestAvatarUsesTheCallerForStorageAuthAndProfile(t *testing.T) {
	const id = "0f5e9b8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b"
	var mu sync.Mutex
	seen := []string{}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		seen = append(seen, r.Method+" "+r.URL.RequestURI())
		mu.Unlock()
		if r.Header.Get("Authorization") != "Bearer session-a" || r.Header.Get("apikey") != "public-key" || r.Header.Get("X-GitHub-Token") != "" {
			t.Errorf("wrong credentials on %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == "GET" && r.URL.Path == "/auth/v1/user":
			io.WriteString(w, `{"id":"`+id+`"}`)
		case r.Method == "POST" && strings.HasPrefix(r.URL.Path, "/storage/v1/object/avatars/"+id+"/avatar-"):
			data, _ := io.ReadAll(r.Body)
			if string(data) != "PNG" || r.Header.Get("Content-Type") != "image/png" || r.Header.Get("X-Upsert") != "true" {
				t.Error("upload changed")
			}
			io.WriteString(w, `{"Key":"x"}`)
		case r.Method == "PUT" && r.URL.Path == "/auth/v1/user":
			io.WriteString(w, `{"id":"`+id+`"}`)
		case r.Method == "PATCH" && r.URL.RequestURI() == "/rest/v1/profiles?id=eq."+id:
			w.WriteHeader(204)
		case r.Method == "POST" && r.URL.Path == "/storage/v1/object/list/avatars":
			io.WriteString(w, `[]`)
		default:
			t.Errorf("unexpected call %s %s", r.Method, r.URL)
			w.WriteHeader(500)
			io.WriteString(w, `{}`)
		}
	}))
	defer upstream.Close()
	t.Setenv("NEXT_PUBLIC_SUPABASE_URL", upstream.URL)
	t.Setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")
	t.Setenv("GITHUB_TOKEN", "never-use-server-token")
	t.Setenv("GITHUB_PUBLIC_READ_TOKEN", "")
	h := newHandler(slog.New(slog.NewTextHandler(io.Discard, nil)))
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", `form-data; name="avatar"; filename="photo.png"`)
	header.Set("Content-Type", "image/png")
	part, _ := form.CreatePart(header)
	_, _ = io.WriteString(part, "PNG")
	_ = form.Close()
	r := httptest.NewRequest("POST", "/api/upload-avatar", &body)
	r.Header.Set("Content-Type", form.FormDataContentType())
	r.Header.Set("Authorization", "Bearer session-a")
	r.Header.Set("X-GitHub-Token", "ignored-github-token")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"success":true`) {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	mu.Lock()
	before := len(seen)
	mu.Unlock()
	if before != 5 {
		t.Fatalf("calls %v", seen)
	}
	for _, method := range []string{"POST", "GET"} {
		r = httptest.NewRequest(method, "/api/upload-avatar", nil)
		r.Header.Set("Cookie", "sb-fake-session=not-a-bearer")
		w = httptest.NewRecorder()
		h.ServeHTTP(w, r)
		want := 401
		if method == "GET" {
			want = 405
		}
		if w.Code != want {
			t.Errorf("%s status %d want %d", method, w.Code, want)
		}
	}
	mu.Lock()
	defer mu.Unlock()
	if len(seen) != before {
		t.Error("signed-out or wrong method reached upstream")
	}
}
