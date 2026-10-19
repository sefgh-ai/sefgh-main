// Package dataproxy carries the browser's own database calls through Go
// (DATA-PROXY-001), for the areas listed in policy.json: notifications,
// profile, user stats, home, submissions, search stats, conversations, the
// repository page's reads and activity. The owner chose this design on
// 2026-10-19 (docs/plans/browser-data.md).
//
// With an area in NEXT_PUBLIC_SEFGH_GO_DATA, the browser's Supabase client
// sends that area's Data API requests to
//
//	/api/data/{area}/rest/v1/{table or rpc/function}?{query}
//
// instead of Supabase. This handler checks each request against the area's
// rules (which tables or functions, which methods, which fields a write may
// set) and forwards it as it is, with the caller's own token, so row-level
// security decides exactly as it did for the browser, and supabase-js reads
// the database's own reply. Anything the rules do not allow is refused with
// a 403 in the Data API's own error shape, without asking the database.
//
// The token is not checked with Supabase Auth here: the Data API checks it,
// as it always did. A request without a bearer goes with the public key, as
// a signed-out browser's does.
package dataproxy

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// Budget bounds one proxied request: reading its body and the database's
// reply together, below the server's 30-second write limit.
const Budget = 20 * time.Second

// MaxBodyBytes bounds a write's body. A conversation's messages are the
// largest; Vercel accepts at most 4.5 MB in any case.
const MaxBodyBytes = 4 << 20

// MaxReplyBytes bounds the database's reply passed back.
const MaxReplyBytes = 16 << 20

//go:embed policy.json
var policyJSON []byte

// Rule is what an area may do with one table or function.
type Rule struct {
	Methods []string `json:"methods"`
	// Writable lists the fields a POST or PATCH body (or a function's
	// arguments) may set. None means nothing may be written.
	Writable []string `json:"writable"`
}

// Policy maps each area to its tables ("name") and functions
// ("rpc/name").
type Policy map[string]map[string]Rule

// DefaultPolicy is policy.json.
func DefaultPolicy() Policy {
	var p Policy
	if err := json.Unmarshal(policyJSON, &p); err != nil {
		panic("dataproxy: policy.json: " + err.Error())
	}
	return p
}

// Handler forwards allowed requests. Policy, SupabaseURL and SupabaseKey
// are required; Client and Logger have defaults.
type Handler struct {
	Policy                   Policy
	Client                   *http.Client
	SupabaseURL, SupabaseKey string
	Logger                   *slog.Logger
}

// Register adds the proxy's route to mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("/api/data/{area}/rest/v1/{rest...}", h)
}

// forwarded are the request headers the Data API reads, besides the token.
var forwarded = []string{"Accept", "Content-Type", "Prefer", "Accept-Profile", "Content-Profile", "Range"}

// returned are the reply headers supabase-js reads.
var returned = []string{"Content-Type", "Content-Range", "Preference-Applied"}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), Budget)
	defer cancel()
	deadline, _ := ctx.Deadline()
	_ = http.NewResponseController(w).SetReadDeadline(deadline)

	area := r.PathValue("area")
	rules, known := h.Policy[area]
	if !known {
		h.refuse(w, 404, area, "", "the area "+area+" is not served")
		return
	}
	rest := r.PathValue("rest")
	target := targetOf(rest)
	rule, allowed := rules[target]
	if !allowed || target != strings.SplitN(rest, "?", 2)[0] {
		h.refuse(w, 403, area, target, target+" is not served for "+area)
		return
	}
	if !contains(rule.Methods, r.Method) {
		h.refuse(w, 403, area, target, r.Method+" "+target+" is not allowed for "+area)
		return
	}

	var body []byte
	if r.Method == http.MethodPost || r.Method == http.MethodPatch {
		var err error
		body, err = io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
		if err != nil {
			h.refuse(w, 400, area, target, "the body could not be read")
			return
		}
		if field, ok := firstNotWritable(body, rule.Writable); !ok {
			h.refuse(w, 403, area, target, target+"."+field+" cannot be written for "+area)
			return
		}
	}

	if h.SupabaseURL == "" || h.SupabaseKey == "" {
		h.refuse(w, 500, area, target, "the database is not configured")
		return
	}
	escaped := strings.TrimPrefix(r.URL.EscapedPath(), "/api/data/"+url.PathEscape(area)+"/rest/v1/")
	upstream := strings.TrimRight(h.SupabaseURL, "/") + "/rest/v1/" + escaped
	if r.URL.RawQuery != "" {
		upstream += "?" + r.URL.RawQuery
	}
	req, err := http.NewRequestWithContext(ctx, r.Method, upstream, bytes.NewReader(body))
	if err != nil {
		h.refuse(w, 400, area, target, "the request could not be made")
		return
	}
	if body == nil {
		req.Body, req.ContentLength = http.NoBody, 0
	}
	for _, name := range forwarded {
		if value := r.Header.Get(name); value != "" {
			req.Header.Set(name, value)
		}
	}
	bearer := r.Header.Get("Authorization")
	if !strings.HasPrefix(bearer, "Bearer ") || strings.TrimSpace(bearer[len("Bearer "):]) == "" {
		bearer = "Bearer " + h.SupabaseKey
	}
	req.Header.Set("Authorization", bearer)
	req.Header.Set("apikey", h.SupabaseKey)

	client := h.Client
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	resp, err := client.Do(req)
	if err != nil {
		h.log(area, target, 0, err)
		h.refuse(w, 502, area, target, "the database could not be reached")
		return
	}
	defer resp.Body.Close()
	reply, err := io.ReadAll(io.LimitReader(resp.Body, MaxReplyBytes+1))
	if err != nil || len(reply) > MaxReplyBytes {
		h.log(area, target, resp.StatusCode, errors.New("the reply could not be read whole"))
		h.refuse(w, 502, area, target, "the database's reply could not be read")
		return
	}
	if resp.StatusCode >= 500 {
		h.log(area, target, resp.StatusCode, nil)
	}
	for _, name := range returned {
		if value := resp.Header.Get(name); value != "" {
			w.Header().Set(name, value)
		}
	}
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(resp.StatusCode)
	if r.Method != http.MethodHead {
		_, _ = w.Write(reply)
	}
}

// targetOf is the table, or "rpc/" and the function, a Data API path names.
func targetOf(rest string) string {
	if fn, isRPC := strings.CutPrefix(rest, "rpc/"); isRPC {
		name, _, _ := strings.Cut(fn, "/")
		return "rpc/" + name
	}
	name, _, _ := strings.Cut(rest, "/")
	return name
}

// firstNotWritable checks a write's fields: an object's, or every object's
// in a list. It answers the first field not listed, and false; or "" and
// true. A body that is not JSON objects is refused as field "body".
func firstNotWritable(body []byte, writable []string) (string, bool) {
	check := func(raw json.RawMessage) (string, bool) {
		fields, ok := jscompat.ObjectFields(raw)
		if !ok || jscompat.Kind(raw) != '{' {
			return "body", false
		}
		for _, f := range fields {
			if !contains(writable, f.Name) {
				return f.Name, false
			}
		}
		return "", true
	}
	text := []byte(jscompat.DecodeUTF8(body))
	if jscompat.Kind(text) == '[' {
		elements, ok := jscompat.Elements(text)
		if !ok {
			return "body", false
		}
		for _, element := range elements {
			if field, ok := check(element); !ok {
				return field, false
			}
		}
		return "", true
	}
	return check(text)
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

// refuse answers in the Data API's error shape, so supabase-js reads it as
// the database's own error.
func (h *Handler) refuse(w http.ResponseWriter, status int, area, target, message string) {
	if status == 403 || status == 404 {
		h.log(area, target, status, nil)
	}
	code := "42501"
	if status >= 500 {
		code = ""
	}
	body, _ := json.Marshal(map[string]any{"code": code, "details": nil, "hint": nil, "message": message})
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// log records the area, the table and the status, never the query, the
// body, the token or the database's own words.
func (h *Handler) log(area, target string, status int, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "data", "area", area, "target", target}
	if status != 0 {
		attrs = append(attrs, "status", status)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err)) // never the URL, which holds the query
	}
	logger.Warn("data request not served as asked", attrs...)
}
