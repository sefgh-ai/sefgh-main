package publicrepo

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

type fixture struct {
	ID           string          `json:"id"`
	Owner        *string         `json:"owner"`
	Repo         *string         `json:"repo"`
	Status       int             `json:"status"`
	Body         json.RawMessage `json:"body"`
	NetworkError bool            `json:"network_error"`
	Calls        int             `json:"calls"`
	Expect       json.RawMessage `json:"expect"`
}

func loadContract(t *testing.T) []fixture {
	t.Helper()
	raw, err := os.ReadFile("../../../contracts/public-repository-reads/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version int       `json:"contract_version"`
		Cases   []fixture `json:"cases"`
	}
	if err := json.Unmarshal(raw, &contract); err != nil || contract.Version != 1 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases: %v", contract.Version, len(contract.Cases), err)
	}
	return contract.Cases
}

// gitHub stands in for GitHub with the fixture's reply and counts the calls.
func gitHub(t *testing.T, c fixture, calls *int) *http.Client {
	return &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		*calls++
		if r.Header.Get("Authorization") != "" {
			t.Error("a credential reached GitHub")
		}
		if c.NetworkError {
			return nil, errors.New("offline")
		}
		body := string(c.Body)
		if body == "" {
			body = "null"
		}
		return &http.Response{StatusCode: c.Status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
	})}
}

func names(c fixture) (owner, repo string) {
	if c.Owner != nil {
		owner = *c.Owner
	}
	if c.Repo != nil {
		repo = *c.Repo
	}
	return owner, repo
}

// TestPublicRepositoryReads runs contracts/public-repository-reads, the
// boundary of every GitHub read, against Read: the same cases that pin
// fetchRepoFromGitHub in Next.js.
func TestPublicRepositoryReads(t *testing.T) {
	for _, c := range loadContract(t) {
		t.Run(c.ID, func(t *testing.T) {
			calls := 0
			owner, repo := names(c)
			fields, ok := Read(context.Background(), gitHub(t, c, &calls), "https://api.github.com", owner, repo)
			var got any
			if ok {
				var buffer bytes.Buffer
				jscompat.WriteObject(&buffer, fields)
				_ = json.Unmarshal(buffer.Bytes(), &got)
			}
			var want any
			_ = json.Unmarshal(c.Expect, &want)
			if !reflect.DeepEqual(got, want) || calls != c.Calls {
				t.Errorf("got %v after %d calls; want %v after %d", got, calls, want, c.Calls)
			}
		})
	}
}

// TestRouteAnswersTheContract runs the same cases through the route the
// repository page asks: the repository with 200 where fetchRepoFromGitHub
// returns it, and no 200 where it returns null. A name GitHub would be asked
// about gets 404 with null; one the router cannot even match (an empty or
// dot segment) never reaches GitHub either.
func TestRouteAnswersTheContract(t *testing.T) {
	for _, c := range loadContract(t) {
		t.Run(c.ID, func(t *testing.T) {
			calls := 0
			mux := http.NewServeMux()
			(&Handler{Client: gitHub(t, c, &calls)}).Register(mux)
			owner, repo := names(c)
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/public-repo/"+url.PathEscape(owner)+"/"+url.PathEscape(repo), nil))

			var want any
			_ = json.Unmarshal(c.Expect, &want)
			if calls != c.Calls {
				t.Errorf("%d calls to GitHub, want %d", calls, c.Calls)
			}
			if want == nil {
				if rec.Code == 200 {
					t.Fatalf("200 %s, want no repository", rec.Body)
				}
				if c.Calls > 0 && (rec.Code != 404 || rec.Body.String() != "null") {
					t.Errorf("%d %q, want 404 null", rec.Code, rec.Body)
				}
				return
			}
			var got any
			if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &got) != nil || !reflect.DeepEqual(got, want) {
				t.Fatalf("%d %s, want 200 %v", rec.Code, rec.Body, want)
			}
			if rec.Header().Get("Cache-Control") != "private, no-store" || rec.Header().Get("Content-Type") != "application/json" {
				t.Errorf("headers %v", rec.Header())
			}
		})
	}
}

// Only GET is served, and the reply keeps GitHub's field order.
func TestOnlyGetAndFieldOrderKept(t *testing.T) {
	mux := http.NewServeMux()
	(&Handler{Client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"name":"demo","private":false,"id":1}`)), Request: r}, nil
	})}}).Register(mux)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("GET", "/api/github/public-repo/octo/demo", nil))
	if rec.Code != 200 || rec.Body.String() != `{"name":"demo","private":false,"id":1}` {
		t.Errorf("%d %s", rec.Code, rec.Body)
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("POST", "/api/github/public-repo/octo/demo", nil))
	if rec.Code != 405 {
		t.Errorf("POST: %d, want 405", rec.Code)
	}
}

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }
