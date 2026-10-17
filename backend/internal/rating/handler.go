// Package rating ports GET, POST and DELETE /api/repo/rating at contract
// version 1: rating a repository from 1 to 5, removing the rating, and
// reading every rating with the average. Every case in contracts/repo-rating
// is answered as the Next.js handlers answer it, defects included.
//
// The Next.js handler checks and averages with JavaScript's loose rules: a
// rating is compared with 1 and 5 after being turned into a number, so the
// text "5", " 5 " or "0x5" passes, and "great" (NaN) passes every
// comparison. The average adds with +, so a rating stored as text joins the
// sum as text. The port follows the same rules through jscompat (Number,
// Add, MathRound) so the two can be compared (bug register R-085).
//
// Every database request goes as the visitor, through internal/supabaserest:
// with the request's bearer when it has one, and with the project's public
// key otherwise, so row-level security decides each read and write as it
// does for the Next.js handlers' cookie client. The planned difference, as
// for activity: Go reads a bearer, not the session cookie, and the browser
// sends one.
package rating

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a POST body; a longer one is answered as a body that
// cannot be read. The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// Handler answers the three methods of /api/repo/rating. User, Database and
// the two settings are required; Now and Logger have defaults.
type Handler struct {
	// User says who is calling: their id and their own access token with
	// 200, or another status. In the server it is githubaccess.Verifier.User.
	User func(*http.Request) (id, session string, status int)
	// Database makes the Data API calls; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	// Now is the clock for a rating's updated_at; time.Now when nil.
	Now    func() time.Time
	Logger *slog.Logger
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

// post records or changes the caller's rating: POST in the Next.js handler.
func (h *Handler) post(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized. Please login to rate."}`))
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		h.fail(w, "read_body", 0, err, 500, "Internal server error")
		return
	}
	// const { repoFullName, rating, reviewText } = await request.json()
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		h.fail(w, "decode_body", 0, nil, 500, "Internal server error")
		return
	}
	repo, rating, review := fields["repoFullName"], fields["rating"], fields["reviewText"]
	if !jscompat.TruthyJSON(repo) {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	// if (!rating || rating < 1 || rating > 5): each comparison turns the
	// rating into a number first, and any comparison with NaN is false.
	if n := jscompat.Number(parse(rating)); !jscompat.TruthyJSON(rating) || n < 1 || n > 5 {
		write(w, 400, []byte(`{"error":"Rating must be between 1 and 5"}`))
		return
	}

	row := upsertRow(userID, repo, rating, review, h.now())
	upstream, raw, err := db.Upsert(r.Context(), session, "repo_ratings", "user_id,repo_full_name", row)
	if failed(upstream, raw, err) {
		h.fail(w, "upsert", upstream, err, 500, "Failed to save rating")
		return
	}
	query := supabaserest.Param("select", "rating") + "&" + supabaserest.Param("repo_full_name", "eq."+jscompat.String(parse(repo)))
	upstream, raw, err = db.Select(r.Context(), session, "repo_ratings", query)
	if failed(upstream, raw, err) {
		h.fail(w, "select", upstream, err, 500, "Failed to fetch updated ratings")
		return
	}
	data, _ := supabaserest.ReadResult(upstream, raw)
	ratings, ok := summary(data, raw)
	if !ok {
		h.fail(w, "rows", upstream, nil, 500, "Internal server error")
		return
	}
	write(w, 200, []byte(`{"success":true,"ratings":`+ratings+`}`))
}

// get answers every rating of a repository, the total and average, and the
// signed-in caller's own: GET in the Next.js handler.
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
	// getUser() reports a refused session and an unreachable Supabase alike,
	// and GET reads either as signed out. The database is still asked with
	// the visitor's bearer, as the cookie client sends the session it has.
	userID, _, status := h.User(r)
	session := h.SupabaseKey
	if token, ok := githubaccess.SessionToken(r); ok {
		session = token
	}
	query := supabaserest.Param("select", "*") + "&" + supabaserest.Param("repo_full_name", "eq."+repo)
	upstream, raw, err := db.Select(r.Context(), session, "repo_ratings", query)
	if failed(upstream, raw, err) {
		h.fail(w, "select", upstream, err, 500, "Failed to fetch ratings")
		return
	}
	data, _ := supabaserest.ReadResult(upstream, raw)
	ratings, ok := summary(data, raw)
	if !ok {
		h.fail(w, "rows", upstream, nil, 500, "Internal server error")
		return
	}
	// userRating = userRatingData || null, read as one row; its error is
	// ignored.
	userRating := []byte("null")
	if status == 200 {
		own := strings.Join([]string{
			supabaserest.Param("select", "*"),
			supabaserest.Param("user_id", "eq."+userID),
			supabaserest.Param("repo_full_name", "eq."+repo),
		}, "&")
		upstream, raw, err := db.SelectObject(r.Context(), session, "repo_ratings", own)
		if !failed(upstream, raw, err) {
			if mine, _ := supabaserest.ReadResult(upstream, raw); jscompat.Truthy(mine) {
				userRating = supabaserest.DataJSON(upstream, raw)
			}
		}
	}
	// allRatings: allRatings || []
	all := []byte("[]")
	if jscompat.Truthy(data) {
		all = supabaserest.DataJSON(upstream, raw)
	}
	var reply bytes.Buffer
	reply.WriteString(`{"ratings":` + ratings + `,"userRating":`)
	reply.Write(userRating)
	reply.WriteString(`,"allRatings":`)
	reply.Write(all)
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// delete removes the caller's rating: DELETE in the Next.js handler.
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	repo, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("repo")
	if repo == "" {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	filters := supabaserest.Param("user_id", "eq."+userID) + "&" + supabaserest.Param("repo_full_name", "eq."+repo)
	upstream, raw, err := db.Delete(r.Context(), session, "repo_ratings", filters)
	if failed(upstream, raw, err) {
		h.fail(w, "delete", upstream, err, 500, "Failed to delete rating")
		return
	}
	write(w, 200, []byte(`{"success":true}`))
}

// summary is the handler's total and average, written as
// {"total":...,"average":...}:
//
//	const total = allRatings?.length || 0
//	const average = total > 0
//	  ? allRatings.reduce((sum, r) => sum + r.rating, 0) / total
//	  : 0
//	... average: Math.round(average * 10) / 10
//
// ok is false where JavaScript throws: a null row, or a total above 0 for
// data that is not a list and so has no reduce().
func summary(data any, raw []byte) (string, bool) {
	total := jscompat.LengthOrZero(data, raw)
	average := 0.0
	if jscompat.Number(parse(total)) > 0 {
		rows, isList := data.([]any)
		if !isList {
			return "", false
		}
		var sum any = 0.0
		for _, row := range rows {
			if row == nil {
				return "", false
			}
			// r.rating: a field of an object; anything else has none.
			var value any = jscompat.Undefined
			if object, ok := row.(map[string]any); ok {
				if v, present := object["rating"]; present {
					value = v
				}
			}
			sum = jscompat.Add(sum, value)
		}
		average = jscompat.Number(sum) / float64(len(rows))
	}
	rounded := jscompat.MathRound(average*10) / 10
	return `{"total":` + string(total) + `,"average":` + jscompat.NumberJSON(rounded) + `}`, true
}

// upsertRow is the rating the Next.js handler upserts. Values the visitor
// sent pass through as written; review_text is reviewText || null and
// updated_at is new Date().toISOString().
func upsertRow(userID string, repo, rating, review json.RawMessage, now time.Time) []byte {
	id, _ := json.Marshal(userID)
	updated, _ := json.Marshal(jscompat.ISOString(now))
	if !jscompat.TruthyJSON(review) {
		review = json.RawMessage("null")
	}
	var row bytes.Buffer
	row.WriteString(`{"user_id":`)
	row.Write(id)
	row.WriteString(`,"repo_full_name":`)
	row.Write(repo)
	row.WriteString(`,"rating":`)
	row.Write(rating)
	row.WriteString(`,"review_text":`)
	row.Write(review)
	row.WriteString(`,"updated_at":`)
	row.Write(updated)
	row.WriteByte('}')
	return row.Bytes()
}

// failed is supabase-js's error: no reply, or a reply it reads as one.
func failed(status int, raw []byte, err error) bool {
	if err != nil {
		return true
	}
	_, bad := supabaserest.ReadResult(status, raw)
	return bad
}

// parse reads one raw JSON value; a missing one (nil) is undefined.
func parse(raw json.RawMessage) any {
	if raw == nil {
		return jscompat.Undefined
	}
	value, _ := jscompat.ParseJSON(string(raw))
	return value
}

func (h *Handler) now() time.Time {
	if h.Now != nil {
		return h.Now()
	}
	return time.Now()
}

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
	attrs := []any{"route", "rating", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("rating request failed", attrs...)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
