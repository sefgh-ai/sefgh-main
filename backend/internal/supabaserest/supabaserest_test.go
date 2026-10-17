package supabaserest

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

// Each answer was checked against postgrest-js 2.78 (PostgrestBuilder.then)
// with the same status and body.
func TestReadResultFollowsSupabaseJS(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
		data   any
		failed bool
	}{
		{"rows", 200, `[{"activity_date":"2026-10-14"}]`, []any{map[string]any{"activity_date": "2026-10-14"}}, false},
		{"no body", 200, ``, nil, false},
		{"byte-order mark only", 200, "\xef\xbb\xbf", nil, false},
		{"not JSON", 200, `{broken`, nil, true},
		{"206 is a success", 206, `[]`, []any{}, false},
		{"an error", 403, `{"message":"permission denied"}`, nil, true},
		{"an error that is not JSON", 500, `Bad gateway`, nil, true},
		{"an error whose body is null", 500, `null`, nil, false},
		{"an error whose body is false", 500, `false`, nil, false},
		{"an error whose body is 0", 500, `0`, nil, false},
		{"an error whose body is empty text", 500, `""`, nil, false},
		{"an error whose body is a list", 500, `[]`, nil, true},
		{"404 with a list is no rows", 404, `[]`, []any{}, false},
		{"404 with a full list is still no rows", 404, `[1,2]`, []any{}, false},
		{"404 with no body", 404, ``, nil, false},
		{"404 with an object", 404, `{"message":"not found"}`, nil, true},
		{"a redirect", 302, ``, nil, true},
	}
	for _, tt := range tests {
		data, failed := ReadResult(tt.status, []byte(tt.body))
		got, _ := json.Marshal(data)
		want, _ := json.Marshal(tt.data)
		if failed != tt.failed || !bytes.Equal(got, want) {
			t.Errorf("%s: ReadResult = %s, %v; want %s, %v", tt.name, got, failed, want, tt.failed)
		}
	}
}

// The query postgrest-js 2.78 writes for
// .select("*").eq("share_token", t).is("deleted_at", null): URLSearchParams
// keeps "*" and encodes "~", where url.QueryEscape does the opposite.
func TestParamWritesWhatSupabaseJSWrites(t *testing.T) {
	got := strings.Join([]string{
		Param("select", "*"),
		Param("share_token", "eq.a b&c=d+e/é*~'()!"),
		Param("deleted_at", "is.null"),
	}, "&")
	want := "select=*&share_token=eq.a+b%26c%3Dd%2Be%2F%C3%A9*%7E%27%28%29%21&deleted_at=is.null"
	if got != want {
		t.Errorf("query\n got  %s\n want %s", got, want)
	}
}

type recordRoundTrip struct{ requests []*http.Request }

func (r *recordRoundTrip) RoundTrip(req *http.Request) (*http.Response, error) {
	r.requests = append(r.requests, req)
	return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{}`)), Header: http.Header{}, Request: req}, nil
}

// .single() asks for one row as an object; a plain select does not.
func TestSelectObjectAsksForOneRow(t *testing.T) {
	record := &recordRoundTrip{}
	c := Client{HTTP: &http.Client{Transport: record}, URL: "https://project.invalid/", Key: "public-key"}
	if _, _, err := c.SelectObject(context.Background(), "token-a", "shared_conversations", "select=id"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := c.Select(context.Background(), "token-a", "repo_collections", "select=id"); err != nil {
		t.Fatal(err)
	}
	one, many := record.requests[0], record.requests[1]
	if got := one.URL.String(); got != "https://project.invalid/rest/v1/shared_conversations?select=id" {
		t.Errorf("SelectObject asked %s", got)
	}
	if got := one.Header.Get("Accept"); got != "application/vnd.pgrst.object+json" {
		t.Errorf("SelectObject Accept %q", got)
	}
	if got := many.Header.Get("Accept"); got != "" {
		t.Errorf("Select Accept %q, want none", got)
	}
	for _, req := range record.requests {
		if req.Header.Get("Authorization") != "Bearer token-a" || req.Header.Get("apikey") != "public-key" {
			t.Errorf("%s: not asked as the caller with the public key", req.URL)
		}
	}
}

// Writes carry the headers postgrest-js 2.78 sends: the schema in
// Content-Profile and a JSON Content-Type, with or without a body.
func TestWritesAskAsTheCaller(t *testing.T) {
	record := &recordRoundTrip{}
	c := Client{HTTP: &http.Client{Transport: record}, URL: "https://project.invalid", Key: "public-key"}
	if _, _, err := c.Insert(context.Background(), "token-a", "repo_collections", []byte(`{"user_id":"a"}`)); err != nil {
		t.Fatal(err)
	}
	if _, _, err := c.Delete(context.Background(), "token-a", "repo_collections", "user_id=eq.a"); err != nil {
		t.Fatal(err)
	}
	insert, remove := record.requests[0], record.requests[1]
	if insert.Method != "POST" || insert.URL.String() != "https://project.invalid/rest/v1/repo_collections" {
		t.Errorf("insert: %s %s", insert.Method, insert.URL)
	}
	if body, _ := io.ReadAll(insert.Body); string(body) != `{"user_id":"a"}` {
		t.Errorf("insert body %q", body)
	}
	if remove.Method != "DELETE" || remove.URL.String() != "https://project.invalid/rest/v1/repo_collections?user_id=eq.a" {
		t.Errorf("delete: %s %s", remove.Method, remove.URL)
	}
	for _, req := range record.requests {
		if req.Header.Get("Content-Profile") != "public" || req.Header.Get("Content-Type") != "application/json" || req.Header.Get("Accept-Profile") != "" {
			t.Errorf("%s: headers %v", req.Method, req.Header)
		}
		if req.Header.Get("Authorization") != "Bearer token-a" || req.Header.Get("apikey") != "public-key" {
			t.Errorf("%s: not asked as the caller with the public key", req.Method)
		}
	}
}
