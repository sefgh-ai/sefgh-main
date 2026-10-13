// Package githubaccess verifies a Supabase session and the matching GitHub
// credential online. No SSR cookie or unverified JWT claim is interpreted here.
package githubaccess

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const Message = "GitHub authorization failed"

var bearer = regexp.MustCompile(`(?i)^Bearer ([A-Za-z0-9._~+/\-]+=*)$`)
var credential = regexp.MustCompile(`^[A-Za-z0-9._~+/\-]+=*$`)

type Verifier struct {
	SupabaseURL, SupabaseKey, GitHubURL string
	Client                              *http.Client
}

// Resolve returns only a verified per-user token, or an empty public identity.
// Supabase Auth verifies the session with its configured signing key and expiry.
// GitHub checks token validity; each resource request checks repository access.
func (v Verifier) Resolve(r *http.Request) (string, int) {
	auth, token := r.Header.Get("Authorization"), r.Header.Get("X-GitHub-Token")
	if auth == "" && token == "" {
		return "", 200
	}
	session := bearer.FindStringSubmatch(auth)
	if len(session) != 2 || !credential.MatchString(token) || len(session[1]) > 8192 || len(token) > 8192 || len(r.Header.Values("Authorization")) != 1 || len(r.Header.Values("X-GitHub-Token")) != 1 {
		return "", 401
	}
	if v.SupabaseURL == "" || v.SupabaseKey == "" {
		return "", 503
	}
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	var user struct {
		ID         string `json:"id"`
		Anonymous  bool   `json:"is_anonymous"`
		Identities []struct {
			Provider string `json:"provider"`
			ID       string `json:"id"`
		} `json:"identities"`
	}
	status := v.get(ctx, strings.TrimRight(v.SupabaseURL, "/")+"/auth/v1/user", map[string]string{"Authorization": "Bearer " + session[1], "apikey": v.SupabaseKey}, &user)
	if status != 200 {
		return "", status
	}
	if user.ID == "" || user.Anonymous {
		return "", 403
	}
	linked := make(map[string]bool)
	for _, identity := range user.Identities {
		if identity.Provider == "github" && identity.ID != "" {
			linked[identity.ID] = true
		}
	}
	if len(linked) == 0 {
		return "", 403
	}
	base := v.GitHubURL
	if base == "" {
		base = "https://api.github.com"
	}
	var github struct {
		ID int64 `json:"id"`
	}
	status = v.get(ctx, strings.TrimRight(base, "/")+"/user", map[string]string{"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "User-Agent": "SEFGH"}, &github)
	if status != 200 {
		return "", status
	}
	if github.ID <= 0 || github.ID > 9007199254740991 || !linked[strconv.FormatInt(github.ID, 10)] {
		return "", 403
	}
	return token, 200
}

func (v Verifier) get(ctx context.Context, target string, headers map[string]string, value any) int {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return 503
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
		return 503
	}
	defer resp.Body.Close()
	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return 401
	}
	if resp.StatusCode != 200 {
		return 503
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, (1<<20)+1))
	if err != nil || len(body) > 1<<20 || json.Unmarshal(body, value) != nil {
		return 503
	}
	return 200
}

// Wrap checks direct backend requests too. Private handlers are created per
// request so neither cached data nor an in-flight result is shared across users.
func (v Verifier) Wrap(public http.Handler, private func(string) http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || r.URL.Path == "/api/github/languages" || r.URL.Path == "/api/github/trending" {
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
