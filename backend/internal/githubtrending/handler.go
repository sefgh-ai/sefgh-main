// Package githubtrending ports the existing trending approximation, including
// the defects explicitly recorded in contracts/github-trending.
package githubtrending

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand/v2"
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
// incoming credentials. Now and Random are injected only for deterministic
// checks; callers supplying them must make them safe for concurrent requests.
type Handler struct {
	Client  *http.Client
	BaseURL string
	Now     func() time.Time
	Random  func() float64
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
	date := now()
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
	search := "stars:>100+created:>" + date.UTC().Format("2006-01-02")
	if language != "" && language != "any" {
		search += "+language:" + language
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
	random := rand.Float64
	if h.Random != nil {
		random = h.Random
	}
	result := make([]map[string]any, 0, len(items))
	for index, item := range items {
		repo, ok := item.(map[string]any)
		if !ok || repo["owner"] == nil {
			h.fail(w, "decode", errors.New("an item is not a repository with an owner"))
			return
		}
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
		out["starsToday"] = math.Floor(random()*500) + 50 // recorded defect; not actual daily stars
		contributor := map[string]any{}
		copyField(contributor, "avatar", owner, "avatar_url")
		copyField(contributor, "name", owner, "login")
		out["contributors"] = []map[string]any{contributor}
		if index < 3 {
			out["heatLevel"] = 3
		} else if index < 10 {
			out["heatLevel"] = 2
		}
		result = append(result, out)
	}
	write(w, 200, result)
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
