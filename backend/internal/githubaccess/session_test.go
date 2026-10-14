package githubaccess

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// supabaseAnswers stands in for Supabase Auth: every call gets status and
// body. It counts calls and checks each one carries the session and the
// public key, and goes to the project's user endpoint.
func supabaseAnswers(t *testing.T, calls *int, status int, body string) *http.Client {
	return &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		*calls++
		if r.URL.String() != "https://auth.test/auth/v1/user" || r.Header.Get("apikey") != "public-key" || !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
			t.Errorf("identity call to %s with apikey %q and Authorization %q", r.URL, r.Header.Get("apikey"), r.Header.Get("Authorization"))
		}
		return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}
}

func chatRequest(authorization ...string) *http.Request {
	r := httptest.NewRequest("POST", "/api/ai/chat", nil)
	for _, value := range authorization {
		r.Header.Add("Authorization", value)
	}
	return r
}

// Each answer below was produced by src/lib/supabase/verify-bearer.js for the
// same Supabase reply, so the two checks are pinned to each other.
func TestSignedInUserReadsSupabasesReplyAsNextJSDoes(t *testing.T) {
	tests := []struct {
		name   string
		status int
		reply  string
		want   string
		answer int
	}{
		{"a user", 200, `{"id":"user-a"}`, "user-a", 200},
		{"anonymous", 200, `{"id":"user-a","is_anonymous":true}`, "", 401},
		{"anonymous written as the text false", 200, `{"id":"user-a","is_anonymous":"false"}`, "", 401},
		{"not anonymous", 200, `{"id":"user-a","is_anonymous":false}`, "user-a", 200},
		{"anonymous zero", 200, `{"id":"user-a","is_anonymous":0}`, "user-a", 200},
		{"anonymous null", 200, `{"id":"user-a","is_anonymous":null}`, "user-a", 200},
		{"empty id", 200, `{"id":""}`, "", 401},
		{"numeric id", 200, `{"id":101}`, "", 401},
		{"no id", 200, `{}`, "", 401},
		{"null reply", 200, `null`, "", 401},
		{"list reply", 200, `[]`, "", 401},
		{"text reply", 200, `"user-a"`, "", 401},
		{"not JSON", 200, `{broken`, "", 503},
		{"byte-order mark", 200, "\xef\xbb\xbf" + `{"id":"user-a"}`, "user-a", 200},
		{"refused with 401", 401, `{}`, "", 401},
		{"refused with 403", 403, `{}`, "", 401},
		{"server error, even with a user", 500, `{"id":"user-a"}`, "", 503},
		{"201, even with a user", 201, `{"id":"user-a"}`, "", 503},
		{"redirect", 302, ``, "", 503},
		{"id outside ASCII", 200, `{"id":"` + string(rune(0xE9)) + string(rune(0xE8)) + `"}`, string(rune(0xE9)) + string(rune(0xE8)), 200},
		{"repeated id, the last wins", 200, `{"id":"first","id":"second"}`, "second", 200},
	}
	for _, tt := range tests {
		calls := 0
		v := Verifier{SupabaseURL: "https://auth.test/", SupabaseKey: "public-key", Client: supabaseAnswers(t, &calls, tt.status, tt.reply)}
		id, status := v.SignedInUser(chatRequest("Bearer session-a"))
		if id != tt.want || status != tt.answer || calls != 1 {
			t.Errorf("%s: SignedInUser = %q, %d after %d calls; want %q, %d after 1", tt.name, id, status, calls, tt.want, tt.answer)
		}
	}
}

func TestSignedInUserRefusesOnSight(t *testing.T) {
	tests := []struct {
		name          string
		authorization []string
		answer        int
		calls         int
	}{
		{"no header", nil, 401, 0},
		{"another scheme", []string{"Basic abc"}, 401, 0},
		{"no token", []string{"Bearer "}, 401, 0},
		{"two spaces", []string{"Bearer  session-a"}, 401, 0},
		{"a tab", []string{"Bearer\tsession-a"}, 401, 0},
		{"padding in the middle", []string{"Bearer a=b"}, 401, 0},
		{"one character too long", []string{"Bearer " + strings.Repeat("a", 8193)}, 401, 0},
		{"two headers", []string{"Bearer a", "Bearer b"}, 401, 0},
		{"one header listing two", []string{"Bearer a, Bearer b"}, 401, 0},
		// Go's (?i) would accept these two; JavaScript's /i does not.
		{"a long s in the token", []string{"Bearer ab" + string(rune(0x017F))}, 401, 0},
		{"a Kelvin sign in the token", []string{"Bearer " + string(rune(0x212A)) + "ey"}, 401, 0},
		{"lower case", []string{"bearer session-a"}, 200, 1},
		{"upper case", []string{"BEARER session-a"}, 200, 1},
		{"padding at the end", []string{"Bearer abc=="}, 200, 1},
		{"at the length limit", []string{"Bearer " + strings.Repeat("a", 8192)}, 200, 1},
	}
	for _, tt := range tests {
		calls := 0
		v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", Client: supabaseAnswers(t, &calls, 200, `{"id":"user-a"}`)}
		if _, status := v.SignedInUser(chatRequest(tt.authorization...)); status != tt.answer || calls != tt.calls {
			t.Errorf("%s: status %d after %d calls, want %d after %d", tt.name, status, calls, tt.answer, tt.calls)
		}
	}
}

// The session sent to Supabase is the caller's, word for word, and a GitHub
// token the caller also sent goes nowhere.
func TestSignedInUserSendsOnlyTheSession(t *testing.T) {
	var seen []string
	v := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", GitHubURL: "https://github.test",
		Client: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
			seen = append(seen, r.URL.String()+" "+r.Header.Get("Authorization")+" "+r.Header.Get("X-GitHub-Token"))
			return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"id":"user-a"}`))}, nil
		})}}
	r := chatRequest("bearer Session.A~1+/=")
	r.Header.Set("X-GitHub-Token", "gh-a")
	if id, status := v.SignedInUser(r); id != "user-a" || status != 200 {
		t.Fatalf("SignedInUser = %q, %d", id, status)
	}
	if len(seen) != 1 || seen[0] != "https://auth.test/auth/v1/user Bearer Session.A~1+/= " {
		t.Errorf("identity calls: %q", seen)
	}
}

func TestSignedInUserWithoutConfigurationIsUnavailable(t *testing.T) {
	for name, v := range map[string]Verifier{
		"no project URL": {SupabaseKey: "public-key"},
		"no public key":  {SupabaseURL: "https://auth.test"},
	} {
		calls := 0
		v.Client = supabaseAnswers(t, &calls, 200, `{"id":"user-a"}`)
		if id, status := v.SignedInUser(chatRequest("Bearer session-a")); id != "" || status != 503 || calls != 0 {
			t.Errorf("%s: %q, %d after %d calls; want 503 and no call", name, id, status, calls)
		}
	}
}

func TestSignedInUserOutages(t *testing.T) {
	offline := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key",
		Client: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { return nil, errors.New("offline") })}}
	if _, status := offline.SignedInUser(chatRequest("Bearer session-a")); status != 503 {
		t.Errorf("offline: %d, want 503", status)
	}

	big := `{"id":"user-a","padding":"` + strings.Repeat("x", 1<<20) + `"}`
	calls := 0
	oversized := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", Client: supabaseAnswers(t, &calls, 200, big)}
	if _, status := oversized.SignedInUser(chatRequest("Bearer session-a")); status != 503 {
		t.Errorf("reply over 1 MiB: %d, want 503", status)
	}

	slow := Verifier{SupabaseURL: "https://auth.test", SupabaseKey: "public-key", Timeout: 30 * time.Millisecond,
		Client: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
			<-r.Context().Done()
			return nil, r.Context().Err()
		})}}
	started := time.Now()
	if _, status := slow.SignedInUser(chatRequest("Bearer session-a")); status != 503 {
		t.Errorf("no answer: %d, want 503", status)
	}
	if waited := time.Since(started); waited > 2*time.Second {
		t.Errorf("gave up after %v, want about 30ms", waited)
	}
}
