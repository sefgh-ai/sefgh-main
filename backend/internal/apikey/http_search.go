package apikey

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubsearch"
)

const MaxSearchReply = 16 << 20
const RecoveryBudget = time.Second
const MaxSearchQuery = 4 << 10

func publicSearch(options HTTPOptions) (http.Handler, error) {
	base := options.GitHubURL
	if base == "" {
		base = githubsearch.DefaultBaseURL
	}
	u, err := url.Parse(base)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return nil, ErrPolicy
	}
	loopback := u.Hostname() == "localhost" || net.ParseIP(u.Hostname()).IsLoopback()
	if u.Scheme != "https" && !(u.Scheme == "http" && loopback) {
		return nil, ErrPolicy
	}
	timeout := options.GitHubTimeout
	if timeout == 0 {
		timeout = githubsearch.DefaultTimeout
	}
	// Own the transport too: cloning a client can retain credential wrappers,
	// and cloning a Transport can retain registered protocols/proxy callbacks.
	// No caller client, default client/transport, cookie jar or proxy hook is used.
	transport := &http.Transport{
		DialContext:       (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ForceAttemptHTTP2: true, MaxIdleConns: 50, IdleConnTimeout: 30 * time.Second,
		TLSHandshakeTimeout: 5 * time.Second, ExpectContinueTimeout: time.Second,
	}
	client := http.Client{Timeout: timeout, Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	// No token option or inherited request headers. This reuses search parsing
	// and response mapping but suppresses its detailed transport-error logger.
	return &githubsearch.Handler{Client: &client, BaseURL: base, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}, nil
}

func requestID() (string, error) {
	var bytes [16]byte
	if _, err := io.ReadFull(rand.Reader, bytes[:]); err != nil {
		return "", ErrEntropy
	}
	return "req_" + base64.RawURLEncoding.EncodeToString(bytes[:]), nil
}

func (h *HTTP) executeSearch(w http.ResponseWriter, r *http.Request, raw string) {
	if _, err := Parse(raw); err != nil {
		writeHTTPError(w, 401, "Unauthorized")
		return
	}
	if len(r.URL.RawQuery) > MaxSearchQuery {
		writeHTTPError(w, 414, "Query too large")
		return
	}
	id, err := h.newID()
	if err != nil || !identifier(id) {
		writeHTTPError(w, 503, "Service unavailable")
		return
	}
	w.Header().Set("X-Request-Id", id)
	reply := &searchReply{header: make(http.Header)}
	status, err := h.execution.Execute(r.Context(), raw, "public-search", id, func(ctx context.Context) (int, error) {
		// A new request deliberately carries no inbound cookies, bearer,
		// Supabase/GitHub credentials, request IDs or proxy-supplied headers.
		request := &http.Request{Method: "GET", URL: &url.URL{Path: "/api/github/search", RawQuery: r.URL.RawQuery}, Header: make(http.Header)}
		h.search.ServeHTTP(reply, request.WithContext(ctx))
		if ctx.Err() != nil {
			return 500, ctx.Err()
		}
		if reply.overflow || reply.status == 0 || !json.Valid(reply.body.Bytes()) {
			reply.reject()
		}
		if reply.status >= 200 && reply.status < 300 && !publicRows(reply.body.Bytes()) {
			reply.reject()
		}
		if reply.status < 200 || reply.status >= 400 {
			return reply.status, ErrUpstream
		}
		return reply.status, nil
	})
	var completion *CompletionError
	if errors.As(err, &completion) {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), RecoveryBudget)
		defer cancel()
		// The future sink must durably retain the exact safe receipt. A sink
		// failure still refuses success; durable pending reconciliation is a gate.
		_ = h.options.SaveRecovery(ctx, completion.Completion)
		writeHTTPError(w, 503, "Service unavailable")
		return
	}
	if r.Context().Err() != nil {
		writeLifecycleError(w, r.Context().Err())
		return
	}
	if err != nil && !(errors.Is(err, ErrUpstream) && status == reply.status && json.Valid(reply.body.Bytes()) && r.Context().Err() == nil) {
		writeLifecycleError(w, err)
		return
	}
	if retry := reply.header.Get("Retry-After"); retry != "" {
		w.Header().Set("Retry-After", retry)
	}
	w.WriteHeader(status)
	_, _ = w.Write(reply.body.Bytes())
}

// Buffering is required: successful provider output cannot be sent before
// accounting completion succeeds. Writes beyond the bound are never retained.
type searchReply struct {
	header   http.Header
	body     bytes.Buffer
	status   int
	overflow bool
}

func (r *searchReply) Header() http.Header { return r.header }
func (r *searchReply) WriteHeader(status int) {
	if r.status == 0 {
		r.status = status
	}
}
func (r *searchReply) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.status = 200
	}
	if len(body) > MaxSearchReply-r.body.Len() {
		r.overflow = true
		return 0, ErrUpstream
	}
	return r.body.Write(body)
}
func (r *searchReply) reject() {
	r.status = 502
	r.header = make(http.Header)
	r.body.Reset()
	_, _ = r.body.WriteString("{\"error\":\"Public search failed\"}\n")
}

func publicRows(raw []byte) bool {
	var reply struct {
		Items []json.RawMessage `json:"items"`
	}
	if json.Unmarshal(raw, &reply) != nil || reply.Items == nil {
		return false
	}
	for _, row := range reply.Items {
		if !publicRow(row) {
			return false
		}
	}
	return true
}

func publicRow(raw []byte) bool {
	d := json.NewDecoder(bytes.NewReader(raw))
	if token, err := d.Token(); err != nil || token != json.Delim('{') {
		return false
	}
	seen := map[string]bool{}
	public := false
	for d.More() {
		token, err := d.Token()
		name, ok := token.(string)
		if err != nil || !ok || seen[name] {
			return false
		}
		seen[name] = true
		var value json.RawMessage
		if d.Decode(&value) != nil {
			return false
		}
		if strings.EqualFold(name, "private") {
			if name != "private" || string(bytes.TrimSpace(value)) != "false" {
				return false
			}
			public = true
		}
		if strings.EqualFold(name, "visibility") && (name != "visibility" || string(bytes.TrimSpace(value)) != `"public"`) {
			return false
		}
	}
	if token, err := d.Token(); err != nil || token != json.Delim('}') {
		return false
	}
	_, err := d.Token()
	return public && err == io.EOF
}
