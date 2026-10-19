// Package githubtrending ports the trending route at contract version 2,
// including the defects still recorded in contracts/github-trending.
package githubtrending

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const DefaultBaseURL = "https://api.github.com"
const Timeout = 10 * time.Second
const maxBodyBytes = 16 << 20

var languagePattern = regexp.MustCompile(`^[A-Za-z0-9._+\-]{1,50}$`)
var defaultClient = &http.Client{Timeout: Timeout}

// Handler always reads public data. It has no token field and never forwards
// incoming credentials. Now is injected only for deterministic checks; a
// caller supplying it must make it safe for concurrent requests.
type Handler struct {
	Client  *http.Client
	BaseURL string
	Now     func() time.Time
	// Logger receives one record for each request that fails. nil uses
	// slog.Default().
	Logger *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	query := jscompat.ParseQuery(r.URL.RawQuery)
	language, _ := query.Get("language")
	since, _ := query.Get("since")
	if since == "" {
		since = "daily"
	}
	if (since != "daily" && since != "weekly" && since != "monthly") || (language != "" && !languagePattern.MatchString(language)) {
		write(w, 400, map[string]string{"error": "Invalid parameters"})
		return
	}
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	current := now()
	date := current
	switch since {
	case "weekly":
		date = date.AddDate(0, 0, -7)
	case "monthly":
		date = date.AddDate(0, -1, 0)
	default:
		date = date.AddDate(0, 0, -1)
	}
	// AddDate preserves local calendar subtraction and month overflow; only
	// then convert to UTC, matching setDate/setMonth followed by toISOString.
	// GitHub's search terms are separated by spaces. The Next.js handler
	// joined them with "+" and then percent-encoded the whole query, so
	// GitHub received %2B, a literal plus sign, and refused every request
	// with 422 (bug register R-068, fixed here at contract version 3).
	search := "stars:>100 created:>" + date.UTC().Format("2006-01-02")
	if language != "" && language != "any" {
		search += " language:" + language
	}
	base := h.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	u := strings.TrimRight(base, "/") + "/search/repositories?q=" + jscompat.EncodeURIComponent(search) + "&sort=stars&order=desc&per_page=30"
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u, nil)
	if err != nil {
		h.fail(w, "create_request", err)
		return
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "SEFGH-AI-App")
	client := h.Client
	if client == nil {
		client = defaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		h.fail(w, "transport", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		h.fail(w, "status", fmt.Errorf("GitHub answered %d", resp.StatusCode))
		return
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		h.fail(w, "read_body", err)
		return
	}
	if len(body) > maxBodyBytes {
		h.fail(w, "read_body", errors.New("GitHub reply too large"))
		return
	}
	// DecodeJSON reads the reply as response.json() does: it skips a leading
	// byte-order mark and rejects anything after the first value.
	decoded, err := jscompat.DecodeJSON(body)
	if err != nil {
		h.fail(w, "decode", err)
		return
	}
	data, _ := decoded.(map[string]any)
	items, ok := data["items"].([]any)
	if !ok {
		h.fail(w, "decode", errors.New("reply has no list of items"))
		return
	}
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		repo, ok := item.(map[string]any)
		if !ok || repo["owner"] == nil {
			h.fail(w, "decode", errors.New("an item is not a repository with an owner"))
			return
		}
		result = append(result, Item(repo, current))
	}
	write(w, 200, result)
}

// Item is one repository of GitHub's search reply as the trending page shows
// it, given the moment its stars per day are counted to. repo must have an
// owner. The trending topics (internal/trendingtopics) answer in the same
// shape, so the page shows both lists alike.
func Item(repo map[string]any, now time.Time) map[string]any {
	owner, _ := repo["owner"].(map[string]any)
	out := map[string]any{"trending": true, "heatLevel": 1}
	for dest, source := range map[string]string{"id": "id", "name": "name", "stars": "stargazers_count", "forks": "forks_count", "url": "html_url"} {
		copyField(out, dest, repo, source)
	}
	copyField(out, "author", owner, "login")
	out["description"] = fallback(repo["description"], "No description provided")
	out["language"] = fallback(repo["language"], "Unknown")
	if color, present := languageColor(repo["language"]); present {
		out["languageColor"] = color
	}
	perDay := starsPerDay(repo["stargazers_count"], repo["created_at"], now)
	out["starsPerDay"] = perDay
	out["heatLevel"] = heatLevel(perDay)
	contributor := map[string]any{}
	copyField(contributor, "avatar", owner, "avatar_url")
	copyField(contributor, "name", owner, "login")
	out["contributors"] = []map[string]any{contributor}
	return out
}

var createdAtPattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`)

// starsPerDay is the repository's stars per day since it was created, rounded
// down, counting at least one day: contract version 2 (bug register R-020).
// The search asks only for repositories created inside the chosen period, so
// every one of their stars was earned in it. nil (JSON null) without a usable
// count or creation time. Days are counted in whole milliseconds, as
// JavaScript's Date.now() counts them, so both backends floor the same value.
func starsPerDay(stars, createdAt any, now time.Time) any {
	number, isNumber := stars.(json.Number)
	if !isNumber {
		return nil
	}
	count, err := number.Float64()
	if err != nil || math.IsInf(count, 0) || math.IsNaN(count) {
		return nil
	}
	text, isText := createdAt.(string)
	if !isText || !createdAtPattern.MatchString(text) {
		return nil
	}
	created, err := time.Parse(time.RFC3339, text)
	if err != nil {
		return nil
	}
	days := math.Max(1, float64(now.UnixMilli()-created.UnixMilli())/(24*60*60*1000))
	return math.Floor(count / days)
}

// heatLevel is 3 from 100 stars a day, 2 from 25, otherwise 1. It used to be
// the position in the list.
func heatLevel(perDay any) int {
	n, ok := perDay.(float64)
	switch {
	case !ok:
		return 1
	case n >= 100:
		return 3
	case n >= 25:
		return 2
	}
	return 1
}

func copyField(dst map[string]any, name string, src map[string]any, key string) {
	if value, present := src[key]; present {
		dst[name] = value
	}
}

func fallback(value any, replacement string) any {
	if value == nil || value == false || value == "" {
		return replacement
	}
	if number, ok := value.(json.Number); ok {
		if n, err := number.Float64(); err == nil && n == 0 {
			return replacement
		}
	}
	return value
}

func languageColor(language any) (any, bool) {
	name, _ := language.(string)
	colors := map[string]string{
		"JavaScript": "#f1e05a", "TypeScript": "#3178c6", "Python": "#3572A5",
		"Java": "#b07219", "Go": "#00ADD8", "Rust": "#dea584", "C++": "#f34b7d",
		"C#": "#178600", "PHP": "#4F5D95", "Ruby": "#701516", "Swift": "#ffac45",
		"Kotlin": "#A97BFF", "Vue": "#41b883", "React": "#61dafb",
	}
	if color, ok := colors[name]; ok {
		return color, true
	}
	// Preserve the JS object's inherited-property defect until both contracts
	// change: __proto__ serializes as {}, inherited functions are omitted.
	if name == "__proto__" {
		return map[string]any{}, true
	}
	switch name {
	case "constructor", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__":
		return nil, false
	}
	return "#8b949e", true
}

// fail answers the one generic error the contract allows and tells the
// operator why. net/http puts the request URL in its errors; the log record
// carries only the cause.
func (h *Handler) fail(w http.ResponseWriter, stage string, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		err = urlErr.Err
	}
	logger.Error("github trending request failed", "stage", stage, "error", err)
	write(w, 500, map[string]string{"error": "Failed to fetch trending repositories"})
}
func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
