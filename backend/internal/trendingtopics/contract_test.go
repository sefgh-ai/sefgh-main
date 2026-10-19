package trendingtopics

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

var discard = slog.New(slog.NewTextHandler(io.Discard, nil))

type reply struct {
	Status       int             `json:"status"`
	Body         json.RawMessage `json:"body"`
	Raw          *string         `json:"raw"`
	NetworkError bool            `json:"network_error"`
}

type fixture struct {
	ID     string           `json:"id"`
	GitHub map[string]reply `json:"github"`
	Expect struct {
		Status   int             `json:"status"`
		Cache    string          `json:"cache_control"`
		Body     json.RawMessage `json:"body"`
		Requests []string        `json:"requests"`
	} `json:"expect"`
}

func loadContract(t *testing.T) (time.Time, []fixture) {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/trending-topics/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version int       `json:"contract_version"`
		Now     time.Time `json:"now"`
		Cases   []fixture `json:"cases"`
	}
	if err = json.Unmarshal(raw, &contract); err != nil {
		t.Fatal(err)
	}
	if contract.Version != 1 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", contract.Version, len(contract.Cases))
	}
	return contract.Now, contract.Cases
}

// githubStandIn answers each topic's search from the fixture, finding the
// topic by its first search word, and records every request.
type githubStandIn struct {
	t        *testing.T
	f        fixture
	mu       sync.Mutex
	requests []string
}

func (s *githubStandIn) RoundTrip(r *http.Request) (*http.Response, error) {
	s.mu.Lock()
	s.requests = append(s.requests, r.URL.RequestURI())
	s.mu.Unlock()
	if r.Header.Get("Authorization") != "" || r.Header.Get("X-GitHub-Token") != "" {
		s.t.Errorf("%s: a caller credential reached GitHub", s.f.ID)
	}
	if r.Header.Get("User-Agent") != "SEFGH-Trending-Topics" || r.Header.Get("Accept") != "application/vnd.github.v3+json" {
		s.t.Errorf("%s: headers %v", s.f.ID, r.Header)
	}
	query := r.URL.Query().Get("q")
	for _, topic := range Topics {
		if !strings.HasPrefix(query, topic.Terms[0]+" OR ") {
			continue
		}
		answer := s.f.GitHub[topic.ID]
		if answer.NetworkError {
			return nil, errors.New("connection refused")
		}
		body := string(answer.Body)
		if answer.Raw != nil {
			body = *answer.Raw
		}
		return &http.Response{StatusCode: answer.Status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	}
	s.t.Errorf("%s: a search for no topic: %q", s.f.ID, query)
	return nil, errors.New("no such topic")
}

func TestContract(t *testing.T) {
	now, cases := loadContract(t)
	for _, f := range cases {
		t.Run(f.ID, func(t *testing.T) {
			stand := &githubStandIn{t: t, f: f}
			h := &Handler{Client: &http.Client{Transport: stand}, BaseURL: "https://github.invalid", Now: func() time.Time { return now }, Logger: discard}
			r := httptest.NewRequest("GET", "/api/trending/topics", nil)
			r.Header.Set("Authorization", "Bearer caller-session")
			r.Header.Set("X-GitHub-Token", "caller-github-token")
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != f.Expect.Status {
				t.Errorf("status %d, contract %d", w.Code, f.Expect.Status)
			}
			if got := w.Header().Get("Cache-Control"); got != f.Expect.Cache {
				t.Errorf("cache control %q, contract %q", got, f.Expect.Cache)
			}
			if got := w.Header().Get("Content-Type"); got != "application/json" {
				t.Errorf("content type %q", got)
			}
			if !sameJSON(w.Body.Bytes(), f.Expect.Body) {
				t.Errorf("body\n got  %.1500s\n want %.1500s", w.Body.String(), f.Expect.Body)
			}
			requests := append([]string(nil), stand.requests...)
			sort.Strings(requests)
			if !reflect.DeepEqual(requests, f.Expect.Requests) {
				t.Errorf("requests\n got  %q\n want %q", requests, f.Expect.Requests)
			}
		})
	}
}

func sameJSON(a, b []byte) bool {
	var x, y any
	if json.Unmarshal(a, &x) != nil || json.Unmarshal(b, &y) != nil {
		return false
	}
	return reflect.DeepEqual(x, y)
}
