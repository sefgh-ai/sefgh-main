// Package vote ports GET and POST /api/repo/vote at contract version 1:
// upvoting, downvoting or removing a vote on a repository, and reading the
// counts. Every case in contracts/repo-vote is answered as the Next.js
// handlers answer it, defects included.
//
// Every database request goes as the visitor, through internal/supabaserest:
// with the request's bearer when it has one, and with the project's public
// key otherwise, so row-level security decides each read and write as it
// does for the Next.js handlers' cookie client. After a vote the handler
// calls the database function get_repo_vote_stats, which the live database
// does not have (bug register R-076); it then counts the votes itself, as
// the Next.js handler does. The planned difference, as for activity: Go
// reads a bearer, not the session cookie, and the browser sends one.
package vote

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a POST body; a longer one is answered as a body that
// cannot be read. The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// Budget bounds a vote's database calls together: the write, the stats call
// and the count. Each call may take supabaserest.Timeout, and three of them
// after the sign-in check would outlast the server's 30-second write
// timeout. A call cut short reads as a failed one. The Next.js handler has
// no bound. A test in cmd/api keeps sign-in and this budget inside the
// write timeout.
const Budget = 24 * time.Second

// Handler answers GET and POST /api/repo/vote. User, Database and the two
// settings are required; Now and Logger have defaults.
type Handler struct {
	// User says who is calling: their id and their own access token with
	// 200, or another status. In the server it is githubaccess.Verifier.User.
	User func(*http.Request) (id, session string, status int)
	// Database makes the Data API calls; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	// Now is the clock for a vote's updated_at; time.Now when nil.
	Now func() time.Time
	// Budget replaces the package's Budget when it is not zero. Tests
	// shorten it.
	Budget time.Duration
	Logger *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.post(w, r)
		return
	}
	h.get(w, r)
}

func (h *Handler) db() supabaserest.Client {
	return supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
}

// post records, changes or removes the caller's vote: POST in the Next.js
// handler.
func (h *Handler) post(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized. Please login to vote."}`))
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		h.fail(w, "read_body", 0, err, 500, "Internal server error")
		return
	}
	// const { repoFullName, voteType } = await request.json()
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		h.fail(w, "decode_body", 0, nil, 500, "Internal server error")
		return
	}
	repo, voteType := fields["repoFullName"], fields["voteType"]
	if !jscompat.TruthyJSON(repo) {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	// voteType && !['upvote', 'downvote'].includes(voteType)
	voting := jscompat.TruthyJSON(voteType)
	if voting && !isVoteType(voteType) {
		write(w, 400, []byte(`{"error":"Invalid vote type. Must be \"upvote\" or \"downvote\""}`))
		return
	}
	repoText := jscompat.String(parse(repo))
	budget := h.Budget
	if budget == 0 {
		budget = Budget
	}
	ctx, cancel := context.WithTimeout(r.Context(), budget)
	defer cancel()

	if voting {
		row := upsertRow(userID, repo, voteType, h.now())
		upstream, raw, err := db.Upsert(ctx, session, "repo_votes", "user_id,repo_full_name", row)
		if failed(upstream, raw, err) {
			h.fail(w, "upsert", upstream, err, 500, "Failed to save vote")
			return
		}
	} else {
		filters := supabaserest.Param("user_id", "eq."+userID) + "&" + supabaserest.Param("repo_full_name", "eq."+repoText)
		upstream, raw, err := db.Delete(ctx, session, "repo_votes", filters)
		if failed(upstream, raw, err) {
			h.fail(w, "delete", upstream, err, 500, "Failed to remove vote")
			return
		}
	}

	// .rpc('get_repo_vote_stats', { repo_name: repoFullName })
	args := append(append([]byte(`{"repo_name":`), repo...), '}')
	upstream, raw, err := db.RPC(ctx, session, "get_repo_vote_stats", args)
	var votes []byte
	if failed(upstream, raw, err) {
		// "Fallback to manual count if RPC fails": the count's own error is
		// ignored, so a failed read counts nothing.
		h.log("stats", upstream, err)
		data := h.read(ctx, session, supabaserest.Param("select", "vote_type")+"&"+supabaserest.Param("repo_full_name", "eq."+repoText))
		up, down, ok := count(data)
		if !ok {
			h.fail(w, "rows", 0, nil, 500, "Internal server error")
			return
		}
		votes = counts(up, down)
	} else {
		// voteStats || { upvotes: 0, downvotes: 0, net_votes: 0 }
		data, _ := supabaserest.ReadResult(upstream, raw)
		votes = counts(0, 0)
		if jscompat.Truthy(data) {
			votes = replyJSON(upstream, raw)
		}
	}

	var reply bytes.Buffer
	reply.WriteString(`{"success":true,"votes":`)
	reply.Write(votes)
	// userVote: voteType. JSON.stringify leaves out a value that is undefined.
	if voteType != nil {
		reply.WriteString(`,"userVote":`)
		reply.Write(voteType)
	}
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// get answers the counts and, for a signed-in caller, their own vote: GET in
// the Next.js handler.
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
	query := supabaserest.Param("select", "vote_type") + "&" + supabaserest.Param("repo_full_name", "eq."+repo)
	upstream, raw, err := db.Select(r.Context(), session, "repo_votes", query)
	if failed(upstream, raw, err) {
		h.fail(w, "select", upstream, err, 500, "Failed to fetch votes")
		return
	}
	data, _ := supabaserest.ReadResult(upstream, raw)
	up, down, ok := count(data)
	if !ok {
		h.fail(w, "rows", upstream, nil, 500, "Internal server error")
		return
	}
	// userVoteData?.vote_type || null, read as one row; its error is ignored.
	userVote := []byte("null")
	if status == 200 {
		own := strings.Join([]string{
			supabaserest.Param("select", "vote_type"),
			supabaserest.Param("user_id", "eq."+userID),
			supabaserest.Param("repo_full_name", "eq."+repo),
		}, "&")
		upstream, raw, err := db.SelectObject(r.Context(), session, "repo_votes", own)
		if !failed(upstream, raw, err) {
			userVote = field(raw, "vote_type", userVote)
		}
	}
	var reply bytes.Buffer
	reply.WriteString(`{"votes":`)
	reply.Write(counts(up, down))
	reply.WriteString(`,"userVote":`)
	reply.Write(userVote)
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// read is a select whose error the handler ignores: `const { data } = ...`.
// A failed read gives no data.
func (h *Handler) read(ctx context.Context, session, query string) any {
	upstream, raw, err := h.db().Select(ctx, session, "repo_votes", query)
	if failed(upstream, raw, err) {
		h.log("count", upstream, err)
		return nil
	}
	data, _ := supabaserest.ReadResult(upstream, raw)
	return data
}

// isVoteType is ['upvote', 'downvote'].includes(voteType): only the exact
// text.
func isVoteType(raw json.RawMessage) bool {
	text, isText := parse(raw).(string)
	return isText && (text == "upvote" || text == "downvote")
}

// upsertRow is the vote the Next.js handler upserts. Values the visitor sent
// pass through as written; updated_at is new Date().toISOString().
func upsertRow(userID string, repo, voteType json.RawMessage, now time.Time) []byte {
	id, _ := json.Marshal(userID)
	updated, _ := json.Marshal(jscompat.ISOString(now))
	var row bytes.Buffer
	row.WriteString(`{"user_id":`)
	row.Write(id)
	row.WriteString(`,"repo_full_name":`)
	row.Write(repo)
	row.WriteString(`,"vote_type":`)
	row.Write(voteType)
	row.WriteString(`,"updated_at":`)
	row.Write(updated)
	row.WriteByte('}')
	return row.Bytes()
}

// count is the two allVotes?.filter(v => v.vote_type === ...).length || 0.
// No data counts nothing. ok is false where JavaScript throws: a null row,
// or data that is not a list and so has no filter().
func count(data any) (up, down int, ok bool) {
	switch rows := data.(type) {
	case nil:
		return 0, 0, true
	case []any:
		for _, row := range rows {
			if row == nil {
				return 0, 0, false
			}
			object, _ := row.(map[string]any)
			switch kind, _ := object["vote_type"].(string); kind {
			case "upvote":
				up++
			case "downvote":
				down++
			}
		}
		return up, down, true
	}
	return 0, 0, false
}

// counts writes { upvotes, downvotes, net_votes: upvotes - downvotes }.
func counts(up, down int) []byte {
	return []byte(`{"upvotes":` + strconv.Itoa(up) + `,"downvotes":` + strconv.Itoa(down) + `,"net_votes":` + strconv.Itoa(up-down) + `}`)
}

// replyJSON is a successful reply's data, as JSON.stringify writes it back.
// supabase-js reads a 404 whose body is a list as data [], whatever the list
// held.
func replyJSON(status int, raw []byte) []byte {
	if status < 200 || status > 299 {
		return []byte("[]")
	}
	return []byte(jscompat.DecodeUTF8(raw))
}

// field is data?.name || fallback for a reply that holds one object: the
// field as written when it is truthy. Anything but an object has no field.
func field(raw []byte, name string, fallback []byte) []byte {
	fields, ok := jscompat.ObjectFields([]byte(jscompat.DecodeUTF8(raw)))
	if !ok {
		return fallback
	}
	var value json.RawMessage
	for _, f := range fields {
		if f.Name == name {
			value = f.Value
		}
	}
	if jscompat.TruthyJSON(value) {
		return value
	}
	return fallback
}

// failed is supabase-js's error: no reply, or a reply it reads as one.
func failed(status int, raw []byte, err error) bool {
	if err != nil {
		return true
	}
	_, bad := supabaserest.ReadResult(status, raw)
	return bad
}

// parse reads one raw JSON value the body already proved valid.
func parse(raw json.RawMessage) any {
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
	attrs := []any{"route", "vote", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("vote request failed", attrs...)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
