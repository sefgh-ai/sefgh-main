package githubdevelopers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
	_ "time/tzdata"
)

type call struct {
	URL     string            `json:"wire_url"`
	Headers map[string]string `json:"headers"`
}
type step struct {
	Status  int             `json:"status"`
	Body    json.RawMessage `json:"body"`
	Raw     *string         `json:"raw_body"`
	Network bool            `json:"network_error"`
	Delay   int             `json:"delay_ms"`
}
type fixture struct {
	ID       string `json:"id"`
	Request  string `json:"request"`
	Now      string `json:"now"`
	Timezone string `json:"timezone"`
	Upstream []step `json:"upstream"`
	Expect   struct {
		Status int    `json:"status"`
		Body   any    `json:"body"`
		Calls  []call `json:"calls"`
	} `json:"expect"`
}
type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func TestContracts(t *testing.T) {
	bytes, err := os.ReadFile("../../../contracts/github-trending-developers/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version int       `json:"contract_version"`
		Cases   []fixture `json:"cases"`
	}
	if err = json.Unmarshal(bytes, &contract); err != nil {
		t.Fatal(err)
	}
	if contract.Version != 2 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases", contract.Version, len(contract.Cases))
	}
	for _, f := range contract.Cases {
		for _, wire := range []bool{false, true} {
			mode := "memory"
			if wire {
				mode = "socket"
			}
			t.Run(f.ID+"/"+mode, func(t *testing.T) {
				location, err := time.LoadLocation(f.Timezone)
				if err != nil {
					t.Fatal(err)
				}
				now, err := time.Parse(time.RFC3339, f.Now)
				if err != nil {
					t.Fatal(err)
				}
				var mu sync.Mutex
				calls := []call{}
				used := make([]bool, len(f.Expect.Calls))
				h := &Handler{Now: func() time.Time { return now.In(location) }}
				h.Client = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
					mu.Lock()
					calls = append(calls, call{(r.URL.Scheme + "://" + r.URL.Host + r.URL.RequestURI()), map[string]string{"accept": r.Header.Get("Accept"), "user-agent": r.Header.Get("User-Agent")}})
					index := -1
					for i, c := range f.Expect.Calls {
						if !used[i] && c.URL == (r.URL.Scheme+"://"+r.URL.Host+r.URL.RequestURI()) {
							index = i
							used[i] = true
							break
						}
					}
					mu.Unlock()
					if index < 0 {
						return nil, errors.New("unexpected URL: " + (r.URL.Scheme + "://" + r.URL.Host + r.URL.RequestURI()))
					}
					if r.Header.Get("Authorization") != "" || r.Header.Get("X-GitHub-Token") != "" {
						return nil, errors.New("credential leaked")
					}
					s := f.Upstream[index]
					if s.Delay > 0 {
						time.Sleep(time.Duration(s.Delay) * time.Millisecond)
					}
					if s.Network {
						return nil, errors.New("offline")
					}
					body := string(s.Body)
					if s.Raw != nil {
						body = *s.Raw
					}
					return &http.Response{StatusCode: s.Status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
				})}
				var status int
				var body []byte
				var header http.Header
				if wire {
					server := httptest.NewServer(h)
					defer server.Close()
					resp, err := http.Get(server.URL + f.Request)
					if err != nil {
						t.Fatal(err)
					}
					status, header = resp.StatusCode, resp.Header
					body, err = io.ReadAll(resp.Body)
					resp.Body.Close()
					server.Close()
					if err != nil {
						t.Fatal(err)
					}
				} else {
					rec := httptest.NewRecorder()
					h.ServeHTTP(rec, httptest.NewRequest("GET", f.Request, nil))
					status, header, body = rec.Code, rec.Header(), rec.Body.Bytes()
				}
				var actual any
				if err = json.Unmarshal(body, &actual); err != nil {
					t.Fatal(err)
				}
				if status != f.Expect.Status || !reflect.DeepEqual(actual, f.Expect.Body) {
					t.Fatalf("got %d %s; want %d %#v", status, body, f.Expect.Status, f.Expect.Body)
				}
				mu.Lock()
				defer mu.Unlock()
				expected := append([]call{}, f.Expect.Calls...)
				sort.Slice(calls, func(i, j int) bool { return calls[i].URL < calls[j].URL })
				sort.Slice(expected, func(i, j int) bool { return expected[i].URL < expected[j].URL })
				if !reflect.DeepEqual(calls, expected) {
					t.Fatalf("calls %#v; want %#v", calls, expected)
				}
				if header.Get("Content-Type") != "application/json" || header.Get("Cache-Control") != "" || header.Get("Retry-After") != "" {
					t.Fatalf("headers %v", header)
				}
			})
		}
	}
}
