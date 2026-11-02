// Package githubaccess verifies a Supabase session and the matching GitHub
// credential online. No SSR cookie or unverified JWT claim is interpreted here.
package githubaccess

import (
	"context"
	"encoding/json"
	"io"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const Message = "GitHub authorization failed"

// DefaultTimeout bounds both identity calls together. A test in cmd/api
// checks that it and the slowest handler still fit inside the server's write
// timeout.
const DefaultTimeout = 4 * time.Second

// bearer matches an Authorization header as the JavaScript checks do with
// /^Bearer (...)$/i. The word is matched in either case, but only in ASCII:
// Go's (?i) would also let the long s and the Kelvin sign stand for s and k
// inside the token, which JavaScript's /i does not.
var bearer = regexp.MustCompile(`^[Bb][Ee][Aa][Rr][Ee][Rr] ([A-Za-z0-9._~+/\-]+=*)$`)
var credential = regexp.MustCompile(`^[A-Za-z0-9._~+/\-]+=*$`)

// maxCredential is the longest session or token accepted, in bytes. The
// patterns above allow only ASCII, so this is also the JavaScript length.
const maxCredential = 8192

type Verifier struct {
	SupabaseURL, SupabaseKey, GitHubURL string
	Client                              *http.Client
	// Timeout replaces DefaultTimeout when it is not zero. Tests shorten it.
	Timeout time.Duration
	// Memory, when set, remembers Supabase's successful answers about a
	// session for MemoryFor (R-042).
	Memory *Memory
}

// Resolve returns only a verified per-user token, or an empty public identity.
// Supabase Auth verifies the session with its configured signing key and expiry.
// GitHub checks token validity; each resource request checks repository access.
//
// Both replies are decoded as "whatever arrived" and then checked field by
// field. P7-02 retired the matching Next GitHub resolver; the retained
// contracts/github-access fixtures still pin each Go boundary case.
func (v Verifier) Resolve(r *http.Request) (string, int) {
	auth, token := r.Header.Get("Authorization"), r.Header.Get("X-GitHub-Token")
	if auth == "" && token == "" {
		return "", 200
	}
	session, ok := sessionToken(r)
	if !ok || !credential.MatchString(token) || len(token) > maxCredential || len(r.Header.Values("X-GitHub-Token")) != 1 {
		return "", 401
	}
	if v.SupabaseURL == "" || v.SupabaseKey == "" {
		return "", 503
	}
	ctx, cancel := v.deadline(r)
	defer cancel()
	reply, status := v.askSupabase(ctx, session)
	if status != 200 {
		return "", status
	}
	user, _ := reply.(map[string]any)
	identities, isList := user["identities"].([]any)
	if !truthy(user["id"]) || truthy(user["is_anonymous"]) || !isList {
		return "", 403
	}
	// Only an identity Supabase itself recorded for the GitHub provider counts.
	linked := make(map[string]bool)
	for _, entry := range identities {
		identity, _ := entry.(map[string]any)
		if id, isText := identity["id"].(string); identity["provider"] == "github" && isText && id != "" {
			linked[id] = true
		}
	}
	if len(linked) == 0 {
		return "", 403
	}
	base := v.GitHubURL
	if base == "" {
		base = "https://api.github.com"
	}
	reply, status = v.askGitHub(ctx, strings.TrimRight(base, "/")+"/user", token)
	if status != 200 {
		return "", status
	}
	account, _ := reply.(map[string]any)
	id, ok := safeInteger(account["id"])
	if !ok || id <= 0 || !linked[strconv.FormatInt(id, 10)] {
		return "", 403
	}
	return token, 200
}

// SessionToken is sessionToken for routes that read a bearer without asking
// Supabase Auth about it first (share, and collect for the database), so
// every route reads the header by the same rules.
func SessionToken(r *http.Request) (string, bool) { return sessionToken(r) }

// sessionToken reads the Supabase session from the request's one
// Authorization header. It answers false for no header, a malformed or
// over-long one, or more than one.
func sessionToken(r *http.Request) (string, bool) {
	match := bearer.FindStringSubmatch(r.Header.Get("Authorization"))
	if len(match) != 2 || len(match[1]) > maxCredential || len(r.Header.Values("Authorization")) != 1 {
		return "", false
	}
	return match[1], true
}

// deadline bounds every identity call made for one request together.
func (v Verifier) deadline(r *http.Request) (context.Context, context.CancelFunc) {
	timeout := v.Timeout
	if timeout == 0 {
		timeout = DefaultTimeout
	}
	return context.WithTimeout(r.Context(), timeout)
}

// askSupabase asks the project's Supabase Auth who a session belongs to. The
// public key goes with it; no other service ever receives that key.
// A successful answer is remembered in v.Memory, if set, for MemoryFor.
func (v Verifier) askSupabase(ctx context.Context, session string) (any, int) {
	key := memoryKey("supabase", session)
	if reply, found := v.Memory.recall(key); found {
		return reply, 200
	}
	reply, status := v.get(ctx, strings.TrimRight(v.SupabaseURL, "/")+"/auth/v1/user", map[string]string{"Authorization": "Bearer " + session, "apikey": v.SupabaseKey})
	if status == 200 {
		v.Memory.keep(key, reply)
	}
	return reply, status
}

// askGitHub asks GitHub whose token this is. Unlike a Supabase session, the
// answer is not remembered: contracts/github-access/isolation.json pins that
// a revoked GitHub token is refused at once, before any private request.
func (v Verifier) askGitHub(ctx context.Context, target, token string) (any, int) {
	return v.get(ctx, target, map[string]string{"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "User-Agent": "SEFGH"})
}

// truthy reports whether JavaScript would treat a decoded JSON value as true.
func truthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case json.Number:
		f, err := v.Float64()
		return err != nil || f != 0
	default:
		return true
	}
}

// safeInteger is JavaScript's Number.isSafeInteger for a decoded JSON value:
// a number with no fraction that a float64 holds exactly.
func safeInteger(value any) (int64, bool) {
	number, isNumber := value.(json.Number)
	if !isNumber {
		return 0, false
	}
	f, err := number.Float64()
	if err != nil || f != math.Trunc(f) || math.Abs(f) > 9007199254740991 {
		return 0, false
	}
	return int64(f), true
}

// get makes one identity call and returns the decoded reply with 200, or a
// status to answer with: 401 when the issuer refused the credential, 503 when
// the issuer could not be asked or did not answer as expected.
func (v Verifier) get(ctx context.Context, target string, headers map[string]string) (any, int) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, 503
	}
	for key, val := range headers {
		req.Header.Set(key, val)
	}
	client := http.Client{}
	if v.Client != nil {
		client = *v.Client
	}
	// Never carry an identity credential across a redirect, even to a subdomain.
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return nil, 503
	}
	defer resp.Body.Close()
	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return nil, 401
	}
	if resp.StatusCode != 200 {
		return nil, 503
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, (1<<20)+1))
	if err != nil || len(body) > 1<<20 {
		return nil, 503
	}
	value, err := jscompat.DecodeJSON(body)
	if err != nil {
		return nil, 503
	}
	return value, 200
}

// Wrap checks direct backend requests too. Private handlers are created per
// request so neither cached data nor an in-flight result is shared across users.
func (v Verifier) Wrap(public http.Handler, private func(string) http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || r.URL.Path == "/api/github/languages" || r.URL.Path == "/api/github/trending" || r.URL.Path == "/api/github/trending-developers" {
			public.ServeHTTP(w, r)
			return
		}
		token, status := v.Resolve(r)
		if token != "" || status != 200 {
			w.Header().Set("Cache-Control", "private, no-store")
		}
		if status != 200 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": Message})
			return
		}
		if token != "" {
			private(token).ServeHTTP(w, r)
		} else {
			public.ServeHTTP(w, r)
		}
	})
}
