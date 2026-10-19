// Package trendingtopics answers GET /api/trending/topics: for each of six
// topics, the most-starred repositories created in the last 30 days,
// searched live on GitHub. It replaces the stored trending_repos table and
// its refresh route, which could not write the table (bug register R-077):
// the owner chose this design on 2026-10-19 (docs/plans/trending-refresh.md,
// option A). Nothing here writes shared data.
//
// The answer is the same for every visitor, so it is cached by the CDN in
// front of the server: six hours when every topic was found, five minutes
// when one failed, never when all failed. It never uses or forwards the
// caller's credentials.
package trendingtopics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubtrending"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// DefaultBaseURL is GitHub's API.
const DefaultBaseURL = "https://api.github.com"

// Budget bounds the six searches together. Each search may also take the
// client's own timeout; one cut short counts as failed.
const Budget = 20 * time.Second

// Cache headers. A shared cache (the CDN) may keep a complete answer for six
// hours, and serve it for one more hour while it asks again; an answer with
// a failed topic for five minutes only. Browsers always ask the CDN.
const (
	CacheComplete = "public, max-age=0, s-maxage=21600, stale-while-revalidate=3600"
	CachePartial  = "public, max-age=0, s-maxage=300"
)

const (
	concurrency  = 2       // searches at once; GitHub limits search more tightly than other calls
	perTopic     = 5       // repositories per topic
	days         = 30      // repositories created in the last 30 days
	minStars     = 100     // with more than 100 stars
	maxBodyBytes = 2 << 20 // one search reply
)

// Topic is one section of the trending page.
type Topic struct {
	ID, Name, Icon string
	// Terms are searched as text, joined by OR, which GitHub matches in a
	// repository's name, description and topics. OR cannot join topic:
	// qualifiers: GitHub refuses that search (R-101).
	Terms []string
}

// Topics are the six sections, with the words src/lib/trending.js used as
// topic qualifiers.
var Topics = []Topic{
	{"ai-ml", "AI & Machine Learning", "🤖", []string{"artificial-intelligence", "machine-learning", "deep-learning", "tensorflow", "pytorch"}},
	{"web-dev", "Web Development", "🌐", []string{"web", "frontend", "react", "vue", "angular", "nextjs"}},
	{"mobile", "Mobile Development", "📱", []string{"mobile", "android", "ios", "react-native", "flutter"}},
	{"devops", "DevOps & Cloud", "⚙️", []string{"devops", "kubernetes", "docker", "aws", "cloud"}},
	{"data-science", "Data Science", "📊", []string{"data-science", "analytics", "pandas", "jupyter", "visualization"}},
	{"security", "Security & Privacy", "🔐", []string{"security", "cybersecurity", "privacy", "encryption", "penetration-testing"}},
}

// Handler answers GET /api/trending/topics. Every field has a default.
type Handler struct {
	// Client makes the GitHub searches; its transport may add the public
	// read token (QUOTA-001), which can read only public data.
	Client  *http.Client
	BaseURL string
	// Now is the clock for the 30-day window and generatedAt.
	Now func() time.Time
	// Budget replaces the package's when not zero. Tests shorten it.
	Budget time.Duration
	Logger *slog.Logger
}

type topicAnswer struct {
	ID       string           `json:"id"`
	Name     string           `json:"name"`
	Icon     string           `json:"icon"`
	Complete bool             `json:"complete"`
	Repos    []map[string]any `json:"repos"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	current := now()
	since := current.UTC().AddDate(0, 0, -days).Format("2006-01-02")
	budget := h.Budget
	if budget == 0 {
		budget = Budget
	}
	ctx, cancel := context.WithTimeout(r.Context(), budget)
	defer cancel()

	answers := make([]topicAnswer, len(Topics))
	slots := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	for i, topic := range Topics {
		wg.Go(func() {
			slots <- struct{}{}
			defer func() { <-slots }()
			repos, err := h.search(ctx, topic, since, current) // no repositories with an error
			if err != nil {
				h.log(topic.ID, err)
			}
			if repos == nil {
				repos = []map[string]any{}
			}
			answers[i] = topicAnswer{ID: topic.ID, Name: topic.Name, Icon: topic.Icon, Complete: err == nil, Repos: repos}
		})
	}
	wg.Wait()

	complete := 0
	for _, answer := range answers {
		if answer.Complete {
			complete++
		}
	}
	switch complete {
	case 0:
		w.Header().Set("Cache-Control", "no-store")
		write(w, 502, map[string]string{"error": "Trending topics could not be loaded"})
		return
	case len(Topics):
		w.Header().Set("Cache-Control", CacheComplete)
	default:
		w.Header().Set("Cache-Control", CachePartial)
	}
	write(w, 200, map[string]any{"generatedAt": jscompat.ISOString(current), "topics": answers})
}

// search asks GitHub for one topic's repositories, mapped as the trending
// list maps them, with the topic's name and icon.
func (h *Handler) search(ctx context.Context, topic Topic, since string, now time.Time) ([]map[string]any, error) {
	query := fmt.Sprintf("%s created:>%s stars:>%d", strings.Join(topic.Terms, " OR "), since, minStars)
	base := h.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	target := strings.TrimRight(base, "/") + "/search/repositories?q=" + jscompat.EncodeURIComponent(query) + fmt.Sprintf("&sort=stars&order=desc&per_page=%d", perTopic)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "SEFGH-Trending-Topics")
	client := h.Client
	if client == nil {
		client = &http.Client{Timeout: githubtrending.Timeout}
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, fmt.Errorf("GitHub answered %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxBodyBytes {
		return nil, errors.New("GitHub reply too large")
	}
	decoded, err := jscompat.DecodeJSON(body)
	if err != nil {
		return nil, err
	}
	data, _ := decoded.(map[string]any)
	items, isList := data["items"].([]any)
	if !isList {
		return nil, errors.New("reply has no list of items")
	}
	if len(items) > perTopic {
		items = items[:perTopic]
	}
	repos := make([]map[string]any, 0, len(items))
	for _, item := range items {
		repo, isObject := item.(map[string]any)
		if !isObject || repo["owner"] == nil {
			return nil, errors.New("an item is not a repository with an owner")
		}
		out := githubtrending.Item(repo, now)
		out["topic"] = topic.Name
		out["topicIcon"] = topic.Icon
		repos = append(repos, out)
	}
	return repos, nil
}

// log records which topic failed and why, without the request's URL, which
// net/http puts in its errors.
func (h *Handler) log(topic string, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		err = urlErr.Err
	}
	logger.Error("trending topic search failed", "topic", topic, "error", err)
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // "AI & Machine Learning", as JSON.stringify writes it
	_ = encoder.Encode(body)
}
