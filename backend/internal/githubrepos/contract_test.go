package githubrepos

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"
)

type fixtureCall struct {
	URL             string            `json:"wire_url"`
	Headers         map[string]string `json:"headers"`
	Status          int               `json:"status"`
	ResponseHeaders map[string]string `json:"response_headers"`
	Body            json.RawMessage   `json:"body"`
	RawBody         *string           `json:"raw_body"`
	NetworkError    bool              `json:"network_error"`
}
type fixture struct {
	ID      string        `json:"id"`
	Route   string        `json:"route"`
	Request string        `json:"request"`
	Token   string        `json:"github_token"`
	Calls   []fixtureCall `json:"calls"`
	Expect  struct {
		Status int             `json:"status"`
		Body   json.RawMessage `json:"body"`
	} `json:"expect"`
}
type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func loadFixtures(t *testing.T) []fixture {
	t.Helper()
	b, err := os.ReadFile("../../../contracts/github-repositories/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var data struct {
		Cases []fixture `json:"cases"`
	}
	if err = json.Unmarshal(b, &data); err != nil {
		t.Fatal(err)
	}
	if len(data.Cases) == 0 {
		t.Fatal("no fixtures")
	}
	return data.Cases
}

func TestContracts(t *testing.T) {
	for _, tc := range loadFixtures(t) {
		t.Run(tc.ID, func(t *testing.T) {
			calls := 0
			transport := roundTripFunc(func(req *http.Request) (*http.Response, error) {
				i := calls
				calls++
				if i >= len(tc.Calls) {
					t.Error("unexpected upstream request")
					return nil, errors.New("unexpected")
				}
				want := tc.Calls[i]
				wireURL := req.URL.Scheme + "://" + req.URL.Host + req.URL.RequestURI()
				if wireURL != want.URL {
					t.Errorf("URL got %q want %q", wireURL, want.URL)
				}
				gotHeaders := map[string]string{}
				for k := range req.Header {
					gotHeaders[k] = req.Header.Get(k)
				}
				if !reflect.DeepEqual(gotHeaders, want.Headers) {
					t.Errorf("headers %v want %v", gotHeaders, want.Headers)
				}
				if want.NetworkError {
					return nil, errors.New("stub connection failed")
				}
				header := http.Header{}
				for k, v := range want.ResponseHeaders {
					header.Set(k, v)
				}
				body := string(want.Body)
				if want.RawBody != nil {
					body = *want.RawBody
				}
				return &http.Response{StatusCode: want.Status, Header: header, Body: io.NopCloser(strings.NewReader(body)), Request: req}, nil
			})
			h := New(&http.Client{Transport: transport}, "https://api.github.com", tc.Token)
			mux := http.NewServeMux()
			h.Register(mux)
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, httptest.NewRequest("GET", tc.Request, nil))
			if calls != len(tc.Calls) {
				t.Errorf("calls %d want %d", calls, len(tc.Calls))
			}
			if rec.Code != tc.Expect.Status {
				t.Errorf("status %d want %d", rec.Code, tc.Expect.Status)
			}
			var got, want any
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("response %q: %v", rec.Body.String(), err)
			}
			if err := json.Unmarshal(tc.Expect.Body, &want); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Errorf("body %s want %s", rec.Body.String(), tc.Expect.Body)
			}
			for k, v := range map[string]string{"Content-Type": "application/json", "Cache-Control": "", "Retry-After": ""} {
				if rec.Header().Get(k) != v {
					t.Errorf("header %s = %q", k, rec.Header().Get(k))
				}
			}
		})
	}
}
