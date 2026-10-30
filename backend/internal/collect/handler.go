// Package collect ports GET, POST and DELETE /api/repo/collect at contract
// version 1: saving a repository to one of the signed-in user's
// collections, removing it, and asking whether it is saved and how often.
// Every case in contracts/repo-collect is answered as the Next.js handlers
// answer it, defects included. It is the first Go route that writes to the
// database.
//
// Every database request goes as the visitor, through internal/supabaserest:
// with the request's bearer when it has one, and with the project's public
// key otherwise, so row-level security decides each read and each write as
// it does for the Next.js handlers' cookie client. Supabase Auth is asked
// for the user id that POST and DELETE write with and that GET compares.
// The planned difference, as for activity: Go reads a bearer, not the
// session cookie, and the browser sends one.
package collect

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a POST body; a longer one is answered as a body that
// cannot be read. The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// Handler answers the three methods of /api/repo/collect. User, Database
// and the two settings are required; Logger has a default.
type Handler struct {
	// User says who is calling: their id and their own access token with
	// 200, or another status. In the server it is githubaccess.Verifier.User.
	User func(*http.Request) (id, session string, status int)
	// Database makes the Data API calls; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	Logger                   *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.post(w, r)
	case http.MethodDelete:
		h.delete(w, r)
	default:
		h.get(w, r)
	}
}

func (h *Handler) db() supabaserest.Client {
	return supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
}

// post saves a repository: POST in the Next.js handler.
func (h *Handler) post(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, status := h.User(r)
	if status >= 500 {
		write(w, 503, []byte(`{"error":"Sign-in could not be verified"}`))
		return
	}
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized. Please login to save repositories."}`))
		return
	}
	// const { repoFullName, collectionName, notes } = await request.json()
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		h.fail(w, "read_body", 0, err, 500, "Internal server error")
		return
	}
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		h.fail(w, "decode_body", 0, nil, 500, "Internal server error")
		return
	}
	repo := fields["repoFullName"]
	if !truthy(repo) {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	row := insertRow(userID, repo, fields["collectionName"], fields["notes"])
	upstream, raw, err := db.Insert(r.Context(), session, "repo_collections", row)
	if err != nil {
		h.fail(w, "insert", upstream, err, 500, "Failed to save repository")
		return
	}
	if _, failed := supabaserest.ReadResult(upstream, raw); failed {
		if uniqueViolation(upstream, raw) {
			write(w, 409, []byte(`{"error":"Repository already in this collection"}`))
			return
		}
		h.fail(w, "insert", upstream, nil, 500, "Failed to save repository")
		return
	}
	total := h.count(r, session, jscompat.String(parse(repo)))
	write(w, 200, []byte(`{"success":true,"saved":true,"totalSaves":`+string(total)+`}`))
}

// get says whether the visitor saved a repository, and how many saves it
// has: GET in the Next.js handler.
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	repo, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("repo")
	if repo == "" {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	// Refused sessions follow the existing signed-out policy. Auth outages
	// return503 before any database read. Otherwise keep the visitor bearer.
	userID, _, status := h.User(r)
	if status >= 500 {
		write(w, 503, []byte(`{"error":"Sign-in could not be verified"}`))
		return
	}
	signedIn := status == 200
	session := h.SupabaseKey
	if token, ok := githubaccess.SessionToken(r); ok {
		session = token
	}
	upstream, raw, err := db.Select(r.Context(), session, "repo_collections", savesQuery(repo))
	if err != nil {
		h.fail(w, "select", upstream, err, 500, "Failed to fetch save status")
		return
	}
	data, failed := supabaserest.ReadResult(upstream, raw)
	if failed {
		h.fail(w, "select", upstream, nil, 500, "Failed to fetch save status")
		return
	}
	saved := false
	if signedIn {
		var ok bool
		if saved, ok = savedBy(data, userID); !ok {
			h.fail(w, "rows", upstream, nil, 500, "Internal server error")
			return
		}
	}
	// R-083: the visitor's own rows say whether they saved it; the total
	// comes from everyone's saves.
	total := h.count(r, session, repo)
	write(w, 200, []byte(`{"saved":`+strconv.FormatBool(saved)+`,"totalSaves":`+string(total)+`}`))
}

// delete removes a repository from one collection: DELETE in the Next.js
// handler.
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, status := h.User(r)
	if status >= 500 {
		write(w, 503, []byte(`{"error":"Sign-in could not be verified"}`))
		return
	}
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	query := jscompat.ParseQuery(r.URL.RawQuery)
	repo, _ := query.Get("repo")
	collection, _ := query.Get("collection")
	if collection == "" {
		collection = "default"
	}
	if repo == "" {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	filters := strings.Join([]string{
		supabaserest.Param("user_id", "eq."+userID),
		supabaserest.Param("repo_full_name", "eq."+repo),
		supabaserest.Param("collection_name", "eq."+collection),
	}, "&")
	upstream, raw, err := db.Delete(r.Context(), session, "repo_collections", filters)
	if err != nil {
		h.fail(w, "delete", upstream, err, 500, "Failed to remove from collection")
		return
	}
	if _, failed := supabaserest.ReadResult(upstream, raw); failed {
		h.fail(w, "delete", upstream, nil, 500, "Failed to remove from collection")
		return
	}
	total := h.count(r, session, repo)
	write(w, 200, []byte(`{"success":true,"saved":false,"totalSaves":`+string(total)+`}`))
}

// savesQuery is .select('user_id').eq('repo_full_name', repo).
func savesQuery(repo string) string {
	return supabaserest.Param("select", "user_id") + "&" + supabaserest.Param("repo_full_name", "eq."+repo)
}

// statsQuery is a repository's row in the view repo_collection_stats.
func statsQuery(repo string) string {
	return supabaserest.Param("select", "total_saves") + "&" + supabaserest.Param("repo_full_name", "eq."+repo)
}

// count is everyone's save count for a repository (R-083, contract version
// 2). Row-level security shows a visitor only their own rows of
// repo_collections, so counting those gave 0 or 1; the view
// repo_collection_stats runs with its owner's rights and counts every user's
// saves. A failed read, or no row, counts 0, as a failed count did before.
func (h *Handler) count(r *http.Request, session, repo string) json.RawMessage {
	upstream, raw, err := h.db().Select(r.Context(), session, "repo_collection_stats", statsQuery(repo))
	if err != nil {
		h.log("count", upstream, err)
		return json.RawMessage("0")
	}
	data, failed := supabaserest.ReadResult(upstream, raw)
	if failed {
		h.log("count", upstream, nil)
		return json.RawMessage("0")
	}
	rows, _ := data.([]any)
	if len(rows) == 0 {
		return json.RawMessage("0")
	}
	row, _ := rows[0].(map[string]any)
	switch total := row["total_saves"].(type) {
	case json.Number:
		return json.RawMessage(total.String())
	case float64:
		return json.RawMessage(jscompat.NumberJSON(total))
	}
	return json.RawMessage("0")
}

// insertRow is the object the Next.js handler inserts:
// { user_id, repo_full_name, collection_name: collectionName || 'default',
// notes: notes || null }. Values the visitor sent pass through as written.
func insertRow(userID string, repo, collection, notes json.RawMessage) []byte {
	id, _ := json.Marshal(userID)
	if !truthy(collection) {
		collection = json.RawMessage(`"default"`)
	}
	if !truthy(notes) {
		notes = json.RawMessage(`null`)
	}
	var row bytes.Buffer
	row.WriteString(`{"user_id":`)
	row.Write(id)
	row.WriteString(`,"repo_full_name":`)
	row.Write(repo)
	row.WriteString(`,"collection_name":`)
	row.Write(collection)
	row.WriteString(`,"notes":`)
	row.Write(notes)
	row.WriteByte('}')
	return row.Bytes()
}

// uniqueViolation is insertError.code === '23505'. supabase-js's error is
// the reply's JSON; a success reply it cannot read becomes an error without
// that code.
func uniqueViolation(status int, raw []byte) bool {
	if status >= 200 && status <= 299 {
		return false
	}
	value, err := jscompat.DecodeJSON(raw)
	if err != nil {
		return false
	}
	object, _ := value.(map[string]any)
	code, _ := object["code"].(string)
	return code == "23505"
}

// savedBy is saves?.some(s => s.user_id === user.id) || false. ok is false
// where JavaScript throws: a row that is null, or saves that are not a list
// (and not null), which have no some().
func savedBy(data any, userID string) (saved, ok bool) {
	switch rows := data.(type) {
	case nil:
		return false, true
	case []any:
		for _, row := range rows {
			if row == nil {
				return false, false
			}
			object, _ := row.(map[string]any)
			if id, isText := object["user_id"].(string); isText && id == userID {
				return true, true
			}
		}
		return false, true
	}
	return false, false
}

// parse reads one raw JSON value the body already proved valid.
func parse(raw json.RawMessage) any {
	value, _ := jscompat.ParseJSON(string(raw))
	return value
}

// truthy is JavaScript's truthiness of a raw JSON value; a missing one is
// undefined, which is false.
func truthy(raw json.RawMessage) bool { return jscompat.TruthyJSON(raw) }

// fail logs the stage and the database's status, never the user, the
// repository or the database's own words, and answers with a fixed
// sentence.
func (h *Handler) fail(w http.ResponseWriter, stage string, upstream int, err error, status int, message string) {
	h.log(stage, upstream, err)
	body, _ := json.Marshal(map[string]string{"error": message})
	write(w, status, body)
}

func (h *Handler) log(stage string, upstream int, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "collect", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("collect request failed", attrs...)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
