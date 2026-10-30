// Package githubrepos ports the public repository and contents read routes.
package githubrepos

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githublimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const defaultBaseURL = "https://api.github.com"
const maxBodyBytes = 16 << 20
const upstreamTimeout = 10 * time.Second

// DetailTimeout bounds the whole detail route, which makes three calls to
// GitHub one after another. Each call has its own upstreamTimeout, so without
// this the route could take 30 seconds. It must stay below the server's
// write timeout, or a slow GitHub would get the caller a dropped connection
// in place of a JSON reply. A test in cmd/api checks that.
const DetailTimeout = 25 * time.Second

// Handler owns immutable upstream settings. Construct it once per server.
type Handler struct {
	// Logger is configured before serving; nil uses slog.Default().
	Logger  *slog.Logger
	client  *http.Client
	baseURL string
	token   string
	cache   *repoCache
	// detailTimeout is DetailTimeout, shortened in tests.
	detailTimeout time.Duration
}

func New(client *http.Client, baseURL, token string) *Handler {
	if client == nil {
		client = &http.Client{Timeout: upstreamTimeout}
	}
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	h := &Handler{client: client, baseURL: strings.TrimRight(baseURL, "/"), token: token, cache: newCache(256, 64<<20), detailTimeout: DetailTimeout}
	if token != "" {
		privateClient := *client
		privateClient.CheckRedirect = func(*http.Request, []*http.Request) error { return errors.New("authenticated redirect refused") }
		h.client = &privateClient
	}
	h.cache.logPanic = func() { h.logger().Error("repository cache loader panicked") }
	return h
}

func (h *Handler) logger() *slog.Logger {
	if h.Logger != nil {
		return h.Logger
	}
	return slog.Default()
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/github/repo", h.summary)
	mux.HandleFunc("GET /api/github/repo/{owner}/{repo}", h.detail)
	mux.HandleFunc("GET /api/github/contents/{owner}/{repo}", h.contents)
}

type upstreamReply struct {
	status int
	header http.Header
	body   []byte
}

func (h *Handler) fetch(ctx context.Context, target, accept string, token bool) (result upstreamReply, err error) {
	ctx, cancel := context.WithTimeout(ctx, upstreamTimeout)
	defer cancel()
	stage := "normalize_url"
	defer func() {
		if err != nil {
			// net/http errors include the request URL. Preserve their underlying
			// cause for operators without logging URLs, bodies or credentials.
			cause := err
			var urlErr *url.Error
			if errors.As(err, &urlErr) {
				cause = urlErr.Err
			}
			h.logger().Error("github repository upstream failed", "stage", stage, "error", cause)
		} else if !result.ok() {
			h.logger().Warn("github repository upstream status", "status", result.status)
		}
	}()
	parsed, err := jscompat.FetchURL(target)
	if err != nil {
		return upstreamReply{}, fmt.Errorf("normalize upstream URL: %w", err)
	}
	if h.token != "" {
		base, baseErr := url.Parse(h.baseURL)
		if baseErr != nil || parsed.Scheme != base.Scheme || parsed.Host != base.Host {
			return upstreamReply{}, errors.New("untrusted GitHub URL")
		}
	}
	stage = "create_request"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.baseURL, nil)
	if err != nil {
		return upstreamReply{}, fmt.Errorf("create upstream request: %w", err)
	}
	req.URL = parsed
	req.Host = parsed.Host
	req.Header.Set("Accept", accept)
	req.Header.Set("User-Agent", "SEFGH-NextJS-App")
	if token && h.token != "" {
		req.Header.Set("Authorization", "Bearer "+h.token)
	}
	stage = "transport"
	resp, err := h.client.Do(req)
	if err != nil {
		return upstreamReply{}, fmt.Errorf("send upstream request: %w", err)
	}
	defer resp.Body.Close()
	stage = "read_body"
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return upstreamReply{}, fmt.Errorf("read upstream body: %w", err)
	}
	if len(body) > maxBodyBytes {
		return upstreamReply{}, fmt.Errorf("upstream body exceeds %d bytes", maxBodyBytes)
	}
	return upstreamReply{resp.StatusCode, resp.Header, body}, nil
}

func (u upstreamReply) ok() bool { return u.status >= 200 && u.status < 300 }

func decode(body []byte) (any, error) {
	var value any
	if err := json.Unmarshal(bytes.TrimPrefix(body, []byte{0xef, 0xbb, 0xbf}), &value); err != nil {
		return nil, errors.New("Failed to fetch repository")
	}
	return value, nil
}

func replyJSON(w http.ResponseWriter, status int, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		status = 500
		data = []byte(`{"error":"Failed to fetch repository"}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(data)
}
func (h *Handler) fail(w http.ResponseWriter, status int, message string) {
	if status >= 500 {
		h.logger().Error("github repository request failed", "status", status, "error", message)
	}
	replyJSON(w, status, map[string]string{"error": message})
}

// requiredFailure classifies a required GitHub lookup. Optional enrichment
// fallbacks remain at their call sites. Never pass the upstream body through.
func (h *Handler) requiredFailure(w http.ResponseWriter, up upstreamReply, err error, message string) bool {
	if err != nil {
		h.fail(w, http.StatusBadGateway, message)
		return true
	}
	if up.ok() {
		return false
	}
	if githublimit.Write(w, up.status, up.header) {
		return true
	}
	if up.status == http.StatusNotFound {
		h.fail(w, http.StatusNotFound, "Repository not found")
	} else {
		h.fail(w, http.StatusBadGateway, message)
	}
	return true
}
func rateLimit(h http.Header) map[string]any {
	result := map[string]any{"remaining": nil, "reset": nil}
	for field, name := range map[string]string{"remaining": "X-Ratelimit-Remaining", "reset": "X-Ratelimit-Reset"} {
		if values := h.Values(name); len(values) > 0 {
			result[field] = strings.Join(values, ", ")
		}
	}
	return result
}

var summaryFields = []string{"id", "full_name", "name", "owner", "html_url", "description", "stargazers_count", "forks_count", "language", "topics", "license", "created_at", "updated_at", "pushed_at", "homepage", "clone_url", "default_branch", "open_issues_count", "watchers_count", "size"}

func (h *Handler) summary(w http.ResponseWriter, r *http.Request) {
	params := jscompat.ParseQuery(r.URL.RawQuery)
	owner, _ := params.Get("owner")
	name, _ := params.Get("name")
	if owner == "" || name == "" {
		h.fail(w, 400, "Owner and name parameters are required")
		return
	}
	if !validOwner(owner) || !validRepoName(name) {
		h.fail(w, 400, msgInvalidRepository)
		return
	}
	target := h.baseURL + "/repos/" + owner + "/" + name
	parsed, err := jscompat.FetchURL(target)
	if err != nil {
		h.fail(w, 500, "Failed to fetch repository")
		return
	}
	key := parsed.Scheme + "://" + parsed.Host + parsed.RequestURI()
	load := func(ctx context.Context) (upstreamReply, error) {
		return h.fetch(ctx, target, "application/vnd.github.v3+json", true)
	}
	var up upstreamReply
	if h.token != "" {
		up, err = load(r.Context()) // Recheck permissions; never reuse private data.
	} else {
		up, err = h.cache.get(r.Context(), key, load)
	}
	if h.requiredFailure(w, up, err, "Failed to fetch repository") {
		return
	}
	repo, err := decode(up.body)
	if err != nil {
		h.fail(w, 500, err.Error())
		return
	}
	if repo == nil {
		h.fail(w, 500, "Failed to fetch repository")
		return
	}
	result := map[string]any{}
	if fields, ok := repo.(map[string]any); ok {
		for _, key := range summaryFields {
			if value, present := fields[key]; present {
				result[key] = value
			}
		}
	}
	replyJSON(w, 200, result)
}

func (h *Handler) detail(w http.ResponseWriter, r *http.Request) {
	owner, repoName := r.PathValue("owner"), r.PathValue("repo")
	if !validOwner(owner) || !validRepoName(repoName) {
		h.fail(w, 400, msgInvalidRepository)
		return
	}
	// One deadline for all three calls below.
	ctx, cancel := context.WithTimeout(r.Context(), h.detailTimeout)
	defer cancel()

	target := h.baseURL + "/repos/" + owner + "/" + repoName
	up, err := h.fetch(ctx, target, "application/vnd.github.v3+json", true)
	const message = "Failed to fetch repository details"
	if h.requiredFailure(w, up, err, message) {
		return
	}
	repo, err := decode(up.body)
	if err != nil {
		h.fail(w, 500, message)
		return
	}
	fields, ok := repo.(map[string]any)
	if !ok {
		h.fail(w, 500, message)
		return
	}
	languagesURL, ok := fields["languages_url"].(string)
	if !ok {
		h.fail(w, 500, message)
		return
	}
	languagesReply, err := h.fetch(ctx, languagesURL, "application/vnd.github.v3+json", true)
	if err != nil {
		h.fail(w, 502, message)
		return
	}
	var languages any = map[string]any{}
	if languagesReply.ok() {
		languages, err = decode(languagesReply.body)
		if err != nil {
			h.fail(w, 500, message)
			return
		}
	}
	var readme any
	readmeReply, err := h.fetch(ctx, target+"/readme", "application/vnd.github.v3.raw", true)
	if err == nil && readmeReply.ok() {
		// README files are not always UTF-8. Decode them as JavaScript's
		// Response.text() does, so both backends return the same string.
		readme = jscompat.DecodeUTF8(readmeReply.body)
	}
	replyJSON(w, 200, map[string]any{"repository": repo, "languages": languages, "readme": readme, "rate_limit": rateLimit(up.header)})
}

func (h *Handler) contents(w http.ResponseWriter, r *http.Request) {
	owner, repoName := r.PathValue("owner"), r.PathValue("repo")
	if !validOwner(owner) || !validRepoName(repoName) {
		h.fail(w, 400, msgInvalidRepository)
		return
	}
	path, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("path")
	encodedPath, ok := encodeContentsPath(path)
	if !ok {
		h.fail(w, 400, "Invalid path parameter")
		return
	}
	target := h.baseURL + "/repos/" + owner + "/" + repoName + "/contents/" + encodedPath
	up, err := h.fetch(r.Context(), target, "application/vnd.github.v3+json", true)
	const message = "Failed to fetch repository contents"
	if h.requiredFailure(w, up, err, message) {
		return
	}
	contents, err := decode(up.body)
	if err != nil {
		h.fail(w, 500, message)
		return
	}
	replyJSON(w, 200, map[string]any{"contents": contents, "rate_limit": rateLimit(up.header)})
}
