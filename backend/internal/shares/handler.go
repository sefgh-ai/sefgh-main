// Package shares serves the two routes that write shared conversations:
// POST and DELETE /api/conversations/{id}/share, which
// create or remove the share link of one's own conversation, and POST
// /api/share/{token}/fork, which copies a public shared conversation into
// one's own. P7-03 retired the Next.js handlers; contracts/conversation-share
// and contracts/share-fork retain every current Go behavior case.
//
// BUG-055/R-089: failure replies use fixed public messages.
// Upstream details are never sent to the visitor.
//
// Only a signed-in user reaches the database, always with their own token,
// through internal/supabaserest. The planned difference, as for activity:
// Go reads a bearer, not the session cookie, and the browser sends one.
package shares

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a share's POST body; a longer one is answered 500.
// The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// snapshotSize is how many of the last messages a share keeps.
const snapshotSize = 50

// User says who is calling: their id and their own access token, with 200,
// or another status. In the server it is githubaccess.Verifier.User.
type User func(*http.Request) (id, session string, status int)

// Conversation answers POST and DELETE /api/conversations/{id}/share. User,
// Database and the two settings are required; the rest have defaults.
type Conversation struct {
	User User
	// Database makes the Data API calls; SupabaseURL and SupabaseKey are the
	// project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	// SiteURL is NEXT_PUBLIC_SITE_URL, the start of every share link. When it
	// is empty the link starts with the request's origin, as in Next.js, but
	// behind a proxy that origin is the proxy's view: see origin.
	SiteURL string
	// Now is the clock for deleted_at; time.Now when nil.
	Now    func() time.Time
	Logger *slog.Logger
}

func (h *Conversation) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodDelete {
		h.unshare(w, r)
		return
	}
	h.share(w, r)
}

// share creates or renews the link: POST in the Next.js handler.
func (h *Conversation) share(w http.ResponseWriter, r *http.Request) {
	db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
	if !db.Configured() {
		missingSettings(w, h.Logger)
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	conversationID := r.PathValue("id")

	// const { isPublic = true, title, summary } = (await req.json()) || {}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		message := "Request body could not be read"
		var tooLong *http.MaxBytesError
		if errors.As(err, &tooLong) {
			message = "Request body is too large"
		}
		fail(w, h.Logger, "read_body", 0, err, 500, jsString(message))
		return
	}
	text := jscompat.DecodeUTF8(body)
	value, perr := jscompat.ParseJSON(text)
	if perr != nil {
		fail(w, h.Logger, "decode_body", 0, nil, 500, jsString(jscompat.JSONParseMessage(text)))
		return
	}
	var fields []jscompat.Field
	if _, isObject := value.(map[string]any); isObject {
		fields, _ = jscompat.ObjectFields([]byte(text))
	}
	isPublic := field(fields, "isPublic")
	if isPublic == nil {
		isPublic = json.RawMessage("true")
	}
	title, summary := field(fields, "title"), field(fields, "summary")

	// The conversation, read as the user's own: any failure, or none, is 404.
	query := strings.Join([]string{
		supabaserest.Param("select", "id,user_id,title,messages"),
		supabaserest.Param("id", "eq."+conversationID),
		supabaserest.Param("user_id", "eq."+userID),
	}, "&")
	upstream, raw, err := db.SelectObject(r.Context(), session, "user_conversations", query)
	if data, bad := supabaserest.ReadResult(upstream, raw); err != nil || bad || !jscompat.Truthy(data) {
		if err != nil || upstream >= 500 {
			logFailure(h.Logger, "conversation", upstream, err)
		}
		write(w, 404, []byte(`{"error":"Conversation not found"}`))
		return
	}
	conversation := supabaserest.DataJSON(upstream, raw)

	// Array.isArray(conv.messages) ? conv.messages.slice(-50) : []
	snapshot := []byte("[]")
	if messages := property(conversation, "messages"); jscompat.Kind(messages) == '[' {
		elements, _ := jscompat.Elements(messages)
		if len(elements) > snapshotSize {
			elements = elements[len(elements)-snapshotSize:]
		}
		var list bytes.Buffer
		list.WriteByte('[')
		for i, element := range elements {
			if i > 0 {
				list.WriteByte(',')
			}
			list.Write(element)
		}
		list.WriteByte(']')
		snapshot = list.Bytes()
	}
	// title || conv.title, which may be undefined and is then left out.
	if !jscompat.TruthyJSON(title) {
		title = property(conversation, "title")
	}
	if !jscompat.TruthyJSON(summary) {
		summary = json.RawMessage("null")
	}
	args := []jscompat.Field{{Name: "p_conversation_id", Value: jsString(conversationID)}, {Name: "p_is_public", Value: isPublic}}
	if title != nil {
		args = append(args, jscompat.Field{Name: "p_title", Value: title})
	}
	args = append(args, jscompat.Field{Name: "p_summary", Value: summary}, jscompat.Field{Name: "p_snapshot", Value: snapshot})
	var call bytes.Buffer
	jscompat.WriteObject(&call, args)

	upstream, raw, err = db.RPC(r.Context(), session, "upsert_shared_conversation", call.Bytes())
	if message, bad := supabaserest.ErrorMessage(upstream, raw, err); bad {
		fail(w, h.Logger, "upsert", upstream, err, 400, message)
		return
	}
	if data, _ := supabaserest.ReadResult(upstream, raw); data == nil {
		fail(w, h.Logger, "share", upstream, nil, 500, jsString("Cannot read properties of null (reading 'share_token')"))
		return
	}
	share := supabaserest.DataJSON(upstream, raw)
	token := "undefined"
	if value := property(share, "share_token"); value != nil {
		token = jscompat.String(parse(value))
	}
	// (NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '') + '/s/' + token
	link := strings.TrimSuffix(h.origin(r), "/") + "/s/" + token
	var reply bytes.Buffer
	reply.WriteString(`{"share":`)
	writeValue(&reply, share)
	reply.WriteString(`,"url":`)
	reply.Write(jsString(link))
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// origin is NEXT_PUBLIC_SITE_URL, or the request's origin. Next.js's own
// proxy sends the browser's host as X-Forwarded-Host but not the scheme, so
// set SiteURL wherever this server runs behind one.
func (h *Conversation) origin(r *http.Request) string {
	if h.SiteURL != "" {
		return h.SiteURL
	}
	host, _, _ := strings.Cut(r.Header.Get("X-Forwarded-Host"), ",")
	if host = strings.TrimSpace(host); host == "" {
		host = r.Host
	}
	scheme, _, _ := strings.Cut(r.Header.Get("X-Forwarded-Proto"), ",")
	if scheme = strings.TrimSpace(scheme); scheme == "" {
		scheme = "http"
		if r.TLS != nil {
			scheme = "https"
		}
	}
	return scheme + "://" + host
}

// unshare implements DELETE for the caller's own conversation share.
// Remove all active owner/conversation matches, then verify an empty result.
func (h *Conversation) unshare(w http.ResponseWriter, r *http.Request) {
	db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
	if !db.Configured() {
		missingSettings(w, h.Logger)
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	filters := strings.Join([]string{
		supabaserest.Param("conversation_id", "eq."+r.PathValue("id")),
		supabaserest.Param("created_by", "eq."+userID),
		supabaserest.Param("deleted_at", "is.null"),
	}, "&")
	changes := []byte(`{"deleted_at":` + string(jsString(jscompat.ISOString(h.now()))) + `}`)
	upstream, raw, err := db.Update(r.Context(), session, "shared_conversations", filters, changes, false)
	if message, bad := supabaserest.ErrorMessage(upstream, raw, err); err != nil || upstream < 200 || upstream > 299 || bad {
		fail(w, h.Logger, "update", upstream, err, 400, message)
		return
	}
	// Verify the mutation: a silent zero-row update or concurrent active share
	// must not be presented to the user as a successful removal.
	query := supabaserest.Param("select", "id") + "&" + filters + "&" + supabaserest.Param("limit", "1")
	upstream, raw, err = db.Select(r.Context(), session, "shared_conversations", query)
	data, bad := supabaserest.ReadResult(upstream, raw)
	rows, ok := data.([]any)
	if err != nil || upstream < 200 || upstream > 299 || bad || !ok || len(rows) != 0 {
		fail(w, h.Logger, "verify", upstream, err, 500, nil)
		return
	}
	write(w, 200, []byte(`{"ok":true}`))
}

func (h *Conversation) now() time.Time {
	if h.Now != nil {
		return h.Now()
	}
	return time.Now()
}

// Fork answers POST /api/share/{token}/fork. User, Database and the two
// settings are required; Logger has a default.
type Fork struct {
	User                     User
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	Logger                   *slog.Logger
}

func (h *Fork) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	db := supabaserest.Client{HTTP: h.Database, URL: h.SupabaseURL, Key: h.SupabaseKey}
	if !db.Configured() {
		missingSettings(w, h.Logger)
		return
	}
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized"}`))
		return
	}
	// The share, which must be public; any failure, or none, is 404.
	query := strings.Join([]string{
		supabaserest.Param("select", "id,title,snapshot,is_public"),
		supabaserest.Param("share_token", "eq."+r.PathValue("token")),
		supabaserest.Param("deleted_at", "is.null"),
	}, "&")
	upstream, raw, err := db.SelectObject(r.Context(), session, "shared_conversations", query)
	data, bad := supabaserest.ReadResult(upstream, raw)
	share := supabaserest.DataJSON(upstream, raw)
	if err != nil || bad || !jscompat.Truthy(data) || !jscompat.TruthyJSON(property(share, "is_public")) {
		if err != nil || upstream >= 500 {
			logFailure(h.Logger, "lookup", upstream, err)
		}
		write(w, 404, []byte(`{"error":"Not found or private"}`))
		return
	}
	title := property(share, "title")
	if !jscompat.TruthyJSON(title) {
		title = json.RawMessage(`"Shared Conversation"`)
	}
	messages := property(share, "snapshot")
	if jscompat.Kind(messages) != '[' {
		messages = json.RawMessage("[]")
	}
	var row bytes.Buffer
	jscompat.WriteObject(&row, []jscompat.Field{
		{Name: "user_id", Value: jsString(userID)},
		{Name: "title", Value: title},
		{Name: "messages", Value: messages},
		{Name: "model", Value: json.RawMessage(`"gpt-4o"`)},
	})
	upstream, raw, err = db.InsertSelect(r.Context(), session, "user_conversations", "id", row.Bytes())
	if message, bad := supabaserest.ErrorMessage(upstream, raw, err); bad {
		fail(w, h.Logger, "insert", upstream, err, 400, message)
		return
	}
	if data, _ := supabaserest.ReadResult(upstream, raw); data == nil {
		fail(w, h.Logger, "conversation", upstream, nil, 500, jsString("Cannot read properties of null (reading 'id')"))
		return
	}
	// { conversationId: conv.id }, which JSON leaves out when undefined.
	id := property(supabaserest.DataJSON(upstream, raw), "id")
	if id == nil {
		write(w, 200, []byte(`{}`))
		return
	}
	write(w, 200, append(append([]byte(`{"conversationId":`), id...), '}'))
}

// property is value.name for one value's raw JSON: an object's field (the
// last of a repeated name), and nil, undefined, for anything else.
func property(raw []byte, name string) json.RawMessage {
	if jscompat.Kind(raw) != '{' {
		return nil
	}
	fields, _ := jscompat.ObjectFields(raw)
	return field(fields, name)
}

// field is the value of the last field called name, or nil.
func field(fields []jscompat.Field, name string) json.RawMessage {
	var value json.RawMessage
	for _, f := range fields {
		if f.Name == name {
			value = f.Value
		}
	}
	return value
}

// writeValue writes a value as JSON.stringify writes what JSON.parse read:
// an object with each name once, in its first place; anything else as sent.
func writeValue(buffer *bytes.Buffer, raw []byte) {
	if jscompat.Kind(raw) == '{' {
		fields, _ := jscompat.ObjectFields(raw)
		jscompat.WriteObject(buffer, fields)
		return
	}
	buffer.Write(bytes.TrimSpace(raw))
}

// parse reads one raw JSON value.
func parse(raw json.RawMessage) any {
	value, _ := jscompat.ParseJSON(string(raw))
	return value
}

// jsString writes text as a JSON string, as JSON.stringify writes it.
func jsString(text string) json.RawMessage {
	out, _ := jscompat.ToUTF16(text).MarshalJSON()
	return out
}

// missingSettings returns a fixed public error without library diagnostics.
func missingSettings(w http.ResponseWriter, logger *slog.Logger) {
	logFailure(logger, "settings", 0, nil)
	write(w, 500, []byte(`{"error":"Internal server error"}`))
}

// fail logs only sanitized stage/status and returns fixed public text.
// The legacy message parameter is never written to the response.
func fail(w http.ResponseWriter, logger *slog.Logger, stage string, upstream int, err error, status int, message json.RawMessage) {
	logFailure(logger, stage, upstream, err)
	if status == 400 {
		write(w, status, []byte(`{"error":"Share operation failed"}`))
		return
	}
	write(w, status, []byte(`{"error":"Internal server error"}`))
}

// logFailure records a stage and the database's status, never the user,
// the conversation, the token or the database's own words.
func logFailure(logger *slog.Logger, stage string, upstream int, err error) {
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "shares", "stage", stage}
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
