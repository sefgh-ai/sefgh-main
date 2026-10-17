// Package comments ports GET, POST, PATCH and DELETE /api/repo/comments at
// contract version 1: reading a repository's comments and replies with
// their authors and reply counts, posting a comment or reply, and editing
// or deleting one's own. Every case in contracts/repo-comments is answered
// as the Next.js handlers answer it, defects included.
//
// The author details are copied as they fail today: the profile read asks
// for a username column that does not exist (bug register R-075), and the
// admin lookup that follows goes with the public key and is refused
// (R-040). So names never show. The fix lands here after cutover.
//
// Every database request goes as the visitor, through internal/supabaserest:
// with the request's bearer when it has one, and with the project's public
// key otherwise, so row-level security decides as it does for the Next.js
// handlers' cookie client. The planned difference, as for activity: Go
// reads a bearer, not the session cookie, and the browser sends one.
package comments

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"math"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a POST or PATCH body; a longer one is answered as a
// body that cannot be read. The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// concurrency is how many comments have their details read at once. The
// Next.js handler starts them all together, however many there are.
const concurrency = 4

// DetailsBudget bounds the details of all a GET's comments together: each
// comment's profile read, admin lookup and reply count. A read cut short
// counts as failed: no name, no email, no replies. The comment list itself
// may take supabaserest.Timeout before it. The Next.js handler has no bound.
const DetailsBudget = 16 * time.Second

// WriteBudget bounds a POST's database calls together: the parent check,
// the insert and the profile read, three calls after the sign-in check.
const WriteBudget = 20 * time.Second

// uuidPattern is the check auth-js 2.78 makes before an admin lookup
// (validateUUID): lower case only. An id that fails it throws.
var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// Handler answers the four methods of /api/repo/comments. User, Database and
// the two settings are required; the rest have defaults.
type Handler struct {
	// User says who is calling: their id, their own access token and the
	// email Supabase Auth gave (nil when it gave none), with 200, or
	// another status. In the server it is githubaccess.Verifier.UserEmail.
	User func(*http.Request) (id, session string, email json.RawMessage, status int)
	// Database makes the Data API and admin calls; SupabaseURL and
	// SupabaseKey are the project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	// Now is the clock for updated_at; time.Now when nil.
	Now func() time.Time
	// DetailsBudget and WriteBudget replace the package's when not zero.
	// Tests shorten them.
	DetailsBudget, WriteBudget time.Duration
	Logger                     *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		h.post(w, r)
	case http.MethodPatch:
		h.patch(w, r)
	case http.MethodDelete:
		h.delete(w, r)
	default:
		h.get(w, r)
	}
}

func (h *Handler) db() supabaserest.Client {
	return supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
}

// get answers a page of comments, or of one comment's replies, each with
// its author and reply count: GET in the Next.js handler.
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	query := jscompat.ParseQuery(r.URL.RawQuery)
	repo, _ := query.Get("repo")
	parentID, _ := query.Get("parentId")
	// parseInt(searchParams.get('limit') || '50'), and the same for offset.
	limit := jscompat.ParseInt(orDefault(query, "limit", "50"))
	offset := jscompat.ParseInt(orDefault(query, "offset", "0"))
	if repo == "" {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	session := h.SupabaseKey
	if token, ok := githubaccess.SessionToken(r); ok {
		session = token
	}

	// .select('*').eq('repo_full_name', repo).eq('is_deleted', false)
	// .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
	// and then .is('parent_id', null) or .eq('parent_id', parentId).
	to := offset + limit - 1
	parts := []string{
		supabaserest.Param("select", "*"),
		supabaserest.Param("repo_full_name", "eq."+repo),
		supabaserest.Param("is_deleted", "eq.false"),
		supabaserest.Param("order", "created_at.desc"),
		supabaserest.Param("offset", jscompat.String(offset)),
		supabaserest.Param("limit", jscompat.String(to-offset+1)),
	}
	if parentID == "null" || parentID == "" {
		parts = append(parts, supabaserest.Param("parent_id", "is.null"))
	} else {
		parts = append(parts, supabaserest.Param("parent_id", "eq."+parentID))
	}
	upstream, raw, err := db.Select(r.Context(), session, "repo_comments", strings.Join(parts, "&"))
	if failed(upstream, raw, err) {
		h.fail(w, "select", upstream, err, 500, "Failed to fetch comments")
		return
	}
	data, _ := supabaserest.ReadResult(upstream, raw)
	// comments.map: anything but a list has no map().
	list, isList := data.([]any)
	if !isList {
		h.fail(w, "rows", upstream, nil, 500, "Internal server error")
		return
	}
	var rows []json.RawMessage
	if len(list) > 0 {
		rows, _ = jscompat.Elements([]byte(jscompat.DecodeUTF8(raw)))
	}

	details, ok := h.details(r.Context(), session, rows)
	if !ok {
		h.fail(w, "details", 0, nil, 500, "Internal server error")
		return
	}
	var reply bytes.Buffer
	reply.WriteString(`{"comments":[`)
	for i, fields := range details {
		if i > 0 {
			reply.WriteByte(',')
		}
		jscompat.WriteObject(&reply, fields)
	}
	reply.WriteString(`]}`)
	write(w, 200, reply.Bytes())
}

// details reads every comment's author and reply count, at most
// concurrency comments at once and all within one budget, and returns
// each comment as {...comment, user_name, user_email, user_avatar,
// reply_count}. ok is false where the Next.js handler's Promise.all
// rejects: a null comment, or an author id auth-js refuses to look up.
func (h *Handler) details(parent context.Context, session string, rows []json.RawMessage) ([][]jscompat.Field, bool) {
	budget := h.DetailsBudget
	if budget == 0 {
		budget = DetailsBudget
	}
	ctx, cancel := context.WithTimeout(parent, budget)
	defer cancel()
	out := make([][]jscompat.Field, len(rows))
	slots := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex
	failed := false
	for i := range rows {
		wg.Add(1)
		slots <- struct{}{}
		go func(i int) {
			defer wg.Done()
			defer func() { <-slots }()
			fields, ok := h.detail(ctx, session, rows[i])
			if !ok {
				mu.Lock()
				failed = true
				mu.Unlock()
				cancel() // one rejection decides the answer; stop the rest
				return
			}
			out[i] = fields
		}(i)
	}
	wg.Wait()
	return out, !failed
}

// detail is the map callback for one comment.
func (h *Handler) detail(ctx context.Context, session string, row json.RawMessage) ([]jscompat.Field, bool) {
	if jscompat.Kind(row) == 'n' {
		return nil, false // comment.user_id throws on null
	}
	userID, commentID := property(row, "user_id"), property(row, "id")
	db := h.db()

	// The profile, read as one row; its error is ignored (R-075).
	userData := h.profile(ctx, session, jscompat.String(userID))
	// let userEmail = null, then, with no profile, the admin lookup (R-040).
	userEmail := json.RawMessage("null")
	if userData == nil {
		uid := jscompat.String(userID)
		if !uuidPattern.MatchString(uid) {
			return nil, false // validateUUID throws before any request
		}
		upstream, raw, err := db.AdminUser(ctx, uid)
		var ok bool
		if userEmail, ok = adminEmail(upstream, raw, err); !ok {
			return nil, false
		}
	}
	// The reply count; its error is ignored, and count || 0.
	query := strings.Join([]string{
		supabaserest.Param("select", "*"),
		supabaserest.Param("parent_id", "eq."+jscompat.String(commentID)),
		supabaserest.Param("is_deleted", "eq.false"),
	}, "&")
	replies := json.RawMessage("0")
	if count, ok := db.Count(ctx, session, "repo_comments", query); ok && count != 0 && !math.IsNaN(count) {
		replies = json.RawMessage(jscompat.NumberJSON(count))
	}

	fields := jscompat.Spread(row)
	fields = jscompat.Assign(fields, "user_name", jscompat.FieldOr(userData, "username", []byte("null")))
	fields = jscompat.Assign(fields, "user_email", userEmail)
	fields = jscompat.Assign(fields, "user_avatar", jscompat.FieldOr(userData, "avatar_url", []byte("null")))
	fields = jscompat.Assign(fields, "reply_count", replies)
	return fields, true
}

// profile reads one user's profile as one row and answers its JSON when the
// read succeeds with a truthy row, or nil.
func (h *Handler) profile(ctx context.Context, session, userID string) []byte {
	query := supabaserest.Param("select", "username,avatar_url") + "&" + supabaserest.Param("id", "eq."+userID)
	upstream, raw, err := h.db().SelectObject(ctx, session, "profiles", query)
	if failed(upstream, raw, err) {
		return nil
	}
	if data, _ := supabaserest.ReadResult(upstream, raw); jscompat.Truthy(data) {
		return supabaserest.DataJSON(upstream, raw)
	}
	return nil
}

// adminEmail is authUser?.user?.email after auth.admin.getUserById, as
// auth-js 2.78 reads the reply: any failure is an auth error, so no user;
// a success is read as JSON, and its user is data.user ?? data. It answers
// the email's JSON, or nil for undefined. ok is false where auth-js throws:
// a success whose JSON is null (null.user).
func adminEmail(status int, raw []byte, err error) (json.RawMessage, bool) {
	if err != nil || status < 200 || status > 299 {
		return nil, true
	}
	value, perr := jscompat.DecodeJSON(raw)
	if perr != nil {
		return nil, true
	}
	if value == nil {
		return nil, false
	}
	user := value
	if object, isObject := value.(map[string]any); isObject && object["user"] != nil {
		user = object["user"]
	}
	object, isObject := user.(map[string]any)
	if !isObject {
		return nil, true
	}
	email, present := object["email"]
	if !present {
		return nil, true
	}
	text, _ := json.Marshal(email)
	return text, true
}

// property is value.name for one row's raw JSON: an object's field, and
// undefined for anything else, as `"text".user_id` is.
func property(row json.RawMessage, name string) any {
	if jscompat.Kind(row) != '{' {
		return jscompat.Undefined
	}
	fields, _ := jscompat.ObjectFields(row)
	var value json.RawMessage
	for _, f := range fields {
		if f.Name == name {
			value = f.Value
		}
	}
	if value == nil {
		return jscompat.Undefined
	}
	return parse(value)
}

// post adds a comment or reply: POST in the Next.js handler.
func (h *Handler) post(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, email, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized. Please login to comment."}`))
		return
	}
	// const { repoFullName, commentText, parentId } = await request.json()
	fields, ok := h.body(w, r)
	if !ok {
		return
	}
	repo, parentID := fields["repoFullName"], fields["parentId"]
	if !jscompat.TruthyJSON(repo) {
		write(w, 400, []byte(`{"error":"Repository name is required"}`))
		return
	}
	text, ok := h.commentText(w, fields["commentText"])
	if !ok {
		return
	}
	budget := h.WriteBudget
	if budget == 0 {
		budget = WriteBudget
	}
	ctx, cancel := context.WithTimeout(r.Context(), budget)
	defer cancel()

	if jscompat.TruthyJSON(parentID) {
		query := supabaserest.Param("select", "id") + "&" + supabaserest.Param("id", "eq."+jscompat.String(parse(parentID)))
		upstream, raw, err := db.SelectObject(ctx, session, "repo_comments", query)
		data, _ := supabaserest.ReadResult(upstream, raw)
		if failed(upstream, raw, err) || !jscompat.Truthy(data) {
			write(w, 404, []byte(`{"error":"Parent comment not found"}`))
			return
		}
	}
	if !jscompat.TruthyJSON(parentID) {
		parentID = json.RawMessage("null")
	}
	id, _ := json.Marshal(userID)
	trimmed, _ := json.Marshal(text)
	var row bytes.Buffer
	row.WriteString(`{"user_id":` + string(id) + `,"repo_full_name":`)
	row.Write(repo)
	row.WriteString(`,"parent_id":`)
	row.Write(parentID)
	row.WriteString(`,"comment_text":` + string(trimmed) + `,"upvotes":0,"downvotes":0,"is_edited":false,"is_deleted":false}`)
	upstream, raw, err := db.InsertReturning(ctx, session, "repo_comments", row.Bytes())
	if failed(upstream, raw, err) {
		h.fail(w, "insert", upstream, err, 500, "Failed to post comment")
		return
	}
	var created []jscompat.Field
	if data, _ := supabaserest.ReadResult(upstream, raw); data != nil {
		created = jscompat.Spread(supabaserest.DataJSON(upstream, raw))
	}
	userData := h.profile(ctx, session, userID)
	created = jscompat.Assign(created, "user_name", jscompat.FieldOr(userData, "username", []byte("null")))
	created = jscompat.Assign(created, "user_email", email)
	created = jscompat.Assign(created, "user_avatar", jscompat.FieldOr(userData, "avatar_url", []byte("null")))
	var reply bytes.Buffer
	reply.WriteString(`{"success":true,"comment":`)
	jscompat.WriteObject(&reply, created)
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// patch edits the caller's own comment: PATCH in the Next.js handler.
func (h *Handler) patch(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, _, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	// const { commentId, commentText } = await request.json()
	fields, ok := h.body(w, r)
	if !ok {
		return
	}
	commentID := fields["commentId"]
	if !jscompat.TruthyJSON(commentID) {
		write(w, 400, []byte(`{"error":"Comment ID is required"}`))
		return
	}
	text, ok := h.commentText(w, fields["commentText"])
	if !ok {
		return
	}
	trimmed, _ := json.Marshal(text)
	updated, _ := json.Marshal(jscompat.ISOString(h.now()))
	changes := `{"comment_text":` + string(trimmed) + `,"is_edited":true,"updated_at":` + string(updated) + `}`
	query := supabaserest.Param("id", "eq."+jscompat.String(parse(commentID))) + "&" + supabaserest.Param("user_id", "eq."+userID)
	upstream, raw, err := db.Update(r.Context(), session, "repo_comments", query, []byte(changes), true)
	if failed(upstream, raw, err) {
		// Someone else's comment, or none, is a 406 here, so a 500 (R-087).
		h.fail(w, "update", upstream, err, 500, "Failed to update comment")
		return
	}
	data, _ := supabaserest.ReadResult(upstream, raw)
	if !jscompat.Truthy(data) {
		write(w, 404, []byte(`{"error":"Comment not found or unauthorized"}`))
		return
	}
	write(w, 200, []byte(`{"success":true,"comment":`+string(supabaserest.DataJSON(upstream, raw))+`}`))
}

// delete marks the caller's own comment deleted: DELETE in the Next.js
// handler. Someone else's comment matches no row, which is not an error, so
// the answer is success (R-087).
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, _, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	commentID, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("id")
	if commentID == "" {
		write(w, 400, []byte(`{"error":"Comment ID is required"}`))
		return
	}
	updated, _ := json.Marshal(jscompat.ISOString(h.now()))
	changes := `{"is_deleted":true,"comment_text":"[deleted]","updated_at":` + string(updated) + `}`
	query := supabaserest.Param("id", "eq."+commentID) + "&" + supabaserest.Param("user_id", "eq."+userID)
	upstream, raw, err := db.Update(r.Context(), session, "repo_comments", query, []byte(changes), false)
	if failed(upstream, raw, err) {
		h.fail(w, "update", upstream, err, 500, "Failed to delete comment")
		return
	}
	write(w, 200, []byte(`{"success":true}`))
}

// body reads a POST or PATCH body as request.json() and destructuring do.
// It answers the 500 itself when the Next.js handler would throw.
func (h *Handler) body(w http.ResponseWriter, r *http.Request) (map[string]json.RawMessage, bool) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		h.fail(w, "read_body", 0, err, 500, "Internal server error")
		return nil, false
	}
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		h.fail(w, "decode_body", 0, nil, 500, "Internal server error")
		return nil, false
	}
	return fields, true
}

// commentText is the check `!commentText || !commentText.trim()` and the
// trimmed text. Anything truthy but text has no trim(), so it throws: 500.
// It answers the error itself.
func (h *Handler) commentText(w http.ResponseWriter, raw json.RawMessage) (string, bool) {
	if !jscompat.TruthyJSON(raw) {
		write(w, 400, []byte(`{"error":"Comment text is required"}`))
		return "", false
	}
	text, isText := parse(raw).(string)
	if !isText {
		h.fail(w, "comment_text", 0, nil, 500, "Internal server error")
		return "", false
	}
	trimmed := jscompat.Trim(text)
	if trimmed == "" {
		write(w, 400, []byte(`{"error":"Comment text is required"}`))
		return "", false
	}
	return trimmed, true
}

// orDefault is searchParams.get(name) || fallback.
func orDefault(query jscompat.Query, name, fallback string) string {
	if value, _ := query.Get(name); value != "" {
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
// comment's text or the database's own words, and answers with a fixed
// sentence.
func (h *Handler) fail(w http.ResponseWriter, stage string, upstream int, err error, status int, message string) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "comments", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("comments request failed", attrs...)
	body, _ := json.Marshal(map[string]string{"error": message})
	write(w, status, body)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
