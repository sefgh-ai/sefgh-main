// Package githubrepos ports the public repository and contents read routes.
package githubrepos

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const defaultBaseURL = "https://api.github.com"
const maxBodyBytes = 16 << 20
const upstreamTimeout = 10 * time.Second

// Handler owns immutable upstream settings. Construct it once per server.
type Handler struct {
	client  *http.Client
	baseURL string
	token   string
	cache   *repoCache
}

func New(client *http.Client, baseURL, token string) *Handler {
	if client == nil {
		client = &http.Client{Timeout: upstreamTimeout}
	}
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	return &Handler{client: client, baseURL: strings.TrimRight(baseURL, "/"), token: token, cache: newCache(256, 64<<20)}
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

func (h *Handler) fetch(ctx context.Context, target, accept string, token bool) (upstreamReply, error) {
	ctx, cancel := context.WithTimeout(ctx, upstreamTimeout)
	defer cancel()
	parsed, err := jscompat.FetchURL(target)
	if err != nil {
		return upstreamReply{}, errors.New("fetch failed")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.baseURL, nil)
	if err != nil {
		return upstreamReply{}, errors.New("fetch failed")
	}
	req.URL = parsed
	req.Host = parsed.Host
	req.Header.Set("Accept", accept)
	req.Header.Set("User-Agent", "SEFGH-NextJS-App")
	if token && h.token != "" {
		req.Header.Set("Authorization", "Bearer "+h.token)
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return upstreamReply{}, errors.New("fetch failed")
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil || len(body) > maxBodyBytes {
		return upstreamReply{}, errors.New("fetch failed")
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
func fail(w http.ResponseWriter, status int, message string) {
	replyJSON(w, status, map[string]string{"error": message})
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
		fail(w, 400, "Owner and name parameters are required")
		return
	}
	target := h.baseURL + "/repos/" + owner + "/" + name
	parsed, err := jscompat.FetchURL(target)
	if err != nil {
		fail(w, 500, "Failed to fetch repository")
		return
	}
	key := parsed.Scheme + "://" + parsed.Host + parsed.RequestURI()
	up, err := h.cache.get(r.Context(), key, func(ctx context.Context) (upstreamReply, error) {
		return h.fetch(ctx, target, "application/vnd.github.v3+json", true)
	})
	if err != nil {
		fail(w, 500, "Failed to fetch repository")
		return
	}
	if !up.ok() {
		if up.status == 404 {
			fail(w, 404, "Repository not found")
		} else {
			fail(w, 500, fmt.Sprintf("GitHub API error: %d", up.status))
		}
		return
	}
	repo, err := decode(up.body)
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	if repo == nil {
		fail(w, 500, "Failed to fetch repository")
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
	target := h.baseURL + "/repos/" + r.PathValue("owner") + "/" + r.PathValue("repo")
	up, err := h.fetch(r.Context(), target, "application/vnd.github.v3+json", false)
	const message = "Failed to fetch repository details"
	if err != nil || !up.ok() {
		fail(w, 500, message)
		return
	}
	repo, err := decode(up.body)
	if err != nil {
		fail(w, 500, message)
		return
	}
	fields, ok := repo.(map[string]any)
	if !ok {
		fail(w, 500, message)
		return
	}
	languagesURL, ok := fields["languages_url"].(string)
	if !ok {
		fail(w, 500, message)
		return
	}
	languagesReply, err := h.fetch(r.Context(), languagesURL, "application/vnd.github.v3+json", false)
	if err != nil {
		fail(w, 500, message)
		return
	}
	var languages any = map[string]any{}
	if languagesReply.ok() {
		languages, err = decode(languagesReply.body)
		if err != nil {
			fail(w, 500, message)
			return
		}
	}
	var readme any
	readmeReply, err := h.fetch(r.Context(), target+"/readme", "application/vnd.github.v3.raw", false)
	if err == nil && readmeReply.ok() {
		readme = strings.TrimPrefix(strings.ToValidUTF8(string(readmeReply.body), "\uFFFD"), "\uFEFF")
	}
	replyJSON(w, 200, map[string]any{"repository": repo, "languages": languages, "readme": readme, "rate_limit": rateLimit(up.header)})
}

func (h *Handler) contents(w http.ResponseWriter, r *http.Request) {
	path, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("path")
	if strings.Contains(path, "..") || strings.HasPrefix(path, "/") || strings.Contains(path, `\`) {
		fail(w, 400, "Invalid path parameter")
		return
	}
	target := h.baseURL + "/repos/" + r.PathValue("owner") + "/" + r.PathValue("repo") + "/contents/" + path
	up, err := h.fetch(r.Context(), target, "application/vnd.github.v3+json", false)
	const message = "Failed to fetch repository contents"
	if err != nil || !up.ok() {
		fail(w, 500, message)
		return
	}
	contents, err := decode(up.body)
	if err != nil {
		fail(w, 500, message)
		return
	}
	replyJSON(w, 200, map[string]any{"contents": contents, "rate_limit": rateLimit(up.header)})
}
