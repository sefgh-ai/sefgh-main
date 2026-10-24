package reposync

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// The fake and the normalisation copy scripts/reposync/record.py, which
// recorded these cases from the Python original.

const serviceKey = "fixture.service-role.key"

type contractCase struct {
	ID          string          `json:"id"`
	Disposition string          `json:"disposition"`
	Setup       caseSetup       `json:"setup"`
	Expect      json.RawMessage `json:"expect"`
}

type caseSetup struct {
	Keys     []string         `json:"keys"`
	KeyNames []string         `json:"key_names"`
	Topics   []map[string]any `json:"topics"`
	GitHub   []struct {
		Status  int               `json:"status"`
		Headers map[string]string `json:"headers"`
		Body    json.RawMessage   `json:"body"`
	} `json:"github"`
	Database struct {
		ExistingRepoIDs []int64  `json:"existing_repo_ids"`
		InsertConflicts []string `json:"insert_conflicts"`
		RepositoryCount int      `json:"repository_count"`
	} `json:"database"`
}

func loadJSON(t *testing.T, name string, v any) {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/reposync/" + name)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, v); err != nil {
		t.Fatal(err)
	}
}

func TestQueriesMatchContract(t *testing.T) {
	var q map[string]string
	loadJSON(t, "queries.json", &q)
	if q["topic_count"] != topicCountQuery || q["search_page"] != searchPageQuery {
		t.Fatal("query text differs from contracts/reposync/queries.json; regenerate queries.go")
	}
}

var (
	naive  = regexp.MustCompile(`^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?$`)
	zulu   = regexp.MustCompile(`^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$`)
	offset = regexp.MustCompile(`^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?[+-]\d\d:\d\d$`)
)

var measured = map[string]bool{"response_time_ms": true, "avg_page_time_sec": true, "total_duration_sec": true,
	"uptime_seconds": true, "eta_seconds": true, "eta_base_seconds": true}

func normalize(v any, key string) any {
	switch x := v.(type) {
	case map[string]any:
		out := map[string]any{}
		for k, e := range x {
			out[k] = normalize(e, k)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, e := range x {
			out[i] = normalize(e, "")
		}
		return out
	case float64:
		if measured[key] {
			return "<measured>"
		}
	case string:
		switch {
		case naive.MatchString(x):
			return "<time:naive>"
		case zulu.MatchString(x):
			return "<time:Z>"
		case offset.MatchString(x):
			return "<time:offset>"
		}
	}
	return v
}

func sortColumns(query string) string {
	if query == "" {
		return ""
	}
	parts := strings.Split(query, "&")
	for i, p := range parts {
		if strings.HasPrefix(p, "columns=") {
			cols := strings.Split(strings.TrimPrefix(p, "columns="), ",")
			sort.Strings(cols)
			parts[i] = "columns=" + strings.Join(cols, ",")
		}
	}
	return strings.Join(parts, "&")
}

type fake struct {
	c     contractCase
	names map[string]string
	mu    sync.Mutex
	next  int
	calls []any
}

func (f *fake) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	raw, _ := io.ReadAll(r.Body)
	var parsed any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &parsed)
	}
	reply := func(status int, headers map[string]string, body any) {
		for k, v := range headers {
			w.Header().Set(k, v)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		if b, ok := body.(json.RawMessage); ok {
			_, _ = w.Write(b)
			return
		}
		_ = json.NewEncoder(w).Encode(body)
	}
	if r.URL.Path == "/graphql" {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		var key any = token
		for i, k := range f.c.Setup.Keys {
			if k == token {
				key = float64(i + 1)
			}
		}
		name, ok := f.names[get(parsed, "query", "").(string)]
		if !ok {
			name = "UNKNOWN QUERY"
		}
		f.calls = append(f.calls, map[string]any{"to": "github", "key": key, "query": name, "variables": get(parsed, "variables", nil)})
		if f.next >= len(f.c.Setup.GitHub) {
			reply(500, nil, map[string]any{"message": "fixture: no GitHub reply left"})
			return
		}
		g := f.c.Setup.GitHub[f.next]
		f.next++
		status := g.Status
		if status == 0 {
			status = 200
		}
		body := g.Body
		if body == nil {
			body = json.RawMessage(`{}`)
		}
		reply(status, g.Headers, body)
		return
	}

	query, _ := url.QueryUnescape(r.URL.RawQuery)
	call := map[string]any{"to": "database", "method": r.Method, "path": r.URL.Path, "query": sortColumns(query),
		"authorization": r.Header.Get("Authorization"), "apikey": r.Header.Get("apikey"), "prefer": nil}
	if call["authorization"] == "Bearer "+serviceKey {
		call["authorization"] = "Bearer <service-key>"
	}
	if call["apikey"] == serviceKey {
		call["apikey"] = "<service-key>"
	}
	if p := r.Header.Get("Prefer"); p != "" {
		call["prefer"] = p
	}
	if parsed != nil {
		call["body"] = normalize(parsed, "")
	}
	f.calls = append(f.calls, call)

	db := f.c.Setup.Database
	switch table := strings.TrimPrefix(r.URL.Path, "/rest/v1/"); {
	case table == "topic_list" && r.Method == "GET":
		reply(200, nil, f.c.Setup.Topics)
	case table == "repositories" && r.Method == "GET":
		if _, after, ok := strings.Cut(r.URL.RawQuery, "repo_id=eq."); ok {
			id, _ := strconv.ParseInt(strings.Split(after, "&")[0], 10, 64)
			for _, existing := range db.ExistingRepoIDs {
				if existing == id {
					reply(200, nil, []any{map[string]any{"id": 1}})
					return
				}
			}
			reply(200, nil, []any{})
			return
		}
		reply(200, map[string]string{"Content-Range": fmt.Sprintf("0-0/%d", db.RepositoryCount)}, []any{})
	case table == "repositories" && r.Method == "POST":
		for _, name := range db.InsertConflicts {
			if get(parsed, "full_name", nil) == name {
				reply(409, nil, map[string]any{"code": "23505", "details": nil, "hint": nil,
					"message": `duplicate key value violates unique constraint "repositories_full_name_key"`})
				return
			}
		}
		reply(201, nil, []any{parsed})
	case r.Method == "PATCH":
		reply(200, nil, []any{})
	case r.Method == "POST":
		reply(201, nil, []any{})
	case r.Method == "GET":
		reply(200, nil, []any{})
	default:
		reply(404, nil, map[string]any{"message": "fixture: unexpected request"})
	}
}

func TestContract(t *testing.T) {
	var contract struct {
		Cases []contractCase `json:"cases"`
	}
	loadJSON(t, "cases.json", &contract)
	var queries map[string]string
	loadJSON(t, "queries.json", &queries)
	names := map[string]string{}
	for name, text := range queries {
		names[text] = name
	}
	calcutta := time.FixedZone("Asia/Calcutta", 5*3600+1800)
	for _, c := range contract.Cases {
		t.Run(c.ID, func(t *testing.T) {
			f := &fake{c: c, names: names}
			server := httptest.NewServer(f)
			defer server.Close()
			var sleeps []float64
			w, err := New(Config{
				SupabaseURL: server.URL, SupabaseKey: serviceKey, GraphQLURL: server.URL + "/graphql",
				Keys: c.Setup.Keys, KeyNames: c.Setup.KeyNames, HTTP: server.Client(),
				Now:   func() time.Time { return time.Date(2026, 10, 24, 12, 0, 0, 0, time.UTC) },
				Local: calcutta, Sleep: func(d time.Duration) { sleeps = append(sleeps, d.Seconds()) },
				Logger: quiet(),
			})
			if err != nil {
				t.Fatal(err)
			}
			stats, runErr := w.RunPending()
			var result, raised any = stats, nil
			if runErr != nil {
				result, raised = nil, runErr.Error()
			} else {
				w.Flush()
			}
			merged := []any{}
			for _, s := range sleeps {
				if n := len(merged); n > 0 && merged[n-1].(map[string]any)["seconds"] == s {
					merged[n-1].(map[string]any)["times"] = merged[n-1].(map[string]any)["times"].(int) + 1
					continue
				}
				merged = append(merged, map[string]any{"seconds": s, "times": 1})
			}
			exhausted := []bool{}
			for _, k := range w.keys.info {
				exhausted = append(exhausted, k.IsExhausted)
			}
			f.mu.Lock() // the server goroutine wrote the calls
			calls := f.calls
			f.mu.Unlock()
			got := map[string]any{"result": result, "raised": raised, "calls": calls, "sleeps": merged,
				"keys": map[string]any{"current_key": w.keys.current + 1, "backoff_seconds": w.keys.backoff, "exhausted": exhausted}}
			compare(t, c.Expect, got)
		})
	}
}

func compare(t *testing.T, want json.RawMessage, got any) {
	t.Helper()
	var w, g any
	_ = json.Unmarshal(want, &w)
	raw, _ := json.Marshal(got)
	_ = json.Unmarshal(raw, &g)
	if reflect.DeepEqual(w, g) {
		return
	}
	wm, gm := w.(map[string]any), g.(map[string]any)
	for _, key := range []string{"result", "raised", "sleeps", "keys"} {
		if !reflect.DeepEqual(wm[key], gm[key]) {
			t.Errorf("%s: want %v, got %v", key, wm[key], gm[key])
		}
	}
	wc, gc := wm["calls"].([]any), gm["calls"].([]any)
	for i := 0; i < max(len(wc), len(gc)); i++ {
		var a, b any
		if i < len(wc) {
			a = wc[i]
		}
		if i < len(gc) {
			b = gc[i]
		}
		if !reflect.DeepEqual(a, b) {
			wj, _ := json.Marshal(a)
			gj, _ := json.Marshal(b)
			t.Errorf("call %d of %d/%d differs:\nwant %s\ngot  %s", i, len(wc), len(gc), wj, gj)
			return
		}
	}
}
