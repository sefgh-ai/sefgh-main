// Package onboarding serves the browser's onboarding from Go (DATA-002),
// the second area of the browser's own database calls to move behind the
// backend (docs/plans/browser-data.md). With "onboarding" in
// NEXT_PUBLIC_SEFGH_GO_DATA, src/lib/supabase/onboarding.js asks these
// endpoints for its three database calls:
//
//	GET   /api/onboarding?user=   getOnboardingData's read
//	POST  /api/onboarding         createOnboardingData's insert
//	PATCH /api/onboarding         updateOnboardingData's update, behind every step
//
// The module decides by the error's code (no row, a duplicate, a missing
// table), so each endpoint answers the database call's own result as
// supabase-js gives it, { data, error }, and everything after the call in
// the module stays as it was.
//
// Only a signed-in caller reaches the database, with their own token, so
// row-level security decides as it did for the browser. The user id the
// browser sends is only a filter: when it is not the caller's, the answer is
// the error row-level security gave for another user's id, without asking.
// An update may change only the fields the onboarding writes; anything else,
// user_id included, is refused without asking.
package onboarding

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds one step's answers.
const MaxBodyBytes = 64 << 10

const table = "onboarding_data"

// Writable are the fields the onboarding steps write.
var Writable = map[string]bool{
	"current_step": true, "role": true, "experience_level": true, "tech_stack": true,
	"primary_language": true, "goals": true, "github_connected": true, "github_username": true,
	"notification_preference": true, "preferred_language": true,
	"completed": true, "completed_at": true, "skipped": true, "skipped_at": true,
}

// The errors row-level security gives for another user's id: no row for a
// read or an update, a refused row for an insert. The browser's direct
// calls received these, so the module gives the same answer.
const (
	noRow   = `{"data":null,"error":{"code":"PGRST116","details":"The result contains 0 rows","hint":null,"message":"JSON object requested, multiple (or no) rows returned"}}`
	refused = `{"data":null,"error":{"code":"42501","details":null,"hint":null,"message":"new row violates row-level security policy for table \"onboarding_data\""}}`
)

// Handler serves the onboarding. User, Database and the two settings are
// required; Logger has a default.
type Handler struct {
	// User says who is calling: their id and own access token, with 200, or
	// another status. In the server it is githubaccess.Verifier.User.
	User                     func(*http.Request) (id, session string, status int)
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	Logger                   *slog.Logger
}

// Register adds the three endpoints to mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/onboarding", h.signedIn(h.get))
	mux.HandleFunc("POST /api/onboarding", h.signedIn(h.create))
	mux.HandleFunc("PATCH /api/onboarding", h.signedIn(h.update))
}

type caller struct {
	id, session string
	db          supabaserest.Client
}

func (h *Handler) signedIn(next func(http.ResponseWriter, *http.Request, caller)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
		if !db.Configured() {
			h.log("settings", 0, nil)
			write(w, 500, failure("Onboarding is not configured", "500"))
			return
		}
		id, session, status := h.User(r)
		switch status {
		case 200:
			next(w, r, caller{id: id, session: session, db: db})
		case 503:
			write(w, 503, failure("Sign-in could not be checked", "503"))
		default:
			write(w, 401, failure("Unauthorized", "401"))
		}
	}
}

// get is getOnboardingData's read: the caller's row, as one row.
func (h *Handler) get(w http.ResponseWriter, r *http.Request, c caller) {
	if user, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("user"); user != c.id {
		write(w, 200, noRow)
		return
	}
	query := supabaserest.Param("select", "*") + "&" + supabaserest.Param("user_id", "eq."+c.id)
	status, raw, err := c.db.SelectObject(r.Context(), c.session, table, query)
	h.answer(w, "get", status, raw, err)
}

// create is createOnboardingData's insert: the caller's row at step 1.
func (h *Handler) create(w http.ResponseWriter, r *http.Request, c caller) {
	fields, ok := h.body(w, r)
	if !ok {
		return
	}
	if !own(fields["user"], c.id) {
		write(w, 200, refused)
		return
	}
	rows := `[{"user_id":` + string(text(c.id)) + `,"current_step":1}]`
	status, raw, err := c.db.InsertListReturning(r.Context(), c.session, table, []string{"user_id", "current_step"}, []byte(rows))
	h.answer(w, "create", status, raw, err)
}

// update is updateOnboardingData's update: the given fields of the caller's
// row, which comes back as one row.
func (h *Handler) update(w http.ResponseWriter, r *http.Request, c caller) {
	fields, ok := h.body(w, r)
	if !ok {
		return
	}
	updates := fields["updates"]
	changes, isObject := jscompat.ObjectFields(updates)
	if jscompat.Kind(updates) != '{' || !isObject {
		write(w, 400, failure("updates must be an object", "400"))
		return
	}
	if !own(fields["user"], c.id) {
		write(w, 200, noRow)
		return
	}
	for _, change := range changes {
		if !Writable[change.Name] {
			write(w, 200, failure("onboarding_data."+change.Name+" cannot be changed here", "42501"))
			return
		}
	}
	query := supabaserest.Param("user_id", "eq."+c.id)
	status, raw, err := c.db.Update(r.Context(), c.session, table, query, updates, true)
	h.answer(w, "update", status, raw, err)
}

// body reads a POST or PATCH body as a JSON object.
func (h *Handler) body(w http.ResponseWriter, r *http.Request) (map[string]json.RawMessage, bool) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		write(w, 400, failure("The body could not be read", "400"))
		return nil, false
	}
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		write(w, 400, failure("The body is not a JSON object", "400"))
		return nil, false
	}
	return fields, true
}

// answer writes the database call's result as supabase-js gives it, and
// logs a failure by stage and status only.
func (h *Handler) answer(w http.ResponseWriter, stage string, status int, raw []byte, err error) {
	if _, failed := supabaserest.ReadResult(status, raw); err != nil || (failed && status != 406) {
		h.log(stage, status, err)
	}
	write(w, 200, string(supabaserest.Result(status, raw, err)))
}

// own reports whether the user id the browser sent, as JSON, is the caller's.
func own(sent json.RawMessage, id string) bool {
	if sent == nil {
		return false
	}
	user, _ := jscompat.ParseJSON(string(sent))
	text, isText := user.(string)
	return isText && text == id
}

func text(s string) json.RawMessage {
	out, _ := jscompat.ToUTF16(s).MarshalJSON()
	return out
}

// failure is an answer whose error Go gives by itself.
func failure(message, code string) string {
	var out bytes.Buffer
	out.WriteString(`{"data":null,"error":{"message":`)
	out.Write(text(message))
	out.WriteString(`,"code":`)
	out.Write(text(code))
	out.WriteString(`,"details":null,"hint":null}}`)
	return out.String()
}

func (h *Handler) log(stage string, upstream int, err error) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "onboarding", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("onboarding request failed", attrs...)
}

func write(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(status)
	_, _ = io.WriteString(w, body)
}
