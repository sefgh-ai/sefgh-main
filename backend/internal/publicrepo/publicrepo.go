// Package publicrepo reads one public repository from GitHub, as
// fetchRepoFromGitHub in src/lib/repo/repoData.js does. The starred route
// uses Read for each saved repository, and the repository page asks the
// route below for the one it shows (REPO-PAGE-001). Both pass
// contracts/public-repository-reads.
package publicrepo

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubrepos"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// Timeout bounds each repository read, as AbortSignal.timeout(10_000)
// does in src/lib/repo/repoData.js.
const Timeout = 10 * time.Second

// DefaultBaseURL is GitHub's API.
const DefaultBaseURL = "https://api.github.com"

// maxRepoBytes bounds one repository reply. GitHub's are a few kilobytes.
const maxRepoBytes = 4 << 20

// Read reads one repository from GitHub and returns its fields only when
// GitHub says, with an explicit false, that it is not private. Anything else
// gives nothing: an invalid name (GitHub is not asked), a failed request, a
// redirect, an error status, a reply that is not one JSON object. No
// credential is sent; the client's transport may add the public read token,
// which can read only public data (QUOTA-001).
func Read(ctx context.Context, client *http.Client, base, owner, repo string) ([]jscompat.Field, bool) {
	// The rules of src/lib/github/repo-identifiers.js, kept in one place:
	// a name that passes can only ever be one path segment.
	if !githubrepos.ValidOwner(owner) || !githubrepos.ValidRepoName(repo) {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(base, "/")+"/repos/"+owner+"/"+repo, nil)
	if err != nil {
		return nil, false
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "SEFGH-App")

	// redirect: 'error' in JavaScript: a redirect is a failure, not followed.
	noRedirects := *client
	noRedirects.CheckRedirect = func(*http.Request, []*http.Request) error { return errors.New("redirect refused") }
	resp, err := noRedirects.Do(req)
	if err != nil {
		return nil, false
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, false
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxRepoBytes+1))
	if err != nil || len(raw) > maxRepoBytes {
		return nil, false
	}
	fields, ok := jscompat.ObjectFields([]byte(jscompat.DecodeUTF8(raw)))
	if !ok {
		return nil, false
	}
	// data?.private === false: the JSON value false itself, nothing else.
	for _, field := range fields {
		if field.Name == "private" {
			return fields, bytes.Equal(bytes.TrimSpace(field.Value), []byte("false"))
		}
	}
	return nil, false
}

// Handler serves GET /api/github/public-repo/{owner}/{repo}: 200 with the
// repository's fields as GitHub sent them, or 404 with null wherever Read
// gives nothing, which is what fetchRepoFromGitHub returns then. Nothing is
// cached, so visibility is checked again on every read.
type Handler struct {
	// Client sends the read; give it the transport of signed-out reads.
	Client  *http.Client
	BaseURL string
}

// Register adds the route to mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("GET /api/github/public-repo/{owner}/{repo}", h)
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	client := h.Client
	if client == nil {
		client = &http.Client{Timeout: Timeout}
	}
	base := h.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "private, no-store")
	fields, ok := Read(r.Context(), client, base, r.PathValue("owner"), r.PathValue("repo"))
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		_, _ = io.WriteString(w, "null")
		return
	}
	var body bytes.Buffer
	jscompat.WriteObject(&body, fields)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body.Bytes())
}
