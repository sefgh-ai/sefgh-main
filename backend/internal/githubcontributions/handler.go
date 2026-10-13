// Package githubcontributions serves GET /api/github/contributions: one
// user's GitHub contribution calendar for about the last year, as a grid of
// days with summary statistics.
//
// Its behaviour is fixed by contracts/github-contributions/cases.json, which
// the Next.js handler in src/app/api/github/contributions/route.js follows
// too. Several recorded behaviours are marked "defect" there. They are
// reproduced here on purpose until the owner decides otherwise.
package githubcontributions

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const (
	// DefaultBaseURL is GitHub's API origin. The GraphQL endpoint is
	// BaseURL + "/graphql".
	DefaultBaseURL = "https://api.github.com"

	// DefaultTimeout bounds the call to GitHub. The Next.js handler sets no
	// timeout; this difference is recorded in docs/adr/0002-go-backend.md.
	DefaultTimeout = 10 * time.Second

	// maxBodyBytes bounds how much of GitHub's reply is read. A year of
	// contribution days is a few tens of kilobytes.
	maxBodyBytes = 16 << 20
)

// Messages the caller sees.
const (
	msgUsernameRequired = "Username is required"
	msgUsernameInvalid  = "Invalid GitHub username format"
	msgNoToken          = "GitHub token not configured"
	msgUpstreamStatus   = "Failed to fetch GitHub data"
	msgGraphQLFailed    = "GraphQL query failed"
	msgUserNotFound     = "User not found"
	msgInternal         = "Internal server error"
)

// A GitHub login: 1 to 39 letters or digits, with single hyphens only
// between them. The same pattern as the Next.js handler.
var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$`)

var defaultClient = &http.Client{Timeout: DefaultTimeout}

// Handler serves GET /api/github/contributions. The zero value is usable,
// although without a Token every valid request answers 500.
type Handler struct {
	// Client sends the request to GitHub. Nil means a client with DefaultTimeout.
	Client *http.Client
	// BaseURL is the GitHub API origin, without a trailing slash.
	// Empty means DefaultBaseURL.
	BaseURL string
	// Token is the verified caller's GitHub token. GraphQL needs a credential.
	Token string
	// Logger records failures. Nil means slog.Default().
	Logger *slog.Logger
	// Now returns the current time. Nil means time.Now. Tests set it, so
	// that a date range can be checked without waiting for a real date.
	Now func() time.Time
	// Location is the time zone the date range is worked out in. Nil means
	// the zone of the machine the server runs on, as in the Next.js handler.
	Location *time.Location
}

type graphQLRequest struct {
	Query     string           `json:"query"`
	Variables graphQLVariables `json:"variables"`
}

type graphQLVariables struct {
	Username string `json:"username"`
	From     string `json:"from"`
	To       string `json:"to"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	username, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("username")
	if username == "" {
		writeError(w, http.StatusBadRequest, msgUsernameRequired)
		return
	}
	if !usernamePattern.MatchString(username) {
		writeError(w, http.StatusBadRequest, msgUsernameInvalid)
		return
	}
	if h.Token == "" {
		h.logger().Error("github contributions: no server token configured")
		writeError(w, http.StatusInternalServerError, msgNoToken)
		return
	}

	from, to := dateRange(h.now(), h.location())
	status, body, err := h.askGitHub(r, graphQLVariables{Username: username, From: from, To: to})
	if err != nil {
		h.fail(w, r, err)
		return
	}
	if status < 200 || status > 299 {
		h.logger().Warn("github contributions: upstream status", "status", status)
		// The Next.js handler hands GitHub's status to the caller. It can
		// only do that for a status a response may carry with a body.
		if status < 300 || status > 599 || status == http.StatusNotModified {
			writeError(w, http.StatusInternalServerError, msgInternal)
			return
		}
		writeError(w, status, msgUpstreamStatus)
		return
	}

	var reply any
	if err := json.Unmarshal(bytes.TrimPrefix(body, []byte{0xEF, 0xBB, 0xBF}), &reply); err != nil {
		h.fail(w, r, fmt.Errorf("decoding GitHub reply: %w", err))
		return
	}
	if reply == nil {
		h.fail(w, r, errors.New("GitHub reply is null"))
		return
	}

	// From here the checks follow the JavaScript expression by expression.
	// property() answers what `value.name` would give there.
	if errs, _ := property(reply, "errors"); truthy(errs) {
		h.logger().Warn("github contributions: GraphQL errors received")
		writeError(w, http.StatusBadRequest, msgGraphQLFailed)
		return
	}
	data, _ := property(reply, "data")
	user, _ := property(data, "user")
	if !truthy(user) {
		writeError(w, http.StatusNotFound, msgUserNotFound)
		return
	}

	result, err := summarize(user)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// askGitHub sends the GraphQL request and returns GitHub's status and body.
func (h *Handler) askGitHub(r *http.Request, variables graphQLVariables) (int, []byte, error) {
	payload, err := json.Marshal(graphQLRequest{Query: query, Variables: variables})
	if err != nil {
		return 0, nil, fmt.Errorf("encoding GraphQL request: %w", err)
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, h.baseURL()+"/graphql", bytes.NewReader(payload))
	if err != nil {
		return 0, nil, fmt.Errorf("building GitHub request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+h.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client().Do(req)
	if err != nil {
		// A *url.Error repeats the request URL. Keep only its cause.
		var urlErr *url.Error
		if errors.As(err, &urlErr) {
			err = urlErr.Err
		}
		return 0, nil, fmt.Errorf("calling GitHub: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return 0, nil, fmt.Errorf("reading GitHub reply: %w", err)
	}
	if len(body) > maxBodyBytes {
		return 0, nil, fmt.Errorf("GitHub reply exceeds %d bytes", maxBodyBytes)
	}
	return resp.StatusCode, body, nil
}

// errShape reports a reply whose structure the JavaScript would fail on.
var errShape = errors.New("GitHub reply does not have the expected shape")

// dayRecord is one day, kept for working out the streak.
type dayRecord struct {
	when    time.Time
	hasDate bool
	count   any
}

// summarize turns GitHub's calendar for one user into the grid and statistics.
func summarize(user any) (map[string]any, error) {
	collection, ok := property(user, "contributionsCollection")
	if !ok || collection == nil {
		return nil, errShape
	}
	calendar, ok := property(collection, "contributionCalendar")
	if !ok || calendar == nil {
		return nil, errShape
	}
	weeksValue, _ := property(calendar, "weeks")
	weeks, ok := weeksValue.([]any)
	if !ok {
		return nil, errShape
	}
	total, hasTotal := property(calendar, "totalContributions")

	grid := make([][]map[string]any, 0, len(weeks))
	var days []dayRecord
	maxCount, activeDays := 0.0, 0
	for weekIndex, week := range weeks {
		daysValue, _ := property(week, "contributionDays")
		list, ok := daysValue.([]any)
		if !ok {
			return nil, errShape
		}
		row := make([]map[string]any, 0, len(list))
		for dayIndex, day := range list {
			if day == nil {
				return nil, errShape
			}
			// A field GitHub left out is left out of the reply too.
			entry := map[string]any{"weekIndex": weekIndex, "dayOfWeekIndex": dayIndex}
			record := dayRecord{}
			if date, ok := property(day, "date"); ok {
				entry["date"] = date
				record.when, record.hasDate = parseDate(date)
			}
			if color, ok := property(day, "color"); ok {
				entry["color"] = color
			}
			if count, ok := property(day, "contributionCount"); ok {
				entry["count"] = count
				record.count = count
				if n, isNumber := count.(float64); isNumber {
					maxCount = max(maxCount, n)
					if n > 0 {
						activeDays++
					}
				}
			}
			row = append(row, entry)
			days = append(days, record)
		}
		grid = append(grid, row)
	}

	stats := map[string]any{
		"maxCount":      maxCount,
		"currentStreak": currentStreak(days),
		"averagePerDay": average(total, hasTotal, len(days)),
		"activeDays":    activeDays,
		"totalDays":     len(days),
	}
	if hasTotal {
		stats["totalContributions"] = total
	}
	return map[string]any{"grid": grid, "stats": stats}, nil
}

// currentStreak counts days with contributions, from the newest day
// backwards, stopping at the first day without any. A newest day that is
// still empty therefore gives 0, which the contract records as a defect.
func currentStreak(days []dayRecord) int {
	sorted := append([]dayRecord(nil), days...)
	// Newest first. Days with equal dates keep their order, as in JavaScript.
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].hasDate && sorted[j].hasDate && sorted[i].when.After(sorted[j].when)
	})
	streak := 0
	for _, day := range sorted {
		n, isNumber := day.count.(float64)
		if !isNumber || n <= 0 {
			break
		}
		streak++
	}
	return streak
}

// average is totalContributions divided by the number of days, to one
// decimal place. It returns nil, written as JSON null, where JavaScript
// would produce "not a number".
func average(total any, hasTotal bool, totalDays int) any {
	if totalDays == 0 {
		return 0
	}
	switch t := total.(type) {
	case float64:
		return toFixed1(t / float64(totalDays))
	case nil:
		if hasTotal {
			return 0 // JavaScript treats null as 0 in arithmetic.
		}
	}
	return nil
}

// parseDate reads the "YYYY-MM-DD" dates GitHub sends.
func parseDate(value any) (time.Time, bool) {
	text, ok := value.(string)
	if !ok {
		return time.Time{}, false
	}
	t, err := time.Parse("2006-01-02", text)
	return t, err == nil
}

// property answers what JavaScript's `value.name` gives for a decoded JSON
// value: the member when value is an object that has it, and "undefined"
// (false) for anything else. Reading a property of null is an error in
// JavaScript, so callers check for nil where that matters.
func property(value any, name string) (any, bool) {
	object, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	member, ok := object[name]
	return member, ok
}

// truthy reports whether JavaScript would treat a decoded JSON value as true
// in a condition: everything except null, false, 0 and the empty string.
func truthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case float64:
		return v != 0
	case string:
		return v != ""
	}
	return true
}

// fail answers 500 the way the Next.js handler's catch block does.
func (h *Handler) fail(w http.ResponseWriter, r *http.Request, err error) {
	if r.Context().Err() != nil {
		// The caller has gone away, so there is no one to answer.
		h.logger().Info("github contributions canceled", "error", err)
		return
	}
	h.logger().Error("github contributions failed", "error", err)
	writeError(w, http.StatusInternalServerError, msgInternal)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// writeJSON sends v as the JSON body. It sets no Cache-Control header,
// matching the Next.js handler.
func writeJSON(w http.ResponseWriter, status int, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		status = http.StatusInternalServerError
		data = []byte(`{"error":"` + msgInternal + `"}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(data)
}

func (h *Handler) client() *http.Client {
	if h.Client != nil {
		return h.Client
	}
	return defaultClient
}

func (h *Handler) baseURL() string {
	if h.BaseURL != "" {
		return strings.TrimSuffix(h.BaseURL, "/")
	}
	return DefaultBaseURL
}

func (h *Handler) logger() *slog.Logger {
	if h.Logger != nil {
		return h.Logger
	}
	return slog.Default()
}

func (h *Handler) now() time.Time {
	if h.Now != nil {
		return h.Now()
	}
	return time.Now()
}

func (h *Handler) location() *time.Location {
	if h.Location != nil {
		return h.Location
	}
	return time.Local
}
