package starred

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// TestPublicRepositoryReads runs contracts/public-repository-reads, the
// boundary of every GitHub read, against publicRepo: the same cases that
// pin fetchRepoFromGitHub in Next.js.
func TestPublicRepositoryReads(t *testing.T) {
	raw, err := os.ReadFile("../../../contracts/public-repository-reads/cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Version int `json:"contract_version"`
		Cases   []struct {
			ID           string          `json:"id"`
			Owner        *string         `json:"owner"`
			Repo         *string         `json:"repo"`
			Status       int             `json:"status"`
			Body         json.RawMessage `json:"body"`
			NetworkError bool            `json:"network_error"`
			Calls        int             `json:"calls"`
			Expect       json.RawMessage `json:"expect"`
		} `json:"cases"`
	}
	if err := json.Unmarshal(raw, &contract); err != nil || contract.Version != 1 || len(contract.Cases) == 0 {
		t.Fatalf("contract version %d with %d cases: %v", contract.Version, len(contract.Cases), err)
	}
	for _, c := range contract.Cases {
		t.Run(c.ID, func(t *testing.T) {
			calls := 0
			client := &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
				calls++
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
			owner, repo := "", ""
			if c.Owner != nil {
				owner = *c.Owner
			}
			if c.Repo != nil {
				repo = *c.Repo
			}
			fields, ok := publicRepo(context.Background(), client, "https://api.github.com", owner, repo)
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

type roundTrip func(*http.Request) (*http.Response, error)

func (fn roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }
