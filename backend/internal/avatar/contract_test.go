package avatar

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
)

type fileSpec struct {
	Name string  `json:"name"`
	Type *string `json:"type"`
	Size *int    `json:"size"`
	Byte *byte   `json:"byte"`
}
type fieldSpec struct {
	Name  string    `json:"name"`
	Value string    `json:"value"`
	File  *fileSpec `json:"file"`
}
type answer struct {
	Status       int             `json:"status"`
	Body         json.RawMessage `json:"body"`
	Raw          *string         `json:"raw"`
	NetworkError bool            `json:"network_error"`
}
type fixture struct {
	ID            string          `json:"id"`
	Session       *string         `json:"session"`
	User          json.RawMessage `json:"user"`
	AuthError     bool            `json:"auth_error"`
	File          *fileSpec       `json:"file"`
	Fields        []fieldSpec     `json:"fields"`
	RawBody       *string         `json:"raw_body"`
	ContentType   string          `json:"content_type"`
	ClientThrows  bool            `json:"client_throws"`
	EngineMessage bool            `json:"engine_message"`
	Database      []answer        `json:"database"`
	Expect        struct {
		Status      int              `json:"status"`
		Body        map[string]any   `json:"body"`
		ContentType string           `json:"content_type"`
		Cache       *string          `json:"cache_control"`
		Database    []map[string]any `json:"database"`
	} `json:"expect"`
}
type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

const fixtureURL = "https://contract-supabase.invalid"
const fixtureKey = "public-fixture-key"

func fixtureBody(t *testing.T, f fixture) ([]byte, string) {
	t.Helper()
	if f.RawBody != nil {
		kind := f.ContentType
		if kind == "" {
			kind = "application/json"
		}
		return []byte(*f.RawBody), kind
	}
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fields := f.Fields
	if fields == nil && f.File != nil {
		fields = []fieldSpec{{Name: "avatar", File: f.File}}
	}
	for _, field := range fields {
		if field.File == nil {
			_ = w.WriteField(field.Name, field.Value)
			continue
		}
		v := field.File
		name := v.Name
		if name == "" {
			name = "photo.png"
		}
		kind := "image/png"
		if v.Type != nil {
			kind = *v.Type
		}
		if kind == "" {
			kind = "application/octet-stream"
		}
		header := textproto.MIMEHeader{}
		header.Set("Content-Disposition", mime.FormatMediaType("form-data", map[string]string{"name": field.Name, "filename": name}))
		header.Set("Content-Type", kind)
		part, e := w.CreatePart(header)
		if e != nil {
			t.Fatal(e)
		}
		size := 3
		if v.Size != nil {
			size = *v.Size
		}
		b := byte(65)
		if v.Byte != nil {
			b = *v.Byte
		}
		_, _ = part.Write(bytes.Repeat([]byte{b}, size))
	}
	_ = w.Close()
	return buf.Bytes(), w.FormDataContentType()
}

func TestContract(t *testing.T) {
	raw, e := os.ReadFile("../../../contracts/upload-avatar/cases.json")
	if e != nil {
		t.Fatal(e)
	}
	var contract struct {
		Version int       `json:"contract_version"`
		Cases   []fixture `json:"cases"`
	}
	if e = json.Unmarshal(raw, &contract); e != nil {
		t.Fatal(e)
	}
	if contract.Version != 2 {
		t.Fatal(contract.Version)
	}
	for _, f := range contract.Cases {
		t.Run(f.ID, func(t *testing.T) {
			calls := []map[string]any{}
			client := &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
				if r.URL.Host != "contract-supabase.invalid" || r.Header.Get("apikey") != fixtureKey {
					t.Errorf("unexpected project/credential: %s", r.URL.Host)
				}
				reply := func(status int, body string) *http.Response {
					return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), Request: r}
				}
				if r.URL.Path == "/auth/v1/user" && r.Method == "GET" {
					if f.Session == nil || f.AuthError || string(f.User) == "null" {
						return reply(401, `{"msg":"refused"}`), nil
					}
					return reply(200, string(f.User)), nil
				}
				header := func(name string) any {
					v := r.Header.Get(name)
					if v == "" {
						return nil
					}
					return v
				}
				var body any
				if r.Body != nil {
					raw, _ := io.ReadAll(r.Body)
					if strings.HasPrefix(r.Header.Get("Content-Type"), "image/") {
						hash := sha256.Sum256(raw)
						body = map[string]any{"bytes": float64(len(raw)), "sha256": hex.EncodeToString(hash[:])}
					} else if len(raw) > 0 {
						if e := json.Unmarshal(raw, &body); e != nil {
							t.Fatal(e)
						}
					}
				}
				calls = append(calls, map[string]any{"method": r.Method, "path": r.URL.RequestURI(), "authorization": header("Authorization"), "apikey": header("apikey"), "content_type": header("Content-Type"), "cache_control": header("Cache-Control"), "x_upsert": header("X-Upsert"), "body": body})
				a := answer{Status: 200, Body: json.RawMessage(`[]`)}
				if len(calls) <= len(f.Database) {
					a = f.Database[len(calls)-1]
				}
				if a.NetworkError {
					return nil, errors.New("sensitive upstream URL and token")
				}
				if a.Status == 0 {
					a.Status = 200
				}
				bodyText := string(a.Body)
				if a.Raw != nil {
					bodyText = *a.Raw
				}
				return reply(a.Status, bodyText), nil
			})}
			verifier := githubaccess.Verifier{SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Client: client}
			h := &Handler{User: verifier.User, HTTP: client, SupabaseURL: fixtureURL, SupabaseKey: fixtureKey, Now: func() time.Time { return time.UnixMilli(1792229400000) }, Logger: quiet}
			if f.ClientThrows {
				h.SupabaseURL = ""
			}
			body, kind := fixtureBody(t, f)
			req := httptest.NewRequest("POST", "/api/upload-avatar", bytes.NewReader(body))
			req.Header.Set("Content-Type", kind)
			if f.Session != nil {
				req.Header.Set("Authorization", "Bearer "+*f.Session)
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, req)
			if w.Code != f.Expect.Status {
				t.Errorf("status %d want %d: %s", w.Code, f.Expect.Status, w.Body)
			}
			var got map[string]any
			if e := json.Unmarshal(w.Body.Bytes(), &got); e != nil {
				t.Fatal(e)
			}
			if f.EngineMessage {
				if text, ok := got["details"].(string); !ok || text == "" {
					t.Error("missing engine error details")
				}
				got["details"] = f.Expect.Body["details"]
			}
			if !reflect.DeepEqual(got, f.Expect.Body) {
				t.Errorf("body %#v want %#v", got, f.Expect.Body)
			}
			if w.Header().Get("Content-Type") != f.Expect.ContentType {
				t.Error("content type")
			}
			if w.Header().Get("Cache-Control") != "" {
				t.Error("unexpected cache header")
			}
			if !reflect.DeepEqual(calls, f.Expect.Database) {
				a, _ := json.Marshal(calls)
				b, _ := json.Marshal(f.Expect.Database)
				t.Errorf("calls\n%s\nwant\n%s", a, b)
			}
		})
	}
}
