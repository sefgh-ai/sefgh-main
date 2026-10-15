package starred

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

// GitHubTimeout bounds each repository read, as AbortSignal.timeout(10_000)
// does in src/lib/repo/repoData.js.
const GitHubTimeout = 10 * time.Second

// maxRepoBytes bounds one repository reply. GitHub's are a few kilobytes.
const maxRepoBytes = 4 << 20

// publicRepo reads one repository from GitHub, as fetchRepoFromGitHub does,
// and returns its fields only when GitHub says, with an explicit false, that
// it is not private. Anything else gives nothing: an invalid name (GitHub is
// not asked), a failed request, a redirect, an error status, a reply that is
// not one JSON object. No credential is sent; the client's transport may add
// the public read token, which can read only public data (QUOTA-001).
func publicRepo(ctx context.Context, client *http.Client, base, owner, repo string) ([]jscompat.Field, bool) {
	// The rules of src/lib/github/repo-identifiers.js, kept in one place:
	// a name that passes can only ever be one path segment.
	if !githubrepos.ValidOwner(owner) || !githubrepos.ValidRepoName(repo) {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(ctx, GitHubTimeout)
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

// summaryFields are the public fields the starred page shows, in the
// order the Next.js handler writes them.
var summaryFields = []string{"description", "stargazers_count", "forks_count", "language", "topics", "updated_at"}

// summary is repo_data: the fields GitHub sent, in that order. A field
// GitHub left out is left out here too, as JSON.stringify leaves out
// undefined.
func summary(fields []jscompat.Field) []jscompat.Field {
	byName := map[string]jscompat.Field{}
	for _, field := range fields {
		byName[field.Name] = field
	}
	var out []jscompat.Field
	for _, name := range summaryFields {
		if field, present := byName[name]; present {
			out = append(out, field)
		}
	}
	return out
}
