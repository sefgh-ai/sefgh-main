// Package starred ports GET /api/repo/starred at contract version 1: the
// signed-in user's starred repositories, each checked again with GitHub so
// that only metadata GitHub currently calls public is shown. Every case in
// contracts/repo-starred is answered as the Next.js handler answers it, and
// each GitHub read follows contracts/public-repository-reads.
//
// The database is asked as the user through internal/supabaserest, with
// the user's own token. GitHub is asked with no credential of the user's or
// the server's; the transport may add the public read token. The planned
// difference, as for activity: Go reads a Supabase bearer, not the session
// cookie, and the browser sends one (src/lib/supabase/session-fetch.js).
package starred

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/publicrepo"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// DefaultGitHubURL is GitHub's API, the only place repositories are read from.
const DefaultGitHubURL = "https://api.github.com"

// concurrency is how many repositories are read from GitHub at once, as in
// the Next.js handler, which reads them four at a time.
const concurrency = 4

// RefreshBudget bounds all the GitHub reads of one request together. The
// Next.js handler has no such bound, so a long collection and a slow GitHub
// could keep it waiting minutes; this server allows 30 seconds for a whole
// reply. A row not checked within the budget gets no metadata, the same as a
// failed read. A test in cmd/api keeps sign-in, the database and this budget
// inside the server's write timeout.
const RefreshBudget = 14 * time.Second

// Handler answers GET /api/repo/starred. User, Database and GitHub are
// required; GitHubURL and Logger have defaults.
type Handler struct {
	// User says who is calling: their id and their own access token with
	// 200, or another status. In the server it is githubaccess.Verifier.User.
	User func(*http.Request) (id, session string, status int)
	// Database makes the Data API call; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	// GitHub reads repositories. Its transport is the one signed-out reads
	// use; it must never carry a credential of the caller's or GITHUB_TOKEN.
	GitHub    *http.Client
	GitHubURL string
	// Budget replaces RefreshBudget when it is not zero. Tests shorten it.
	Budget time.Duration
	Logger *slog.Logger
}

// errThrows stands for the TypeError the Next.js handler throws on rows it
// cannot read (a null row, rows given as text). It answers 500.
var errThrows = errors.New("rows the handler cannot read")

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
	// Without the project's settings supabase-js cannot build a client.
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, "Internal server error")
		return
	}
	// getUser() reports a refused session and an unreachable Supabase alike;
	// the handler answers 401 to both.
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, nil, []byte(`{"error":"Unauthorized"}`))
		return
	}

	// .from("repo_collections").select("*").eq("user_id", id)
	// .order("created_at", { ascending: false })
	query := strings.Join([]string{
		supabaserest.Param("select", "*"),
		supabaserest.Param("user_id", "eq."+userID),
		supabaserest.Param("order", "created_at.desc"),
	}, "&")
	upstream, raw, err := db.Select(r.Context(), session, "repo_collections", query)
	if err != nil {
		h.fail(w, "database", upstream, err, "Failed to fetch starred repositories")
		return
	}
	data, failed := supabaserest.ReadResult(upstream, raw)
	if failed {
		h.fail(w, "database", upstream, nil, "Failed to fetch starred repositories")
		return
	}
	rows, err := rowsOf(data, raw)
	if err != nil {
		h.fail(w, "rows", upstream, err, "Internal server error")
		return
	}
	entries := make([]entry, len(rows))
	for i, row := range rows {
		if entries[i], err = read(row); err != nil {
			h.fail(w, "rows", upstream, err, "Internal server error")
			return
		}
	}
	h.refresh(r.Context(), entries)

	var body bytes.Buffer
	body.WriteString(`{"repos":[`)
	for i, e := range entries {
		if i > 0 {
			body.WriteByte(',')
		}
		jscompat.WriteObject(&body, e.withRepoData())
	}
	body.WriteString(`],"count":` + strconv.Itoa(len(entries)) + `}`)
	write(w, 200, http.Header{"Cache-Control": {"private, no-store"}}, body.Bytes())
}

// rowsOf is "const rows = repos || []" and the loop over them. Rows that are
// a list are read as written, so their values pass through untouched. A
// truthy value that is not a list has no length, so the loop never runs;
// text has one, and slicing it throws.
func rowsOf(data any, raw []byte) ([]json.RawMessage, error) {
	switch v := data.(type) {
	case []any:
		if len(v) == 0 {
			return nil, nil // also the 404 that supabase-js reads as no rows
		}
		elements, ok := jscompat.Elements([]byte(jscompat.DecodeUTF8(raw)))
		if !ok {
			return nil, errThrows
		}
		return elements, nil
	case string:
		if v != "" {
			return nil, errThrows
		}
	}
	return nil, nil
}

// entry is one row as {...repo} makes it, and what GitHub said about it.
type entry struct {
	fields   []jscompat.Field
	name     string // repo_full_name, when it is text
	repoData []jscompat.Field
	public   bool
}

// read spreads one row as {...repo} does. An object keeps its fields in
// order; a list becomes fields named by index; text becomes one field per
// UTF-16 unit; a number or a boolean has no fields. A null row makes
// repo.repo_full_name throw.
func read(row json.RawMessage) (entry, error) {
	switch jscompat.Kind(row) {
	case 'n':
		return entry{}, errThrows
	case '{':
		fields, ok := jscompat.ObjectFields(row)
		if !ok {
			return entry{}, errThrows
		}
		e := entry{fields: fields}
		for _, field := range fields {
			if field.Name == "repo_full_name" && jscompat.Kind(field.Value) == '"' {
				_ = json.Unmarshal(field.Value, &e.name)
			}
		}
		return e, nil
	case '[':
		elements, _ := jscompat.Elements(row)
		e := entry{}
		for i, element := range elements {
			e.fields = append(e.fields, jscompat.Field{Name: strconv.Itoa(i), Value: element})
		}
		return e, nil
	case '"':
		var text string
		_ = json.Unmarshal(row, &text)
		e := entry{}
		for i, unit := range jscompat.ToUTF16(text) {
			value, _ := jscompat.UTF16{unit}.MarshalJSON()
			e.fields = append(e.fields, jscompat.Field{Name: strconv.Itoa(i), Value: value})
		}
		return e, nil
	}
	return entry{}, nil
}

// refresh asks GitHub about every row whose name is owner/name, at most
// four at a time. A row that is not a public repository keeps no metadata.
func (h *Handler) refresh(ctx context.Context, entries []entry) {
	base := h.GitHubURL
	if base == "" {
		base = DefaultGitHubURL
	}
	budget := h.Budget
	if budget == 0 {
		budget = RefreshBudget
	}
	ctx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()
	slots := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	for i := range entries {
		parts := strings.Split(entries[i].name, "/")
		if entries[i].name == "" || len(parts) != 2 {
			continue
		}
		wg.Add(1)
		slots <- struct{}{}
		go func(e *entry, owner, repo string) {
			defer wg.Done()
			defer func() { <-slots }()
			if fields, ok := publicrepo.Read(ctx, h.GitHub, base, owner, repo); ok {
				e.repoData, e.public = summary(fields), true
			}
		}(&entries[i], parts[0], parts[1])
	}
	wg.Wait()
}

// withRepoData is {...repo, repo_data}: a stored repo_data keeps its place
// and gets the fresh value; otherwise repo_data comes last.
func (e entry) withRepoData() []jscompat.Field {
	value := []byte("null")
	if e.public {
		var buffer bytes.Buffer
		jscompat.WriteObject(&buffer, e.repoData)
		value = buffer.Bytes()
	}
	out := make([]jscompat.Field, 0, len(e.fields)+1)
	replaced := false
	for _, field := range e.fields {
		if field.Name == "repo_data" {
			field.Value, replaced = value, true
		}
		out = append(out, field)
	}
	if !replaced {
		out = append(out, jscompat.Field{Name: "repo_data", Value: value})
	}
	return out
}

// fail logs the stage and the database's status, never the user, the rows
// or the database's own words, and answers 500 with a fixed sentence.
func (h *Handler) fail(w http.ResponseWriter, stage string, upstream int, err error, message string) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "starred", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("starred request failed", attrs...)
	body, _ := json.Marshal(map[string]string{"error": message})
	write(w, 500, nil, body)
}

func write(w http.ResponseWriter, status int, headers http.Header, body []byte) {
	for name, values := range headers {
		w.Header()[name] = values
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
