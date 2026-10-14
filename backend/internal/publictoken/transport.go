// Package publictoken adds the server's public read token to GitHub reads
// made for signed-out callers (QUOTA-001). It is the Go counterpart of
// src/lib/github/public-token.js, and both pass contracts/public-read-token.
//
// The owner approved such a token on condition that it can read only public
// data. That is checked, not assumed:
//
//   - It must be a classic personal access token with no scopes. GitHub says
//     so with an empty X-OAuth-Scopes header on GET /user. A fine-grained
//     token sends no such header, so what it can read cannot be checked, and
//     it is refused.
//   - A passed check lasts ten minutes; a refusal is retried after one.
//   - A reply that shows scopes, or a 401, is thrown away and the request is
//     sent again without the token, so data read with a private-capable token
//     is never served.
//   - Only GET requests to the GitHub API origin that carry no Authorization
//     of their own get the token.
//
// The token itself is never logged.
package publictoken

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	// TrustFor is how long a passed check counts.
	TrustFor = 10 * time.Minute
	// RetryAfter is how long a refusal counts before the token is checked again.
	RetryAfter = time.Minute
	// CheckTimeout bounds one check. A test in cmd/api checks that it and the
	// slowest handler still fit inside the server's write timeout.
	CheckTimeout = 4 * time.Second
)

// Transport is an http.RoundTripper that adds the token where the rules
// allow it and sends everything else through Base unchanged.
type Transport struct {
	Token string
	// Origin is the GitHub API origin, such as https://api.github.com.
	Origin string
	Base   http.RoundTripper
	Now    func() time.Time
	Logger *slog.Logger

	mu       sync.Mutex
	usable   bool
	until    time.Time     // the moment the last answer stops counting
	checking chan struct{} // closed when the check in progress ends
}

// Origin returns scheme://host of a URL such as GITHUB_API_URL, as
// JavaScript's URL.origin writes it: lower case, without a default port.
func Origin(base string) string {
	u, err := url.Parse(base)
	if err != nil {
		return ""
	}
	return originOf(u)
}

// originOf reads the scheme and host fields themselves. The GitHub handlers
// build URLs with jscompat.FetchURL, which keeps the path in Opaque, and
// u.String() of such a URL drops the host, so it cannot be parsed again.
func originOf(u *url.URL) string {
	if u.Scheme == "" || u.Host == "" {
		return ""
	}
	scheme, host := strings.ToLower(u.Scheme), strings.ToLower(u.Host)
	if (scheme == "https" && strings.HasSuffix(host, ":443")) || (scheme == "http" && strings.HasSuffix(host, ":80")) {
		host = host[:strings.LastIndex(host, ":")]
	}
	return scheme + "://" + host
}

func (t *Transport) RoundTrip(req *http.Request) (*http.Response, error) {
	if t.Token == "" || req.Method != http.MethodGet || req.Header.Get("Authorization") != "" ||
		originOf(req.URL) != t.Origin || !t.isUsable(req.Context()) {
		return t.base().RoundTrip(req)
	}
	// A RoundTripper must not change the caller's request, so the token goes
	// on a copy. A GET has no body, so the original can be sent again.
	withToken := req.Clone(req.Context())
	withToken.Header.Set("Authorization", "Bearer "+t.Token)
	resp, err := t.base().RoundTrip(withToken)
	if err != nil {
		return nil, err
	}
	scopes := resp.Header.Values("X-OAuth-Scopes")
	if resp.StatusCode != http.StatusUnauthorized && (len(scopes) == 0 || noScopes(scopes)) {
		return resp, nil
	}
	// The token changed since it was checked. This reply may hold data it
	// should not have read: throw it away and ask again without the token.
	resp.Body.Close()
	why := "a reply showed scopes"
	if resp.StatusCode == http.StatusUnauthorized {
		why = "a reply had status 401"
	}
	t.mu.Lock()
	t.usable, t.until = false, t.now().Add(RetryAfter)
	t.mu.Unlock()
	t.log(why)
	return t.base().RoundTrip(req)
}

// isUsable answers from the last check while it counts. Otherwise one caller
// checks, and everyone who arrives meanwhile waits for that answer.
func (t *Transport) isUsable(ctx context.Context) bool {
	for {
		t.mu.Lock()
		if t.now().Before(t.until) {
			usable := t.usable
			t.mu.Unlock()
			return usable
		}
		if t.checking != nil {
			done := t.checking
			t.mu.Unlock()
			select {
			case <-done:
				continue
			case <-ctx.Done():
				return false
			}
		}
		done := make(chan struct{})
		t.checking = done
		t.mu.Unlock()

		usable := t.check(ctx)
		t.mu.Lock()
		t.usable = usable
		t.until = t.now().Add(RetryAfter)
		if usable {
			t.until = t.now().Add(TrustFor)
		}
		t.checking = nil
		close(done)
		t.mu.Unlock()
		return usable
	}
}

// check asks GitHub what the token may do. The caller going away does not
// cut the check short: others may be waiting for its answer.
func (t *Transport) check(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), CheckTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.Origin+"/user", nil)
	if err != nil {
		t.log("the check could not be built")
		return false
	}
	req.Header.Set("Authorization", "Bearer "+t.Token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "SEFGH")
	resp, err := t.base().RoundTrip(req)
	if err != nil {
		t.log("GitHub could not be asked")
		return false
	}
	resp.Body.Close()
	scopes := resp.Header.Values("X-OAuth-Scopes")
	switch {
	case resp.StatusCode != http.StatusOK:
		t.log("status " + strconv.Itoa(resp.StatusCode))
	case len(scopes) == 0:
		t.log("no X-OAuth-Scopes header: not a classic token")
	case !noScopes(scopes):
		t.log("scopes " + strings.Join(scopes, ", "))
	default:
		return true
	}
	return false
}

// noScopes reports whether an X-OAuth-Scopes header that is present lists
// nothing. White space alone counts as nothing.
func noScopes(values []string) bool {
	return strings.TrimSpace(strings.Join(values, "")) == ""
}

func (t *Transport) base() http.RoundTripper {
	if t.Base != nil {
		return t.Base
	}
	return http.DefaultTransport
}

func (t *Transport) now() time.Time {
	if t.Now != nil {
		return t.Now()
	}
	return time.Now()
}

func (t *Transport) log(reason string) {
	logger := t.Logger
	if logger == nil {
		logger = slog.Default()
	}
	logger.Warn("GitHub public read token not used", "reason", reason)
}
