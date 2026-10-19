package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/activity"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aienhance"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/avatar"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/comments"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/dataproxy"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubdevelopers"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubrepos"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/publictoken"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/starred"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/trendingtopics"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/videos"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/vote"
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
	if ailimit.RequestBudget >= writeTimeout {
		t.Fatal("whole AI request exceeds the server write deadline")
	}
	// Avatar's budget includes identity verification, upload and cleanup.
	if avatar.Budget >= writeTimeout || avatar.CleanupBudget >= avatar.Budget {
		t.Fatal("avatar work can exceed the response budget")
	}
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
	// A signed-out read may first wait for the public read token's check,
	// which does not stop at the handler's own deadline.
	if total := publictoken.CheckTimeout + githubrepos.DetailTimeout; total >= writeTimeout {
		t.Errorf("public token check plus detail route can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// Chat asks Supabase first, then makes one provider call: a chat reply
	// or a title, never both.
	if total := githubaccess.DefaultTimeout + aiprovider.Timeout; total >= writeTimeout {
		t.Errorf("sign-in check plus a chat call can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// Starred asks Supabase, then the database once, then GitHub within its
	// budget for all the rows together.
	if total := githubaccess.DefaultTimeout + supabaserest.Timeout + starred.RefreshBudget; total >= writeTimeout {
		t.Errorf("sign-in, the database and the GitHub budget can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// Share asks the database once, with no sign-in check.
	if supabaserest.Timeout >= writeTimeout {
		t.Errorf("a share read can take %v, which is not below the server's write timeout of %v", supabaserest.Timeout, writeTimeout)
	}
	// Collect asks Supabase who is calling, then writes, then counts: two
	// database calls. A rating does the same: an upsert, then a read; and its
	// GET makes two reads. So does a comment vote: a write, then one read.
	if total := githubaccess.DefaultTimeout + 2*supabaserest.Timeout; total >= writeTimeout {
		t.Errorf("sign-in, a write and a count can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// A vote asks Supabase, then writes, calls the stats function and, when
	// that fails, counts: three database calls, within one budget.
	if total := githubaccess.DefaultTimeout + vote.Budget; total >= writeTimeout {
		t.Errorf("sign-in and a vote's database budget can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	if vote.Budget >= 3*supabaserest.Timeout {
		t.Errorf("vote.Budget %v does not bound the three calls of %v each", vote.Budget, supabaserest.Timeout)
	}
	// Comments: a GET reads the list, then every comment's details within one
	// budget; a POST asks Supabase, then makes three calls within another.
	if total := supabaserest.Timeout + comments.DetailsBudget; total >= writeTimeout {
		t.Errorf("the comment list and its details can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	if total := githubaccess.DefaultTimeout + comments.WriteBudget; total >= writeTimeout {
		t.Errorf("sign-in and a comment's three calls can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// Videos: a GET reads the list, then every uploader within one budget; a
	// POST asks Supabase, then makes two calls within another. A DELETE asks
	// Supabase, then deletes once, as a sign-in and a write above.
	if total := supabaserest.Timeout + videos.DetailsBudget; total >= writeTimeout {
		t.Errorf("the video list and its uploaders can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	if total := githubaccess.DefaultTimeout + videos.WriteBudget; total >= writeTimeout {
		t.Errorf("sign-in and a video's two calls can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
	}
	// The trending topics' searches share one budget; nothing comes before it.
	if trendingtopics.Budget >= writeTimeout {
		t.Errorf("the trending topics' budget %v is not below the server's write timeout of %v", trendingtopics.Budget, writeTimeout)
	}
	// A proxied data request reads its body and the database's reply within
	// one budget; nothing comes before it.
	if dataproxy.Budget >= writeTimeout {
		t.Errorf("the data proxy's budget %v is not below the server's write timeout of %v", dataproxy.Budget, writeTimeout)
	}
	// Activity asks Supabase who is calling, then the database once.
	if total := githubaccess.DefaultTimeout + activity.Timeout; total >= writeTimeout {
		t.Errorf("sign-in check plus the activity query can take %v, which is not below the server's write timeout of %v", total, writeTimeout)
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
