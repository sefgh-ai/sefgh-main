package lesson06

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"testing"
)

// call runs a handler against a fake request and returns what it answered.
func call(h http.Handler, target string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec
}

func checkJSON(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, want map[string]string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d", rec.Code, wantStatus)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	var got map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("body is not JSON: %v\nbody: %s", err, rec.Body)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("body = %v, want %v", got, want)
	}
}

func TestPing(t *testing.T) {
	rec := call(http.HandlerFunc(ping), "/ping")
	checkJSON(t, rec, http.StatusOK, map[string]string{"status": "ok"})
}

func TestGreet(t *testing.T) {
	rec := call(http.HandlerFunc(greet), "/greet?name=Ada")
	checkJSON(t, rec, http.StatusOK, map[string]string{"message": "Hello, Ada"})
}

func TestGreetNeedsAName(t *testing.T) {
	rec := call(http.HandlerFunc(greet), "/greet")
	checkJSON(t, rec, http.StatusBadRequest, map[string]string{"error": "name is required"})
}

func TestGreetEscapesTheName(t *testing.T) {
	name := `Ada "the first" Lovelace`
	rec := call(http.HandlerFunc(greet), "/greet?name="+url.QueryEscape(name))
	checkJSON(t, rec, http.StatusOK, map[string]string{"message": "Hello, " + name})
}

func TestWithHeader(t *testing.T) {
	called := false
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})
	rec := call(withHeader("X-Sefgh-Backend", "go", inner), "/anything")
	if got := rec.Header().Get("X-Sefgh-Backend"); got != "go" {
		t.Errorf("X-Sefgh-Backend = %q, want go", got)
	}
	if !called {
		t.Error("withHeader did not call the next handler")
	}
}
