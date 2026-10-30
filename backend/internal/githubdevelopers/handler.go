// Package githubdevelopers preserves the recorded trending-developers API.
package githubdevelopers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githublimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const DefaultBaseURL = "https://api.github.com"
const Timeout = 25 * time.Second
const MaxConcurrent = 4
const maxBodyBytes = 2 << 20

var defaultClient = &http.Client{Timeout: 10 * time.Second}

// Personal account logins: ASCII letters/digits and single internal hyphens.
// The byte-length check below also counts hyphens toward the 39-byte limit.
var loginPattern = regexp.MustCompile(`^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$`)

// Handler has no token field: the existing route is public-only. Now permits
// deterministic calendar checks without replacing a process-wide clock.
type Handler struct {
	Client  *http.Client
	BaseURL string
	Now     func() time.Time
	// Logger receives one record for each request that fails. nil uses
	// slog.Default().
	Logger *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	q := jscompat.ParseQuery(r.URL.RawQuery)
	since, _ := q.Get("since")
	if since == "" {
		since = "daily"
	}
	if since != "daily" && since != "weekly" && since != "monthly" {
		write(w, 400, map[string]string{"error": "Invalid parameters"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), Timeout)
	defer cancel()
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	days := 1
	switch since {
	case "weekly":
		days = 7
	case "monthly":
		days = 30
	}
	// R-022: fixed elapsed UTC days, with the exact cutoff retained below.
	date := now().UTC().Add(-time.Duration(days) * 24 * time.Hour)
	base := strings.TrimRight(h.BaseURL, "/")
	if base == "" {
		base = DefaultBaseURL
	}
	status, headers, body, err := h.fetch(ctx, base+"/search/users?q=followers:>100+created:>"+date.Format(time.RFC3339)+"&sort=followers&order=desc&per_page=30")
	if err != nil {
		h.fail(w, "search", err)
		return
	}
	if status < 200 || status >= 300 {
		if githublimit.Write(w, status, headers) {
			return
		}
		h.fail(w, "search", fmt.Errorf("GitHub answered %d", status))
		return
	}
	data, _ := body.(map[string]any)
	items, ok := data["items"].([]any)
	if !ok {
		h.fail(w, "search", errors.New("reply has no list of items"))
		return
	}
	// R-027: filter before the cap and URL construction. Invalid entries must
	// neither consume a displayed rank nor trigger an enrichment request.
	users := make([]map[string]any, 0, 20)
	for _, item := range items {
		user, ok := item.(map[string]any)
		login, text := user["login"].(string)
		if !ok || !text || len(login) > 39 || !loginPattern.MatchString(login) {
			continue
		}
		users = append(users, user)
		if len(users) == 20 {
			break
		}
	}
	results := make([]map[string]any, len(users))
	// One error per developer. A nil entry means that developer succeeded.
	errs := make([]error, len(users))
	slots := make(chan struct{}, MaxConcurrent)
	var workers sync.WaitGroup
	for index, user := range users {
		workers.Add(1)
		go func(index int, user map[string]any) {
			defer workers.Done()
			select {
			case slots <- struct{}{}:
			case <-ctx.Done():
				errs[index] = ctx.Err()
				return
			}
			defer func() { <-slots }()
			if ctx.Err() != nil {
				errs[index] = ctx.Err()
				return
			}
			results[index], errs[index] = h.developer(ctx, base, index, user)
		}(index, user)
	}
	// Wait before reading per-index results. Workers never mutate the same slot.
	// Unlike the old Promise.all, no background request outlives this response.
	workers.Wait()
	if ctx.Err() != nil {
		h.fail(w, "deadline", ctx.Err())
		return
	}
	failed := 0
	var first error
	fatal := false
	for index, err := range errs {
		if err != nil {
			failed++
			fatal = fatal || results[index] == nil
			if first == nil {
				first = err
			}
		}
	}
	if fatal {
		h.fail(w, "enrichment", fmt.Errorf("%d of %d developers failed, first: %v", failed, len(users), cause(first)))
		return
	}
	if failed > 0 {
		logger := h.Logger
		if logger == nil {
			logger = slog.Default()
		}
		// One fixed summary, without upstream replies or request addresses.
		logger.Warn("github developers repository lookup unavailable", "stage", "enrichment", "failed", failed)
	}
	write(w, 200, results)
}

// developer receives an object whose login has already passed validation.
// Other optional display fields retain their recorded treatment.
func (h *Handler) developer(ctx context.Context, base string, index int, user map[string]any) (map[string]any, error) {
	name := user["login"].(string)
	// R-025: retain the user even when its repository lookup fails. Only a
	// successful empty array establishes that it has no public repositories.
	result := map[string]any{"rank": index + 1, "popularRepo": map[string]any{
		"name": "Repository unavailable", "description": "This developer’s repositories could not be loaded",
	}, "following": false}
	for target, source := range map[string]string{"id": "id", "name": "login", "username": "login", "avatar": "avatar_url", "url": "html_url"} {
		copyField(result, target, user, source)
	}
	// GitHub's user repositories endpoint cannot sort by stars (sort=stars
	// was ignored), so one page of up to 100 is read and the most-starred
	// chosen (R-026, contract version 2).
	status, _, repos, err := h.fetch(ctx, base+"/users/"+name+"/repos?per_page=100")
	if err != nil {
		return result, err
	}
	if status < 200 || status >= 300 {
		return result, fmt.Errorf("GitHub answered %d", status)
	}
	list, valid := repos.([]any)
	if !valid {
		return result, errors.New("repository reply is not a list")
	}
	for _, item := range list {
		if _, valid := item.(map[string]any); !valid {
			return result, errors.New("repository list contains a non-object")
		}
	}
	popular := map[string]any{"name": "No repositories", "description": "This developer has no public repositories"}
	if len(list) > 0 {
		// The first stays unless a later one has more stars, so a tie
		// keeps the earlier repository.
		best := list[0].(map[string]any)
		for _, item := range list[1:] {
			repo := item.(map[string]any)
			if stars(repo) > stars(best) {
				best = repo
			}
		}
		popular = map[string]any{"description": description(best["description"])}
		copyField(popular, "name", best, "name")
	}
	result["popularRepo"] = popular
	return result, nil
}

// stars is a repository's stargazers_count, or 0 when it is missing or not
// a number.
func stars(repo map[string]any) float64 {
	count, isNumber := repo["stargazers_count"].(json.Number)
	if !isNumber {
		return 0
	}
	value, err := count.Float64()
	if err != nil {
		return 0
	}
	return value
}

func (h *Handler) fetch(ctx context.Context, target string) (int, http.Header, any, error) {
	parsed, err := jscompat.FetchURL(target)
	if err != nil {
		return 0, nil, nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, DefaultBaseURL, nil)
	if err != nil {
		return 0, nil, nil, err
	}
	req.URL, req.Host = parsed, parsed.Host
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "SEFGH-AI-App")
	client := h.Client
	if client == nil {
		client = defaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, resp.Header, nil, nil
	}
	bytes, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return 0, nil, nil, err
	}
	if len(bytes) > maxBodyBytes {
		return 0, nil, nil, errors.New("GitHub reply too large")
	}
	data, err := jscompat.DecodeJSON(bytes)
	if err != nil {
		return 0, nil, nil, err
	}
	return resp.StatusCode, resp.Header, data, nil
}

func copyField(out map[string]any, name string, in map[string]any, key string) {
	if value, ok := in[key]; ok {
		out[name] = value
	}
}
func description(value any) any {
	if value == nil || value == false || value == "" {
		return "No description provided"
	}
	if n, ok := value.(json.Number); ok {
		if f, err := n.Float64(); err == nil && f == 0 {
			return "No description provided"
		}
	}
	return value
}

// cause drops the request URL that net/http puts in its errors.
func cause(err error) error {
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		return urlErr.Err
	}
	return err
}

// fail answers the one generic error the contract allows and tells the
// operator why, in one log record without the request URL.
func (h *Handler) fail(w http.ResponseWriter, stage string, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	logger.Error("github developers request failed", "stage", stage, "error", cause(err))
	write(w, 500, map[string]string{"error": "Failed to fetch trending developers"})
}
func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
