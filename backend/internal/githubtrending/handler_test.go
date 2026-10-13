package githubtrending

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"
	_ "time/tzdata" // deterministic IANA locations on Windows and CI
)

func TestCancellationReachesUpstream(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	observed := false
	h := &Handler{Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		observed = errors.Is(r.Context().Err(), context.Canceled)
		return nil, r.Context().Err()
	})}}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending", nil).WithContext(ctx))
	if !observed || rec.Code != 500 {
		t.Fatalf("cancellation observed=%v status=%d", observed, rec.Code)
	}
}

func TestOversizedAndTrailingRepliesRejected(t *testing.T) {
	for _, body := range []string{strings.Repeat(" ", maxBodyBytes+1), `{"items":[]} {"second":true}`} {
		h := &Handler{Client: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
		})}}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/trending", nil))
		if rec.Code != 500 {
			t.Fatalf("status %d; want 500", rec.Code)
		}
	}
}

type call struct {
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
}
type fixture struct {
	ID       string  `json:"id"`
	Request  string  `json:"request"`
	Now      string  `json:"now"`
	Timezone string  `json:"timezone"`
	Random   float64 `json:"random"`
	Upstream struct {
		Status       int             `json:"status"`
		Body         json.RawMessage `json:"body"`
		Raw          *string         `json:"raw_body"`
		NetworkError bool            `json:"network_error"`
	} `json:"upstream"`
	Expect struct {
		Status      int     `json:"status"`
		Body        any     `json:"body"`
		Calls       []call  `json:"calls"`
		RandomCalls int     `json:"random_calls"`
		ContentType string  `json:"content_type"`
		Cache       *string `json:"cache_control"`
	} `json:"expect"`
}
type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func TestContracts(t *testing.T) {
	content, err := os.ReadFile("../../../contracts/github-trending/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Cases []fixture `json:"cases"`
	}
	if err := json.Unmarshal(content, &contract); err != nil {
		t.Fatal(err)
	}
	for _, f := range contract.Cases {
		for _, wire := range []bool{false, true} {
			mode := "memory"
			if wire {
				mode = "socket"
			}
			t.Run(f.ID+"/"+mode, func(t *testing.T) {
				var calls []call
				seen := make(chan call, 4)
				randomCalls := 0
				location, err := time.LoadLocation(f.Timezone)
				if err != nil {
					t.Fatal(err)
				}
				now, err := time.Parse(time.RFC3339Nano, f.Now)
				if err != nil {
					t.Fatal(err)
				}
				h := &Handler{Now: func() time.Time { return now.In(location) }, Random: func() float64 { randomCalls++; return f.Random }}
				h.Client = &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
					seen <- call{r.URL.String(), map[string]string{"Accept": r.Header.Get("Accept"), "User-Agent": r.Header.Get("User-Agent")}}
					if r.Header.Get("Authorization") != "" {
						return nil, errors.New("credential leaked")
					}
					if f.Upstream.NetworkError {
						return nil, errors.New("offline")
					}
					body := string(f.Upstream.Body)
					if f.Upstream.Raw != nil {
						body = *f.Upstream.Raw
					}
					return &http.Response{StatusCode: f.Upstream.Status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body))}, nil
				})}
				var status int
				var header http.Header
				var body []byte
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
					if err != nil {
						t.Fatal(err)
					}
					server.Close() // join handler before inspecting injected counters
				} else {
					rec := httptest.NewRecorder()
					h.ServeHTTP(rec, httptest.NewRequest("GET", f.Request, nil))
					status, header, body = rec.Code, rec.Header(), rec.Body.Bytes()
				}
				for len(seen) > 0 {
					calls = append(calls, <-seen)
				}
				if len(calls) == 0 {
					calls = []call{}
				}
				var actual any
				if err := json.Unmarshal(body, &actual); err != nil {
					t.Fatal(err)
				}
				if status != f.Expect.Status || !reflect.DeepEqual(actual, f.Expect.Body) {
					t.Fatalf("got %d %s; want %d %#v", status, body, f.Expect.Status, f.Expect.Body)
				}
				if !reflect.DeepEqual(calls, f.Expect.Calls) {
					t.Fatalf("calls %#v; want %#v", calls, f.Expect.Calls)
				}
				if randomCalls != f.Expect.RandomCalls {
					t.Fatalf("random calls %d; want %d", randomCalls, f.Expect.RandomCalls)
				}
				if header.Get("Content-Type") != f.Expect.ContentType || header.Get("Cache-Control") != "" {
					t.Fatalf("unexpected headers %v", header)
				}
			})
		}
	}
}
