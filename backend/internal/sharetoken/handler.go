// Package sharetoken serves GET /api/share/{token}. P7-03 retired its Next.js
// implementation; contracts/share-token keeps all current Go behavior cases.
//
// The database is asked through internal/supabaserest: with the visitor's
// own token when the request carries one, and otherwise with the project's
// public key, which is what supabase-js sends for a visitor who is signed
// out. Row-level security then decides as it does for the Next.js handler:
// anyone may read a public share that is not deleted, and a signed-in user
// may also read their own. The token is not checked with Supabase Auth
// first. The handler needs no user id, and the Data API refuses a token it
// does not accept, as it does for the Next.js handler's cookie session. The
// planned difference, as for activity: Go reads a bearer, not the session
// cookie, and the browser sends one (src/lib/supabase/session-fetch.js).
package sharetoken

import (
	"bytes"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// columns is the handler's .select(...), as postgrest-js writes it: the
// spaces between the names are dropped.
const columns = "id,share_token,is_public,title,summary,snapshot,shared_at"

// Handler answers GET /api/share/{token}. Database is required; Logger has
// a default.
type Handler struct {
	// Database makes the Data API call; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	Logger                   *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
	// Missing settings are an internal failure with fixed public text.
	if !db.Configured() {
		h.log("settings", 0, nil)
		write(w, 500, []byte(`{"error":"Internal server error"}`))
		return
	}
	// The bearer is read by the rules every route of this server uses. A
	// header that breaks them counts as signed out.
	session, signedIn := githubaccess.SessionToken(r)
	if !signedIn {
		session = h.SupabaseKey
	}

	// .select(columns).eq("share_token", token).is("deleted_at", null).single()
	query := strings.Join([]string{
		supabaserest.Param("select", columns),
		supabaserest.Param("share_token", "eq."+r.PathValue("token")),
		supabaserest.Param("deleted_at", "is.null"),
	}, "&")
	status, raw, err := db.SelectObject(r.Context(), session, "shared_conversations", query)
	if err != nil {
		h.log("database", status, err)
		write(w, 503, []byte(`{"error":"Share could not be loaded"}`))
		return
	}
	if supabaserest.NoRows(status, raw) {
		write(w, 404, []byte(`{"error":"Not found"}`))
		return
	}
	data, failed := supabaserest.ReadResult(status, raw)
	if status < 200 || status > 299 || failed {
		h.log("database", status, nil)
		write(w, 503, []byte(`{"error":"Share could not be loaded"}`))
		return
	}
	if data == nil {
		write(w, 404, []byte(`{"error":"Not found"}`))
		return
	}
	// A single-row lookup must return an object before applying visibility.
	row, isObject := data.(map[string]any)
	if !isObject {
		write(w, 503, []byte(`{"error":"Share could not be loaded"}`))
		return
	}
	if !supabaserest.Truthy(row["is_public"]) {
		write(w, 403, []byte(`{"error":"Private link"}`))
		return
	}
	// { share: data }: the row as JSON.parse read it, in its own order.
	fields, _ := jscompat.ObjectFields([]byte(jscompat.DecodeUTF8(raw)))
	var body bytes.Buffer
	body.WriteString(`{"share":`)
	jscompat.WriteObject(&body, fields)
	body.WriteByte('}')
	write(w, 200, body.Bytes())
}

// log records the stage and the database's status, never the visitor's
// token, the share's token or the database's own words.
func (h *Handler) log(stage string, upstream int, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "share", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("share request failed", attrs...)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
