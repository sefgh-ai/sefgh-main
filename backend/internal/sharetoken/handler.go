// Package sharetoken ports GET /api/share/[token] at contract version 1:
// one shared conversation, by the token in its link, for anyone who has the
// link. Every case in contracts/share-token is answered as the Next.js
// handler answers it, defects included.
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
	"encoding/json"
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

// missingSettings is the message createServerClient of @supabase/ssr 0.7
// throws without the project's address and key. The Next.js handler sends
// it to the browser as it is (bug register R-081), and so does this port
// until that bug is fixed here.
const missingSettings = "Your project's URL and Key are required to create a Supabase client!\n\n" +
	"Check your Supabase project's API settings to find these values\n\n" +
	"https://supabase.com/dashboard/project/_/settings/api"

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
	// Without the project's settings createServerClient throws, and the
	// handler's catch answers the error's own message.
	if !db.Configured() {
		h.log("settings", 0, nil)
		body, _ := json.Marshal(map[string]string{"error": missingSettings})
		write(w, 500, body)
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
		write(w, 404, []byte(`{"error":"Not found"}`))
		return
	}
	// if (error || !data): every failure, and no row, read as "Not found"
	// (R-082).
	data, failed := supabaserest.ReadResult(status, raw)
	if failed || !supabaserest.Truthy(data) {
		if status >= 500 {
			h.log("database", status, nil)
		}
		write(w, 404, []byte(`{"error":"Not found"}`))
		return
	}
	// if (!data.is_public): anything but an object has no is_public.
	row, isObject := data.(map[string]any)
	if !isObject || !supabaserest.Truthy(row["is_public"]) {
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
