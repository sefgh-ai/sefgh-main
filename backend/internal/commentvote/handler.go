// Package commentvote ports GET and POST /api/repo/comments/vote at
// contract version 1: upvoting, downvoting or removing a vote on a comment,
// and reading the caller's own vote. Every case in contracts/comment-vote is
// answered as the Next.js handlers answer it.
//
// Only a signed-in caller reaches the database, with their own token,
// through internal/supabaserest, so row-level security decides each read and
// write as it does for the Next.js handlers' cookie client. The planned
// difference, as for activity: Go reads a bearer, not the session cookie,
// and the browser sends one.
package commentvote

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

// MaxBodyBytes bounds a POST body; a longer one is answered as a body that
// cannot be read. The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// Handler answers GET and POST /api/repo/comments/vote. User, Database and
// the two settings are required; Logger has a default.
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
	if r.Method == http.MethodPost {
		h.post(w, r)
		return
	}
	h.get(w, r)
}

func (h *Handler) db() supabaserest.Client {
	return supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
}

// post records, changes or removes the caller's vote on a comment: POST in
// the Next.js handler.
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
	// const { commentId, voteType } = await request.json()
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		h.fail(w, "decode_body", 0, nil, 500, "Internal server error")
		return
	}
	commentID, voteType := fields["commentId"], fields["voteType"]
	if !jscompat.TruthyJSON(commentID) {
		write(w, 400, []byte(`{"error":"Comment ID is required"}`))
		return
	}
	// voteType && !['upvote', 'downvote'].includes(voteType)
	voting := jscompat.TruthyJSON(voteType)
	if voting && !isVoteType(voteType) {
		write(w, 400, []byte(`{"error":"Invalid vote type"}`))
		return
	}
	idText := jscompat.String(parse(commentID))

	if voting {
		row := upsertRow(userID, commentID, voteType)
		upstream, raw, err := db.Upsert(r.Context(), session, "comment_votes", "user_id,comment_id", row)
		if failed(upstream, raw, err) {
			h.fail(w, "upsert", upstream, err, 500, "Failed to save vote")
			return
		}
	} else {
		filters := supabaserest.Param("user_id", "eq."+userID) + "&" + supabaserest.Param("comment_id", "eq."+idText)
		upstream, raw, err := db.Delete(r.Context(), session, "comment_votes", filters)
		if failed(upstream, raw, err) {
			h.fail(w, "delete", upstream, err, 500, "Failed to remove vote")
			return
		}
	}

	// The comment's counts, read as one row; the error is ignored, and
	// comment?.upvotes || 0 counts a failed read as 0.
	upvotes, downvotes := []byte("0"), []byte("0")
	// .select('upvotes, downvotes'): postgrest-js drops the space.
	query := supabaserest.Param("select", "upvotes,downvotes") + "&" + supabaserest.Param("id", "eq."+idText)
	upstream, raw, err := db.SelectObject(r.Context(), session, "repo_comments", query)
	if !failed(upstream, raw, err) {
		upvotes = jscompat.FieldOr(raw, "upvotes", upvotes)
		downvotes = jscompat.FieldOr(raw, "downvotes", downvotes)
	}

	var reply bytes.Buffer
	reply.WriteString(`{"success":true,"upvotes":`)
	reply.Write(upvotes)
	reply.WriteString(`,"downvotes":`)
	reply.Write(downvotes)
	// userVote: voteType. JSON.stringify leaves out a value that is undefined.
	if voteType != nil {
		reply.WriteString(`,"userVote":`)
		reply.Write(voteType)
	}
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// get answers the caller's own vote on a comment: GET in the Next.js
// handler. A visitor who is not signed in gets null without a database
// request.
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	commentID, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("commentId")
	if commentID == "" {
		write(w, 400, []byte(`{"error":"Comment ID is required"}`))
		return
	}
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 200, []byte(`{"userVote":null}`))
		return
	}
	// vote?.vote_type || null, read as one row; its error is ignored.
	userVote := []byte("null")
	query := strings.Join([]string{
		supabaserest.Param("select", "vote_type"),
		supabaserest.Param("user_id", "eq."+userID),
		supabaserest.Param("comment_id", "eq."+commentID),
	}, "&")
	upstream, raw, err := db.SelectObject(r.Context(), session, "comment_votes", query)
	if !failed(upstream, raw, err) {
		userVote = jscompat.FieldOr(raw, "vote_type", userVote)
	}
	write(w, 200, []byte(`{"userVote":`+string(userVote)+`}`))
}

// isVoteType is ['upvote', 'downvote'].includes(voteType): only the exact
// text.
func isVoteType(raw json.RawMessage) bool {
	text, isText := parse(raw).(string)
	return isText && (text == "upvote" || text == "downvote")
}

// upsertRow is the vote the Next.js handler upserts; values the visitor sent
// pass through as written.
func upsertRow(userID string, commentID, voteType json.RawMessage) []byte {
	id, _ := json.Marshal(userID)
	var row bytes.Buffer
	row.WriteString(`{"user_id":`)
	row.Write(id)
	row.WriteString(`,"comment_id":`)
	row.Write(commentID)
	row.WriteString(`,"vote_type":`)
	row.Write(voteType)
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

// parse reads one raw JSON value the body already proved valid.
func parse(raw json.RawMessage) any {
	value, _ := jscompat.ParseJSON(string(raw))
	return value
}

// fail logs the stage and the database's status, never the user, the
// comment or the database's own words, and answers with a fixed sentence.
func (h *Handler) fail(w http.ResponseWriter, stage string, upstream int, err error, status int, message string) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "comment-vote", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("comment vote request failed", attrs...)
	body, _ := json.Marshal(map[string]string{"error": message})
	write(w, status, body)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
