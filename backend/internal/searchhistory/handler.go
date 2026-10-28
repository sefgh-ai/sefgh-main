// Package searchhistory serves the browser's search history from Go
// (DATA-001b): the first area of the browser's own database calls to move
// behind the backend (docs/plans/browser-data.md). With "search-history" in
// NEXT_PUBLIC_SEFGH_GO_DATA, src/lib/supabase/search-history.js asks these
// endpoints instead of the database:
//
//	POST   /api/search-history           saveSearchHistory
//	GET    /api/search-history           getSearchHistory
//	DELETE /api/search-history/{id}      deleteSearchHistoryItem
//	DELETE /api/search-history           clearSearchHistory
//	GET    /api/search-history/count     getSearchHistoryCount
//
// Each answers exactly the value its browser function returns, so the module
// passes it on. Every request needs a signed-in caller, and every database
// request goes as that caller, with their own token, so row-level security
// decides as it did for the browser.
//
// The module still sends the user id it was given. It is only a filter: it
// must be the caller's own, and when it is not, the answer is the outcome
// row-level security gave the browser for another user's id (nothing found,
// nothing saved, nothing deleted), without asking the database. A client
// cannot name another user.
//
// Fixed here, once, after the area was switched on: a saved search increases
// the platform's search counter (bug register R-102, contract version 2).
// The browser module never sent that request; its direct path, used only when
// Go does not answer, still does not, until it is retired.
package searchhistory

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a saved search: a query and its filters.
const MaxBodyBytes = 64 << 10

const table = "search_history"

// Handler serves the search history. User, Database and the two settings
// are required; Logger has a default.
type Handler struct {
	// User says who is calling: their id and own access token, with 200, or
	// another status. In the server it is githubaccess.Verifier.User.
	User func(*http.Request) (id, session string, status int)
	// Database makes the Data API calls; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	Logger                   *slog.Logger
}

// Register adds the five endpoints to mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/search-history", h.signedIn(h.save))
	mux.HandleFunc("GET /api/search-history", h.signedIn(h.list))
	mux.HandleFunc("DELETE /api/search-history/{id}", h.signedIn(h.deleteOne))
	mux.HandleFunc("DELETE /api/search-history", h.signedIn(h.clear))
	mux.HandleFunc("GET /api/search-history/count", h.signedIn(h.count))
}

// caller is who is asking, and the client for asking the database as them.
type caller struct {
	id, session string
	db          supabaserest.Client
}

// signedIn answers 401 (or the verifier's 503) unless the request comes from
// a signed-in user. The browser module then gives its usual fallback value.
func (h *Handler) signedIn(next func(http.ResponseWriter, *http.Request, caller)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r, cancel := supabaserest.BoundRequest(w, r)
		defer cancel()
		db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
		if !db.Configured() {
			h.log("settings", 0, nil)
			write(w, 500, `{"error":"Search history is not configured"}`)
			return
		}
		id, session, status := h.User(r)
		switch status {
		case 200:
			next(w, r, caller{id: id, session: session, db: db})
		case 503:
			write(w, 503, `{"error":"Sign-in could not be checked"}`)
		default:
			write(w, 401, `{"error":"Unauthorized"}`)
		}
	}
}

// save is saveSearchHistory: insert the search as the caller and answer the
// stored row, or null.
func (h *Handler) save(w http.ResponseWriter, r *http.Request, c caller) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		write(w, 400, `{"error":"The body could not be read"}`)
		return
	}
	fields, ok := jscompat.RequestFields(body)
	query, isText := parse(fields["query"]).(string)
	if !ok || !isText || jscompat.Trim(query) == "" {
		write(w, 400, `{"error":"A query is required"}`)
		return
	}
	if !own(fields["user"], c.id) {
		write(w, 200, "null") // row-level security refuses another user's row
		return
	}
	// { user_id, query, source, filters, results_count }: a field the
	// browser left out (undefined) is left out here too.
	row := []jscompat.Field{{Name: "user_id", Value: text(c.id)}, {Name: "query", Value: fields["query"]}}
	for _, f := range [][2]string{{"source", "source"}, {"filters", "filters"}, {"results_count", "resultsCount"}} {
		if value, present := fields[f[1]]; present {
			row = append(row, jscompat.Field{Name: f[0], Value: value})
		}
	}
	var insert bytes.Buffer
	jscompat.WriteObject(&insert, row)
	status, raw, err := c.db.InsertReturning(r.Context(), c.session, table, insert.Bytes())
	if _, failed := supabaserest.ReadResult(status, raw); err != nil || failed {
		h.log("save", status, err)
		write(w, 200, "null")
		return
	}
	// R-102 (contract version 2): count the search in platform_stats, as the
	// browser module meant to; its call was never awaited, so never sent.
	// increment_platform_stat runs with its owner's rights and is granted to
	// signed-in users. The counter is not critical: its answer is ignored.
	_, _, _ = c.db.RPC(r.Context(), c.session, "increment_platform_stat", []byte(`{"key":"total_searches"}`))
	write(w, 200, value(supabaserest.DataJSON(status, raw), "null"))
}

// list is getSearchHistory: one page of the caller's searches, newest first,
// optionally of one source; [] on any failure.
func (h *Handler) list(w http.ResponseWriter, r *http.Request, c caller) {
	query := jscompat.ParseQuery(r.URL.RawQuery)
	user, _ := query.Get("user")
	offset, hasOffset := query.Get("offset")
	limit, hasLimit := query.Get("limit")
	if !hasOffset || !hasLimit {
		write(w, 400, `{"error":"offset and limit are required"}`)
		return
	}
	if user != c.id {
		write(w, 200, "[]")
		return
	}
	// .select("*").eq("user_id", ...).order("created_at", desc).range(...)
	// then .eq("source", ...): the browser sends offset and limit as
	// .range() writes them.
	parts := []string{
		supabaserest.Param("select", "*"),
		supabaserest.Param("user_id", "eq."+user),
		supabaserest.Param("order", "created_at.desc"),
		supabaserest.Param("offset", offset),
		supabaserest.Param("limit", limit),
	}
	if source, _ := query.Get("source"); source != "" {
		parts = append(parts, supabaserest.Param("source", "eq."+source))
	}
	status, raw, err := c.db.Select(r.Context(), c.session, table, strings.Join(parts, "&"))
	data, failed := supabaserest.ReadResult(status, raw)
	if err != nil || failed {
		h.log("list", status, err)
		write(w, 200, "[]")
		return
	}
	// data || []
	if !jscompat.Truthy(data) {
		write(w, 200, "[]")
		return
	}
	write(w, 200, string(supabaserest.DataJSON(status, raw)))
}

// deleteOne is deleteSearchHistoryItem: delete by id as the caller, so
// row-level security limits it to their own; false only when the request
// fails.
func (h *Handler) deleteOne(w http.ResponseWriter, r *http.Request, c caller) {
	status, raw, err := c.db.Delete(r.Context(), c.session, table, supabaserest.Param("id", "eq."+r.PathValue("id")))
	if _, failed := supabaserest.ReadResult(status, raw); err != nil || failed {
		h.log("delete", status, err)
		write(w, 200, "false")
		return
	}
	write(w, 200, "true")
}

// clear is clearSearchHistory: delete the caller's searches, optionally of
// one source.
func (h *Handler) clear(w http.ResponseWriter, r *http.Request, c caller) {
	query := jscompat.ParseQuery(r.URL.RawQuery)
	user, _ := query.Get("user")
	if user != c.id {
		write(w, 200, "true") // another user's id deletes nothing, which is not an error
		return
	}
	filters := supabaserest.Param("user_id", "eq."+user)
	if source, _ := query.Get("source"); source != "" {
		filters += "&" + supabaserest.Param("source", "eq."+source)
	}
	status, raw, err := c.db.Delete(r.Context(), c.session, table, filters)
	if _, failed := supabaserest.ReadResult(status, raw); err != nil || failed {
		h.log("clear", status, err)
		write(w, 200, "false")
		return
	}
	write(w, 200, "true")
}

// count is getSearchHistoryCount: the caller's searches counted by source.
// A reply that is not a list counts as none; the browser threw there.
func (h *Handler) count(w http.ResponseWriter, r *http.Request, c caller) {
	zero := `{"total":0,"search":0,"chat":0}`
	query := jscompat.ParseQuery(r.URL.RawQuery)
	if user, _ := query.Get("user"); user != c.id {
		write(w, 200, zero)
		return
	}
	filters := supabaserest.Param("select", "source") + "&" + supabaserest.Param("user_id", "eq."+c.id)
	status, raw, err := c.db.Select(r.Context(), c.session, table, filters)
	data, failed := supabaserest.ReadResult(status, raw)
	rows, isList := data.([]any)
	if err != nil || failed || !isList {
		if err != nil || failed {
			h.log("count", status, err)
		}
		write(w, 200, zero)
		return
	}
	counts := map[string]int{"total": len(rows)}
	for _, row := range rows {
		if object, isObject := row.(map[string]any); isObject {
			if source, isText := object["source"].(string); isText && (source == "search" || source == "chat") {
				counts[source]++
			}
		}
	}
	out, _ := json.Marshal(struct {
		Total  int `json:"total"`
		Search int `json:"search"`
		Chat   int `json:"chat"`
	}{counts["total"], counts["search"], counts["chat"]})
	write(w, 200, string(out))
}

// own reports whether the user id the browser sent, as JSON, is the caller's.
func own(sent json.RawMessage, id string) bool {
	user, isText := parse(sent).(string)
	return isText && user == id
}

func parse(raw json.RawMessage) any {
	if raw == nil {
		return jscompat.Undefined
	}
	v, _ := jscompat.ParseJSON(string(raw))
	return v
}

func text(s string) json.RawMessage {
	out, _ := jscompat.ToUTF16(s).MarshalJSON()
	return out
}

// value is raw when it holds a value, and otherwise fallback.
func value(raw []byte, fallback string) string {
	if len(strings.TrimSpace(string(raw))) == 0 {
		return fallback
	}
	return string(raw)
}

// log records a stage and the database's status, never the user, their
// token or what they searched for.
func (h *Handler) log(stage string, upstream int, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "search_history", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("search history request failed", attrs...)
}

func write(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(status)
	_, _ = io.WriteString(w, body)
}
