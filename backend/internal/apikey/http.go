package apikey

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

// Manager is the owner-bound capability returned after verified authentication.
// Its eventual database implementation must retain the verified user's bearer.
type Manager interface {
	Issue(context.Context, string, string, []string) (Metadata, *Secret, error)
	List(context.Context, string) ([]Metadata, error)
	Revoke(context.Context, string, string) error
}

type SessionFactory func(context.Context, string) (string, Manager, error)

type HTTPOptions struct {
	GitHubTimeout time.Duration
	GitHubURL     string
	Budget        time.Duration
	SaveRecovery  func(context.Context, Completion) error
}

const MaxHTTPBody = 8 << 10
const MaxHTTPBudget = 18 * time.Second

type HTTP struct {
	open      SessionFactory
	execution *Service
	options   HTTPOptions
	search    http.Handler
	newID     func() (string, error)
}

func NewHTTP(open SessionFactory, execution *Service, options HTTPOptions) (*HTTP, error) {
	if open == nil || execution == nil || options.SaveRecovery == nil || options.Budget < 0 || options.Budget > MaxHTTPBudget || options.GitHubTimeout < 0 || options.GitHubTimeout > 10*time.Second {
		return nil, ErrPolicy
	}
	if options.Budget == 0 {
		options.Budget = MaxHTTPBudget
	}
	search, err := publicSearch(options)
	if err != nil {
		return nil, err
	}
	return &HTTP{open: open, execution: execution, options: options, search: search, newID: requestID}, nil
}

func (h *HTTP) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	ctx, cancel := context.WithTimeout(r.Context(), h.options.Budget)
	defer cancel()
	deadline, _ := ctx.Deadline()
	_ = http.NewResponseController(w).SetReadDeadline(deadline)
	returned := false
	defer func() {
		_ = recover()
		if !returned {
			// Never let adapter/storage panic payloads reach net/http's log.
			writeHTTPError(w, 503, "Service unavailable")
		}
	}()
	h.serve(w, r.WithContext(ctx))
	returned = true
}

func (h *HTTP) serve(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch {
	case path == "/api/v1/keys":
		if r.Method != "GET" && r.Method != "POST" {
			w.Header().Set("Allow", "GET, POST")
			writeHTTPError(w, 405, "Method not allowed")
			return
		}
	case strings.HasPrefix(path, "/api/v1/keys/") && canonicalSelector(strings.TrimPrefix(path, "/api/v1/keys/")):
		if r.Method != "DELETE" {
			w.Header().Set("Allow", "DELETE")
			writeHTTPError(w, 405, "Method not allowed")
			return
		}
	case path == "/api/v1/search":
		if r.Method != "GET" {
			w.Header().Set("Allow", "GET")
			writeHTTPError(w, 405, "Method not allowed")
			return
		}
	default:
		writeHTTPError(w, 404, "Not found")
		return
	}
	token, ok := httpBearer(r)
	if !ok {
		writeHTTPError(w, 401, "Unauthorized")
		return
	}
	if path == "/api/v1/search" {
		h.executeSearch(w, r, token)
		return
	}
	owner, manager, err := h.open(r.Context(), token)
	if err != nil {
		writeLifecycleError(w, err)
		return
	}
	if owner == "" || manager == nil {
		writeHTTPError(w, 503, "Service unavailable")
		return
	}
	switch r.Method {
	case "POST":
		h.issue(w, r, owner, manager)
	case "GET":
		rows, err := manager.List(r.Context(), owner)
		if err != nil {
			writeLifecycleError(w, err)
			return
		}
		if rows == nil {
			rows = []Metadata{}
		}
		writeHTTPJSON(w, 200, struct {
			Keys []Metadata `json:"keys"`
		}{rows})
	case "DELETE":
		if err := manager.Revoke(r.Context(), owner, strings.TrimPrefix(path, "/api/v1/keys/")); err != nil {
			writeLifecycleError(w, err)
			return
		}
		w.WriteHeader(204)
	}
}

func (h *HTTP) issue(w http.ResponseWriter, r *http.Request, owner string, manager Manager) {
	media, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || media != "application/json" || (params["charset"] != "" && !strings.EqualFold(params["charset"], "utf-8")) {
		writeHTTPError(w, 415, "JSON content type required")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxHTTPBody))
	if err != nil {
		var large *http.MaxBytesError
		var timeout net.Error
		if errors.As(err, &large) {
			writeHTTPError(w, 413, "Request body too large")
		} else if errors.As(err, &timeout) && timeout.Timeout() {
			writeHTTPError(w, 504, "Request timed out")
		} else if r.Context().Err() != nil {
			writeLifecycleError(w, r.Context().Err())
		} else {
			writeHTTPError(w, 400, "Invalid request body")
		}
		return
	}
	name, scopes, err := decodeCreation(raw)
	if err != nil {
		writeLifecycleError(w, err)
		return
	}
	metadata, secret, err := manager.Issue(r.Context(), owner, name, scopes)
	if err != nil {
		writeLifecycleError(w, err)
		return
	}
	rawKey, err := secret.Take()
	if err != nil {
		writeHTTPError(w, 503, "Service unavailable")
		return
	}
	writeHTTPJSON(w, 201, struct {
		Key    Metadata `json:"key"`
		Secret string   `json:"secret"`
	}{metadata, rawKey})
}

// Canonical member names and duplicate detection deliberately precede decoding
// values: encoding/json's struct matching otherwise accepts case aliases.
func decodeCreation(raw []byte) (string, []string, error) {
	if !utf8.Valid(raw) {
		return "", nil, ErrInput
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	start, err := d.Token()
	if err != nil || start != json.Delim('{') {
		return "", nil, ErrInput
	}
	fields := map[string]json.RawMessage{}
	for d.More() {
		key, err := d.Token()
		name, ok := key.(string)
		if err != nil || !ok || (name != "name" && name != "scopes") || fields[name] != nil {
			return "", nil, ErrInput
		}
		var value json.RawMessage
		if err := d.Decode(&value); err != nil {
			return "", nil, ErrInput
		}
		fields[name] = value
	}
	if end, err := d.Token(); err != nil || end != json.Delim('}') {
		return "", nil, ErrInput
	}
	if _, err := d.Token(); err != io.EOF || len(fields) != 2 {
		return "", nil, ErrInput
	}
	var name string
	var scopes []string
	if json.Unmarshal(fields["name"], &name) != nil || json.Unmarshal(fields["scopes"], &scopes) != nil {
		return "", nil, ErrInput
	}
	return name, scopes, nil
}

func canonicalSelector(value string) bool {
	if len(value) != 16 {
		return false
	}
	decoded, err := base64.RawURLEncoding.Strict().DecodeString(value)
	return err == nil && len(decoded) == 12 && base64.RawURLEncoding.EncodeToString(decoded) == value
}

func httpBearer(r *http.Request) (string, bool) {
	values := r.Header.Values("Authorization")
	if len(values) != 1 || len(values[0]) > 8200 {
		return "", false
	}
	scheme, token, ok := strings.Cut(values[0], " ")
	if !ok || len(scheme) != 6 || !strings.EqualFold(scheme, "Bearer") || len(token) == 0 || len(token) > 8192 {
		return "", false
	}
	for _, c := range token {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || strings.ContainsRune("._~+/-=", c)) {
			return "", false
		}
	}
	return token, true
}

func writeLifecycleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrOwner), errors.Is(err, ErrDenied):
		writeHTTPError(w, 401, "Unauthorized")
	case errors.Is(err, ErrInput):
		writeHTTPError(w, 400, "Invalid request")
	case errors.Is(err, ErrActiveLimit):
		writeHTTPError(w, 409, "Active key limit reached")
	case errors.Is(err, ErrLimit):
		writeHTTPError(w, 429, "API quota exhausted")
	case errors.Is(err, context.DeadlineExceeded):
		writeHTTPError(w, 504, "Request timed out")
	case errors.Is(err, context.Canceled):
		writeHTTPError(w, 408, "Request cancelled")
	default:
		writeHTTPError(w, 503, "Service unavailable")
	}
}

func writeHTTPError(w http.ResponseWriter, status int, message string) {
	writeHTTPJSON(w, status, struct {
		Error string `json:"error"`
	}{message})
}

func writeHTTPJSON(w http.ResponseWriter, status int, value any) {
	raw, err := json.Marshal(value)
	if err != nil {
		status, raw = 503, []byte(`{"error":"Service unavailable"}`)
	}
	w.WriteHeader(status)
	_, _ = w.Write(append(raw, '\n'))
}
