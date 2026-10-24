// Package reposync ports RepoSync, the Python worker in D:/SEFGH/RepoSync
// (commit 056d339). It reads pending topics, pages through GitHub's GraphQL
// search for each topic's repositories by stars, and saves the new ones.
//
// The behaviour, defects included, is pinned by contracts/reposync, recorded
// from the Python original. Differences on purpose: monitoring rows are
// written inline rather than on background threads, and HTTP calls are made
// with Go's client. Nothing here runs unless cmd/reposync is started, which
// refuses to start without the owner's approval (ADR 0002, 2026-10-20).
package reposync

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

// Config holds a worker's settings. Sleep must block for the duration; tests
// record it instead.
type Config struct {
	SupabaseURL, SupabaseKey string
	GraphQLURL               string
	Keys, KeyNames           []string
	CostPerPoint             float64
	HTTP                     *http.Client
	Now                      func() time.Time
	// Local is the zone of the original's naive local timestamps
	// (datetime.now().isoformat()), which reach timestamptz columns as if UTC.
	Local  *time.Location
	Sleep  func(time.Duration)
	Logger *slog.Logger
}

// Stats is the original's return value from process_pending_topics.
// TotalReposFetched is never increased there, so it stays 0.
type Stats struct {
	TopicsProcessed   int `json:"topics_processed"`
	TotalReposFetched int `json:"total_repos_fetched"`
	TotalReposSaved   int `json:"total_repos_saved"`
}

type Worker struct {
	cfg     Config
	keys    *keyRing
	state   *state
	started time.Time
	usage   []map[string]any
	stop    atomic.Bool
}

func New(cfg Config) (*Worker, error) {
	if len(cfg.Keys) == 0 {
		return nil, errors.New("reposync: no GitHub keys")
	}
	if cfg.HTTP == nil {
		cfg.HTTP = &http.Client{}
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	if cfg.Local == nil {
		cfg.Local = time.Local
	}
	if cfg.Sleep == nil {
		cfg.Sleep = time.Sleep
	}
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	w := &Worker{cfg: cfg, keys: newKeyRing(cfg.Keys, cfg.KeyNames), state: newState(), started: cfg.Now()}
	w.publishKeys()
	return w, nil
}

// Stop asks for a graceful stop: like the original's Ctrl+C handler, the
// current topic finishes, waits that check for it end early, and no further
// topic starts.
func (w *Worker) Stop() { w.stop.Store(true) }

func (w *Worker) stopped() bool { return w.stop.Load() }

// Stopped reports whether Stop was called.
func (w *Worker) Stopped() bool { return w.stopped() }

func (w *Worker) localNow() string { return isoformat(w.cfg.Now().In(w.cfg.Local)) }
func (w *Worker) utcNow() string   { return isoformat(w.cfg.Now().UTC()) + "Z" }

// SetCycle records the cycle number, as the original's main loop does.
func (w *Worker) SetCycle(n int) { w.state.currentCycle = n; w.state.status = "running" }

// RunPending is process_pending_topics: every pending topic in id order.
// An error means the worker stopped as the original would (ErrResetWaitCrash).
func (w *Worker) RunPending() (Stats, error) {
	var stats Stats
	var topics []map[string]any
	if err := w.db("GET", "topic_list", "select=*&order=id.asc", nil, "", &topics); err != nil {
		w.cfg.Logger.Warn("reposync: reading topics failed")
		return stats, nil
	}
	var pending []string
	for _, t := range topics {
		if get(t, "status", nil) == "pending" {
			pending = append(pending, fmt.Sprint(get(t, "topic", "")))
		}
	}
	for i, topic := range pending {
		if w.stopped() {
			break
		}
		w.state.status, w.state.currentTopic = "running", topic
		w.updateTopicStatus(topic, "in_progress", 0, 0, 0)
		result, err := w.fetchTopic(topic)
		if err != nil {
			return stats, err
		}
		w.updateTopicStatus(topic, "completed", result.saved, result.githubTotal, result.duplicates)
		stats.TopicsProcessed++
		stats.TotalReposSaved += result.saved
		if i < len(pending)-1 && !w.stopped() {
			w.cfg.Sleep(5 * time.Second)
		}
	}
	return stats, nil
}

func (w *Worker) updateTopicStatus(topic, status string, fetched, githubTotal, duplicates int) {
	body := map[string]any{"status": status, "repos_fetched": fetched, "updated_at": w.localNow()}
	if status == "completed" {
		body["github_total"], body["duplicates_count"] = githubTotal, duplicates
	}
	if err := w.db("PATCH", "topic_list", "topic=eq."+topic, body, "return=representation", nil); err != nil {
		w.cfg.Logger.Warn("reposync: topic status update failed")
	}
}

type topicResult struct{ saved, githubTotal, duplicates, requests int }

// fetchTopic is fetch_repositories_for_topic.
func (w *Worker) fetchTopic(topic string) (topicResult, error) {
	started := w.cfg.Now()
	requests := 0
	githubTotal, err := w.topicTotal(topic)
	if err != nil {
		return topicResult{}, err
	}
	requests++
	if githubTotal > 0 {
		body := map[string]any{"github_total": githubTotal, "updated_at": w.localNow()}
		if err := w.db("PATCH", "topic_list", "topic=eq."+topic, body, "return=representation", nil); err != nil {
			w.cfg.Logger.Warn("reposync: saving github_total failed")
		}
	}

	var timings []float64
	var cursor any
	fetched, saved, duplicates, searchTotal := 0, 0, 0, 0
	// The search stops at GitHub's 1,000-result ceiling while the topic is
	// still marked completed (R-193); a page that fails three times ends the
	// topic early, also marked completed (R-194).
	for hasNext := true; hasNext; {
		pageStart := time.Now()
		variables := map[string]any{"searchQuery": "topic:" + topic + " sort:stars-desc", "cursor": cursor}
		data, err := w.query(searchPageQuery, variables, "search_page")
		requests++
		if err != nil {
			return topicResult{}, err
		}
		if data == nil {
			break
		}
		// A page always takes some time; on Windows Go's monotonic clock can
		// read a very fast page as zero, which would wrongly skip the ETA.
		timings = append(timings, max(time.Since(pageStart), time.Microsecond).Seconds())
		if len(timings) > 10 {
			timings = timings[1:]
		}
		search := get(get(data, "data", map[string]any{}), "search", map[string]any{})
		pageInfo := get(search, "pageInfo", map[string]any{})
		total, _ := pyInt(get(search, "repositoryCount", nil))
		searchTotal = int(total)
		if githubTotal == 0 && searchTotal > 0 {
			githubTotal = searchTotal
		}
		nodes, _ := get(search, "nodes", []any{}).([]any)
		for _, node := range nodes {
			if !truthy(node) {
				continue
			}
			fetched++
			ok, err := w.saveRepository(repository(node))
			if err != nil {
				return topicResult{}, err
			}
			if ok {
				saved++
			} else {
				duplicates++
			}
		}
		hasNext = truthy(get(pageInfo, "hasNextPage", false))
		cursor = get(pageInfo, "endCursor", nil)
		w.progress(fetched, saved, duplicates, requests, githubTotal, searchTotal, timings)
		if hasNext {
			w.cfg.Sleep(time.Second)
		}
	}

	if githubTotal == 0 {
		githubTotal = searchTotal
	}
	avg := mean(timings)
	w.saveTopicHistory(map[string]any{
		"topic_name": topic, "status": "completed", "cycle_number": w.state.currentCycle,
		"repos_fetched": fetched, "repos_saved": saved, "duplicates_count": duplicates,
		"github_total": githubTotal, "requests_made": requests, "total_cost_points": 0,
		"avg_page_time_sec": avg, "total_duration_sec": int(w.cfg.Now().Sub(started).Seconds()),
		"error_count": w.state.errors, "retry_count": w.state.retries, "backoff_events": w.state.backoffs,
		"final_error": nil, "updated_at": w.localNow(), "started_at": isoformat(started.In(w.cfg.Local)),
		"completed_at": w.localNow(),
	})
	w.saveSnapshot()
	return topicResult{saved: saved, githubTotal: githubTotal, duplicates: duplicates, requests: requests}, nil
}

// progress is the current_progress state: the original's ETA arithmetic,
// where the page cost is never known (R-192), so no wait is ever added.
func (w *Worker) progress(fetched, saved, duplicates, requests, githubTotal, searchTotal int, timings []float64) {
	display := githubTotal
	if display <= 0 {
		display = searchTotal
	}
	avg := mean(timings)
	pagesLeft := 0.0
	if display > 0 {
		pagesLeft = math.Max(0, float64(display-fetched)/100)
	}
	var etaBase, eta any
	if avg > 0 && pagesLeft*avg != 0 {
		etaBase, eta = int(pagesLeft*avg), int(pagesLeft*avg)
	}
	percentage := 0.0
	if display > 0 {
		percentage = float64(fetched) / float64(display) * 100
	}
	avgTime := 0.0
	if avg > 0 {
		avgTime = math.Round(avg*100) / 100
	}
	w.state.progress = map[string]any{
		"current": fetched, "total": display, "percentage": percentage, "saved": saved, "duplicates": duplicates,
		"requests": requests, "avg_page_time_sec": avgTime, "avg_cost_per_page": 0,
		"eta_seconds": eta, "eta_base_seconds": etaBase, "eta_wait_seconds": 0,
	}
}

func mean(xs []float64) float64 {
	if len(xs) == 0 {
		return 0
	}
	sum := 0.0
	for _, x := range xs {
		sum += x
	}
	return sum / float64(len(xs))
}

// repository maps a GraphQL node as the original's repo_data, including its
// dict.get defaults: a field present as null stays null.
func repository(node any) map[string]any {
	var language any
	if lang := get(node, "primaryLanguage", nil); truthy(lang) {
		language = get(lang, "name", nil)
	}
	topics := []any{}
	repoTopics, _ := get(get(node, "repositoryTopics", map[string]any{}), "nodes", []any{}).([]any)
	for _, t := range repoTopics {
		topics = append(topics, get(get(t, "topic", nil), "name", nil))
	}
	owner := get(node, "owner", map[string]any{})
	return map[string]any{
		"repo_id": get(node, "databaseId", nil), "name": get(node, "name", nil), "full_name": get(node, "nameWithOwner", nil),
		"description": get(node, "description", ""), "stars": get(node, "stargazerCount", json.Number("0")),
		"forks": get(node, "forkCount", json.Number("0")), "url": get(node, "url", nil), "language": language,
		"owner": get(owner, "login", nil), "owner_type": get(owner, "__typename", nil),
		"created_at": get(node, "createdAt", nil), "updated_at": get(node, "updatedAt", nil), "topics": topics,
	}
}

// saveRepository is save_repository: look up repo_id, insert if absent. Any
// failure is tried three times and then reported as "not saved", which the
// caller counts as a duplicate (R-118).
func (w *Worker) saveRepository(repo map[string]any) (bool, error) {
	for attempt := 1; attempt <= 3; attempt++ {
		var existing []any
		err := w.db("GET", "repositories", "select=id&repo_id=eq."+pyStr(repo["repo_id"]), nil, "", &existing)
		if err == nil && len(existing) > 0 {
			return false, nil
		}
		if err == nil {
			if err = w.db("POST", "repositories", "", repo, "return=representation", nil); err == nil {
				return true, nil
			}
		}
		if attempt < 3 {
			w.cfg.Sleep(2 * time.Second)
		}
	}
	return false, nil
}

// topicTotal is get_topic_total_count; 0 when GitHub gives no topic.
func (w *Worker) topicTotal(topic string) (int, error) {
	data, err := w.query(topicCountQuery, map[string]any{"topicName": topic}, "query")
	if err != nil || data == nil {
		return 0, err
	}
	t := get(get(data, "data", map[string]any{}), "topic", nil)
	if !truthy(t) {
		return 0, nil
	}
	n, _ := pyInt(get(get(t, "repositories", nil), "totalCount", nil))
	return int(n), nil
}

// query is execute_graphql_query: up to three attempts. It returns nil data
// when they are used up. A reply carrying errors is a failed attempt even
// when it also carries data (R-195).
func (w *Worker) query(text string, variables map[string]any, requestType string) (any, error) {
	for retry := 0; retry < 3; {
		key := w.currentKey()
		cur := w.keys.info[w.keys.current]
		payload, _ := json.Marshal(map[string]any{"query": text, "variables": variables})
		start := time.Now()
		status, header, raw, err := w.send("POST", w.cfg.GraphQLURL, payload, map[string]string{"Authorization": "Bearer " + key, "Content-Type": "application/json"})
		elapsed := int(time.Since(start).Milliseconds())
		// requests raises for a failed connection here, and for a body that
		// is not JSON only after the headers and status were looked at.
		failed := func(err error) {
			w.state.errors++
			w.logErrorEvent("request_exception", cur.Name, err.Error(), retry, 0)
			retry++
			w.state.retries++
			w.cfg.Sleep(5 * time.Second)
		}
		if err != nil {
			failed(err)
			continue
		}
		if header.Get("X-RateLimit-Remaining") != "" && header.Get("X-RateLimit-Reset") != "" {
			w.updateFromHeaders(header)
		}
		if status == 403 {
			w.state.errors++
			if err := w.handleRateLimit(); err != nil {
				return nil, err
			}
			retry++
			w.state.retries++
			continue
		}
		if status != 200 {
			w.state.errors++
			w.logErrorEvent("http_error", cur.Name, fmt.Sprintf("HTTP %d", status), retry, 0)
			retry++
			w.state.retries++
			w.cfg.Sleep(5 * time.Second)
			continue
		}
		var data any
		dec := json.NewDecoder(bytes.NewReader(raw))
		dec.UseNumber()
		if err := dec.Decode(&data); err != nil {
			failed(err)
			continue
		}

		cost := int64(0)
		if inner, ok := get(data, "data", map[string]any{}).(map[string]any); ok {
			if rl := get(inner, "rateLimit", nil); truthy(rl) {
				cost, _ = pyInt(get(rl, "cost", nil))
				w.updateFromBody(rl)
			}
		}
		cur = w.keys.info[w.keys.current]
		remaining := cur.Remaining
		if !truthy(remaining) {
			remaining = 0
		}
		limit := cur.Limit
		if !truthy(limit) {
			limit = 5000
		}
		w.logUsage(map[string]any{
			"timestamp": w.utcNow(), "key_name": cur.Name, "key_index": w.keys.current, "topic": w.state.currentTopic,
			"request_type": requestType, "cost_points": cost, "remaining_after": remaining, "limit_value": limit,
			"reset_at": cur.ResetAt, "response_time_ms": elapsed, "success": true, "error_message": nil,
		})

		object, _ := data.(map[string]any)
		if errs, present := object["errors"]; present {
			w.state.errors++
			text, _ := json.Marshal(errs)
			w.logErrorEvent("graphql_error", cur.Name, pyRepr(rawField(raw, "errors", text)), retry, 0)
			retry++
			w.state.retries++
			w.cfg.Sleep(5 * time.Second)
			continue
		}
		return data, nil
	}
	return nil, nil
}

// rawField returns a top-level field's raw JSON, keeping its key order for
// pyRepr. fallback is used if it cannot be found.
func rawField(raw []byte, field string, fallback []byte) []byte {
	var fields map[string]json.RawMessage
	if json.Unmarshal(raw, &fields) == nil && fields[field] != nil {
		return fields[field]
	}
	return fallback
}

func (w *Worker) logErrorEvent(kind, keyName, message string, retry, backoff int) {
	w.insert("error_events", map[string]any{
		"timestamp": w.utcNow(), "event_type": kind, "topic": w.state.currentTopic, "key_name": keyName,
		"error_message": message, "retry_count": retry, "backoff_seconds": backoff, "details": map[string]any{},
	})
}

// logUsage batches usage rows ten at a time, like the original's queue.
func (w *Worker) logUsage(row map[string]any) {
	w.usage = append(w.usage, row)
	if len(w.usage) >= 10 {
		w.Flush()
	}
}

// Flush writes the batched usage rows; the original does it at shutdown.
func (w *Worker) Flush() {
	if len(w.usage) == 0 {
		return
	}
	batch := w.usage
	w.usage = nil
	columns := map[string]bool{}
	for _, row := range batch {
		for k := range row {
			columns[k] = true
		}
	}
	names := make([]string, 0, len(columns))
	for k := range columns {
		names = append(names, strconv.Quote(k))
	}
	sortStrings(names)
	if err := w.db("POST", "api_key_usage_log", "columns="+strings.Join(names, ","), batch, "return=representation", nil); err != nil {
		w.cfg.Logger.Warn("reposync: usage log write failed")
	}
}

func (w *Worker) insert(table string, row map[string]any) {
	if err := w.db("POST", table, "", row, "return=representation", nil); err != nil {
		w.cfg.Logger.Warn("reposync: monitoring write failed", "table", table)
	}
}

func (w *Worker) saveTopicHistory(data map[string]any) {
	var existing []map[string]any
	query := "select=id&topic_name=eq." + fmt.Sprint(data["topic_name"]) + "&cycle_number=eq." + fmt.Sprint(data["cycle_number"])
	if err := w.db("GET", "topic_processing_history", query, nil, "", &existing); err != nil {
		w.cfg.Logger.Warn("reposync: topic history read failed")
		return
	}
	if len(existing) > 0 {
		w.db("PATCH", "topic_processing_history", "id=eq."+pyStr(existing[0]["id"]), data, "return=representation", nil)
		return
	}
	data["created_at"] = w.localNow()
	w.insert("topic_processing_history", data)
}

func (w *Worker) saveSnapshot() {
	total, err := w.count("repositories")
	if err != nil {
		total = 0
	}
	s := w.state
	w.insert("session_snapshots", map[string]any{
		"session_start": isoformat(w.started.In(w.cfg.Local)), "status": s.status, "current_topic": s.currentTopic,
		"current_cycle": s.currentCycle, "topics_processed": 0, "repos_saved": 0, "total_repos_in_db": total,
		"rate_limit": s.rateLimit, "api_keys": s.keys, "api_stats": s.stats, "current_progress": s.progress,
		"uptime_seconds": int(w.cfg.Now().Sub(w.started).Seconds()),
	})
}

// count reads a table's row count from Content-Range, as Prefer: count=exact.
func (w *Worker) count(table string) (int, error) {
	status, header, _, err := w.send("GET", w.cfg.SupabaseURL+"/rest/v1/"+table+"?select=id", nil, w.dbHeaders("count=exact"))
	if err != nil || status/100 != 2 {
		return 0, fmt.Errorf("count %s: status %d", table, status)
	}
	r := header.Get("Content-Range")
	n, err := strconv.Atoi(r[strings.LastIndexByte(r, '/')+1:])
	if err != nil {
		return 0, err
	}
	return n, nil
}

func (w *Worker) dbHeaders(prefer string) map[string]string {
	h := map[string]string{"apikey": w.cfg.SupabaseKey, "Authorization": "Bearer " + w.cfg.SupabaseKey, "Content-Type": "application/json"}
	if prefer != "" {
		h["Prefer"] = prefer
	}
	return h
}

// db calls PostgREST. Any status outside 2xx is an error, as postgrest-py
// raises APIError.
func (w *Worker) db(method, table, query string, body any, prefer string, out any) error {
	target := w.cfg.SupabaseURL + "/rest/v1/" + table
	if query != "" {
		target += "?" + encodeQuery(query)
	}
	var payload []byte
	if body != nil {
		payload, _ = json.Marshal(body)
	}
	status, _, raw, err := w.send(method, target, payload, w.dbHeaders(prefer))
	if err != nil {
		return err
	}
	if status/100 != 2 {
		return fmt.Errorf("%s %s: status %d", method, table, status)
	}
	if out != nil && len(raw) > 0 {
		dec := json.NewDecoder(bytes.NewReader(raw))
		dec.UseNumber()
		return dec.Decode(out)
	}
	return nil
}

// encodeQuery percent-encodes each value of a PostgREST query string.
func encodeQuery(query string) string {
	parts := strings.Split(query, "&")
	for i, part := range parts {
		k, v, _ := strings.Cut(part, "=")
		parts[i] = k + "=" + url.QueryEscape(v)
	}
	return strings.Join(parts, "&")
}

func (w *Worker) send(method, target string, body []byte, headers map[string]string) (int, http.Header, []byte, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, target, reader)
	if err != nil {
		return 0, nil, nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	client := *w.cfg.HTTP
	if client.Timeout == 0 {
		client.Timeout = 30 * time.Second
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	return resp.StatusCode, resp.Header, raw, err
}

func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}
