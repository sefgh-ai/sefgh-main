package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aienhance"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubdevelopers"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubrepos"
)

// TestSecurityHeadersMatchNextConfig fails when next.config.mjs changes a
// security header without the same change here, or the other way round.
func TestSecurityHeadersMatchNextConfig(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "next.config.mjs"))
	if err != nil {
		t.Fatalf("reading next.config.mjs: %v", err)
	}
	config := string(data)
	for name, value := range securityHeaders {
		if !strings.Contains(config, `key: "`+name+`"`) {
			t.Errorf("next.config.mjs has no %s header", name)
		}
		if !strings.Contains(config, `"`+value+`"`) {
			t.Errorf("next.config.mjs has a different value for %s", name)
		}
	}
	if got := strings.Count(config, "key: \""); got != len(securityHeaders) {
		t.Errorf("next.config.mjs defines %d headers, Go defines %d", got, len(securityHeaders))
	}
}

// A handler that outlasts the write timeout gets its caller a dropped
// connection, not a reply.
func TestHandlersFinishInsideTheWriteTimeout(t *testing.T) {
	if githubdevelopers.Timeout >= writeTimeout {
		t.Fatal("developers timeout exceeds write timeout")
	}
	if githubrepos.DetailTimeout >= writeTimeout {
		t.Errorf("githubrepos.DetailTimeout is %v, which is not below the server's write timeout of %v", githubrepos.DetailTimeout, writeTimeout)
	}
	if aiprovider.Timeout >= writeTimeout || aienhance.Timeout >= writeTimeout {
		t.Errorf("an AI provider call may take %v or %v, which is not below the server's write timeout of %v", aiprovider.Timeout, aienhance.Timeout, writeTimeout)
	}
	// A request with credentials is verified first, and that time counts too.
	if total := githubaccess.DefaultTimeout + githubrepos.DetailTimeout; total >= writeTimeout {
		t.Errorf("identity check plus detail route can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// Chat asks Supabase first, then makes one provider call: a chat reply
	// or a title, never both.
	if total := githubaccess.DefaultTimeout + aiprovider.Timeout; total >= writeTimeout {
		t.Errorf("sign-in check plus a chat call can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
}

func TestListenAddr(t *testing.T) {
	tests := []struct {
		name    string
		env     map[string]string
		want    string
		wantErr bool
	}{
		{name: "nothing set stays on this machine", want: "127.0.0.1:8787"},
		{name: "PORT from a hosting platform", env: map[string]string{"PORT": "3000"}, want: ":3000"},
		{name: "SEFGH_API_ADDR alone", env: map[string]string{"SEFGH_API_ADDR": "127.0.0.1:9000"}, want: "127.0.0.1:9000"},
		{name: "SEFGH_API_ADDR wins over PORT", env: map[string]string{"SEFGH_API_ADDR": "127.0.0.1:9000", "PORT": "3000"}, want: "127.0.0.1:9000"},
		{name: "SEFGH_API_ADDR wins over a bad PORT", env: map[string]string{"SEFGH_API_ADDR": "127.0.0.1:9000", "PORT": "http"}, want: "127.0.0.1:9000"},
		{name: "smallest port", env: map[string]string{"PORT": "1"}, want: ":1"},
		{name: "largest port", env: map[string]string{"PORT": "65535"}, want: ":65535"},
		{name: "leading zeros are tidied", env: map[string]string{"PORT": "08080"}, want: ":8080"},
		{name: "zero", env: map[string]string{"PORT": "0"}, wantErr: true},
		{name: "one past the largest", env: map[string]string{"PORT": "65536"}, wantErr: true},
		{name: "negative", env: map[string]string{"PORT": "-1"}, wantErr: true},
		{name: "a service name", env: map[string]string{"PORT": "http"}, wantErr: true},
		{name: "a whole address", env: map[string]string{"PORT": "0.0.0.0:3000"}, wantErr: true},
		{name: "a space", env: map[string]string{"PORT": " 3000"}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reading a missing key from a map, even a nil one, gives "".
			// That is what os.Getenv gives for a variable that is not set.
			got, err := listenAddr(func(name string) string { return tt.env[name] })
			if tt.wantErr {
				if err == nil {
					t.Fatalf("listenAddr = %q, want an error", got)
				}
				if !strings.Contains(err.Error(), "PORT") {
					t.Errorf("error %q does not name PORT", err)
				}
				return
			}
			if err != nil || got != tt.want {
				t.Errorf("listenAddr = %q, %v; want %q", got, err, tt.want)
			}
		})
	}
}

func TestMarkBackend(t *testing.T) {
	h := markBackend(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if got := rec.Header().Get("X-Sefgh-Backend"); got != "go" {
		t.Errorf("X-Sefgh-Backend = %q, want go", got)
	}
	for name, value := range securityHeaders {
		if got := rec.Header().Get(name); got != value {
			t.Errorf("%s = %q, want %q", name, got, value)
		}
	}
}
