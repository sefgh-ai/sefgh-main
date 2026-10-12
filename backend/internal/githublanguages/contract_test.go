package githublanguages

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

type fixture struct {
	ID      string `json:"id"`
	Request string `json:"request"`
	Expect  struct {
		Status   int                `json:"status"`
		BodyFile string             `json:"body_file"`
		Headers  map[string]*string `json:"headers"`
	} `json:"expect"`
}

func TestContracts(t *testing.T) {
	root := filepath.Join("..", "..", "..", "contracts", "github-languages")
	raw, err := os.ReadFile(filepath.Join(root, "cases.json"))
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Cases []fixture `json:"cases"`
	}
	if err := json.Unmarshal(raw, &contract); err != nil {
		t.Fatal(err)
	}
	if len(contract.Cases) == 0 {
		t.Fatal("no fixtures")
	}
	mux := http.NewServeMux()
	Register(mux)
	server := httptest.NewServer(mux)
	defer server.Close()
	for _, c := range contract.Cases {
		for _, overHTTP := range []bool{false, true} {
			mode := "memory/"
			if overHTTP {
				mode = "socket/"
			}
			t.Run(mode+c.ID, func(t *testing.T) {
				expected, err := os.ReadFile(filepath.Join(root, c.Expect.BodyFile))
				if err != nil {
					t.Fatal(err)
				}
				var response *http.Response
				if overHTTP {
					response, err = server.Client().Get(server.URL + c.Request)
					if err != nil {
						t.Fatal(err)
					}
				} else {
					rec := httptest.NewRecorder()
					mux.ServeHTTP(rec, httptest.NewRequest("GET", c.Request, nil))
					response = rec.Result()
				}
				defer response.Body.Close()
				body, err := io.ReadAll(response.Body)
				if err != nil {
					t.Fatal(err)
				}
				var got, want any
				if err := json.Unmarshal(body, &got); err != nil {
					t.Fatal(err)
				}
				if err := json.Unmarshal(expected, &want); err != nil {
					t.Fatal(err)
				}
				if !reflect.DeepEqual(got, want) {
					t.Fatal("catalog differs from approved snapshot (including order)")
				}
				if response.StatusCode != c.Expect.Status {
					t.Errorf("status = %d", response.StatusCode)
				}
				for key, value := range c.Expect.Headers {
					if value == nil {
						if _, present := response.Header[http.CanonicalHeaderKey(key)]; present {
							t.Errorf("unexpected %s", key)
						}
					} else if response.Header.Get(key) != *value {
						t.Errorf("%s = %q", key, response.Header.Get(key))
					}
				}
			})
		}
	}
}
