// Package supabaserest asks the Supabase Data API (PostgREST) as the
// signed-in user, and reads its replies as supabase-js does. The routes that
// read the database (activity, starred, share) share it.
//
// The database is asked as the user, never as the server: the user's own
// access token goes with the project's public key, which is what the Next.js
// handlers' session client sends, so the same row-level security decides
// which rows come back. No service key is used anywhere in the backend.
package supabaserest

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

// Timeout bounds one Data API call. The Next.js handlers set none.
const Timeout = 10 * time.Second

// MaxReplyBytes bounds a Data API reply.
const MaxReplyBytes = 8 << 20

// Client holds the project's settings. HTTP is required; its redirects are
// refused for each call, so the user's token is never sent anywhere else.
type Client struct {
	HTTP *http.Client
	// URL and Key are the project's address and public (anon) key.
	URL, Key string
}

// Configured reports whether the project's settings are present. Without
// them supabase-js cannot build a client, and the handlers answer 500.
func (c Client) Configured() bool { return c.URL != "" && c.Key != "" }

// Param writes one query parameter as supabase-js writes it in the URL
// (URLSearchParams), the value encoded so that it cannot add a parameter of
// its own.
func Param(name, value string) string {
	return jscompat.FormEncode(name) + "=" + jscompat.FormEncode(value)
}

// Select sends GET /rest/v1/<table>?<query> as the user whose access token
// is session, and returns the reply's status and body, or an error when
// there is no reply to read. query is already encoded (see Param).
func (c Client) Select(ctx context.Context, session, table, query string) (int, []byte, error) {
	return c.do(ctx, http.MethodGet, session, table+"?"+query, "", "", nil)
}

// SelectObject is Select for one row, as supabase-js's .single() asks for
// it: the Data API answers the row as an object, or 406 when there is not
// exactly one.
func (c Client) SelectObject(ctx context.Context, session, table, query string) (int, []byte, error) {
	return c.do(ctx, http.MethodGet, session, table+"?"+query, "application/vnd.pgrst.object+json", "", nil)
}

// Insert sends POST /rest/v1/<table> with row, a JSON object, as the user
// whose access token is session: supabase-js's .insert(row) without
// .select(). The Data API answers 201 with no body when the row is stored.
func (c Client) Insert(ctx context.Context, session, table string, row []byte) (int, []byte, error) {
	return c.do(ctx, http.MethodPost, session, table, "", "", row)
}

// Delete sends DELETE /rest/v1/<table>?<query> as the user whose access
// token is session: supabase-js's .delete() with the query's filters.
// Row-level security decides which rows the filters may reach.
func (c Client) Delete(ctx context.Context, session, table, query string) (int, []byte, error) {
	return c.do(ctx, http.MethodDelete, session, table+"?"+query, "", "", nil)
}

// Upsert sends row, a JSON object, as supabase-js's
// .upsert(row, { onConflict }) does: POST with on_conflict in the query and
// Prefer: resolution=merge-duplicates, so a row that clashes on those
// columns is updated instead of refused.
func (c Client) Upsert(ctx context.Context, session, table, onConflict string, row []byte) (int, []byte, error) {
	return c.do(ctx, http.MethodPost, session, table+"?"+Param("on_conflict", onConflict), "", "resolution=merge-duplicates", row)
}

// RPC calls the database function name with args, a JSON object, as
// supabase-js's .rpc(name, args) does: POST /rest/v1/rpc/<name>.
func (c Client) RPC(ctx context.Context, session, name string, args []byte) (int, []byte, error) {
	return c.do(ctx, http.MethodPost, session, "rpc/"+name, "", "", args)
}

// InsertReturning is Insert followed by .select().single(): the row comes
// back as the database stored it, as one object.
func (c Client) InsertReturning(ctx context.Context, session, table string, row []byte) (int, []byte, error) {
	return c.do(ctx, http.MethodPost, session, table+"?select=*", "application/vnd.pgrst.object+json", "return=representation", row)
}

// Update sends PATCH /rest/v1/<table>?<query> with changes, a JSON object:
// supabase-js's .update(changes) with the query's filters. With returning,
// it is followed by .select().single(): the row comes back as one object,
// or 406 when the filters reach no row (row-level security included).
func (c Client) Update(ctx context.Context, session, table, query string, changes []byte, returning bool) (int, []byte, error) {
	if returning {
		return c.do(ctx, http.MethodPatch, session, table+"?"+query+"&select=*", "application/vnd.pgrst.object+json", "return=representation", changes)
	}
	return c.do(ctx, http.MethodPatch, session, table+"?"+query, "", "", changes)
}

// Count is supabase-js's .select('*', { count: 'exact', head: true }): a
// HEAD request whose answer is the number after the slash in the reply's
// Content-Range, read with parseInt. ok is false when supabase-js has no
// count: no reply, a reply that is not a success, or no such header.
func (c Client) Count(ctx context.Context, session, table, query string) (count float64, ok bool) {
	status, header, _, err := c.send(ctx, http.MethodHead, session, c.restURL(table+"?"+query), "", "count=exact", nil)
	if err != nil || status < 200 || status > 299 {
		return 0, false
	}
	parts := strings.Split(header.Get("Content-Range"), "/")
	if header.Get("Content-Range") == "" || len(parts) < 2 {
		return 0, false
	}
	return jscompat.ParseInt(parts[1]), true
}

// AdminUser asks Supabase Auth's admin API for one user, as supabase-js's
// auth.admin.getUserById(id) does, with the project's public key, which
// is what that call carries from a client built with it. The admin API
// refuses the public key, so this never succeeds (bug register R-040). It
// is kept so the comments route can be compared with Next.js.
func (c Client) AdminUser(ctx context.Context, id string) (int, []byte, error) {
	target := strings.TrimRight(c.URL, "/") + "/auth/v1/admin/users/" + id
	status, _, raw, err := c.send(ctx, http.MethodGet, c.Key, target, "", "", nil)
	return status, raw, err
}

// uuidPattern is the check auth-js 2.78 makes before an admin lookup
// (validateUUID): lower case only.
var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// AdminUserEmail is `(await auth.admin.getUserById(id)).data.user?.email`
// as supabase-js 2.78 computes it, for id written as JavaScript writes it
// in text. It answers the email's JSON, or nil for undefined. ok is false
// where auth-js throws:
//
//   - an id that is not a lower-case UUID, before any request;
//   - a success whose JSON is null (null.user).
//
// Every failure of the call itself is an auth error to auth-js, so no user.
// A success is read as JSON, and its user is data.user ?? data. With the
// public key the admin API always refuses (bug register R-040).
func (c Client) AdminUserEmail(ctx context.Context, id string) (email json.RawMessage, ok bool) {
	if !uuidPattern.MatchString(id) {
		return nil, false
	}
	status, raw, err := c.AdminUser(ctx, id)
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
	value, present := object["email"]
	if !present {
		return nil, true
	}
	email, _ = json.Marshal(value)
	return email, true
}

func (c Client) restURL(path string) string {
	return strings.TrimRight(c.URL, "/") + "/rest/v1/" + path
}

// do sends one Data API request with the headers postgrest-js 2.78 sends: a
// read names the schema in Accept-Profile, and a write in Content-Profile
// with a JSON Content-Type, body or not.
func (c Client) do(ctx context.Context, method, session, path, accept, prefer string, body []byte) (int, []byte, error) {
	status, _, raw, err := c.send(ctx, method, session, c.restURL(path), accept, prefer, body)
	return status, raw, err
}

// send makes one request to the project as the holder of session, and
// returns the reply's status, headers and body. A request to the Data API
// gets its schema header; one to Auth gets the API version supabase-js
// sends.
func (c Client) send(ctx context.Context, method, session, target, accept, prefer string, body []byte) (int, http.Header, []byte, error) {
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, target, reader)
	if err != nil {
		return 0, nil, nil, err
	}
	req.Header.Set("apikey", c.Key)
	req.Header.Set("Authorization", "Bearer "+session)
	switch {
	case strings.Contains(target, "/auth/v1/"):
		req.Header.Set("X-Supabase-Api-Version", "2024-01-01")
	case method == http.MethodGet || method == http.MethodHead:
		req.Header.Set("Accept-Profile", "public")
	default:
		req.Header.Set("Content-Profile", "public")
		req.Header.Set("Content-Type", "application/json")
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}

	client := *c.HTTP
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, MaxReplyBytes+1))
	if err == nil && len(raw) > MaxReplyBytes {
		err = errors.New("reply too large")
	}
	if err != nil {
		return resp.StatusCode, resp.Header, nil, err
	}
	return resp.StatusCode, resp.Header, raw, nil
}

// ReadResult reads a Data API reply as supabase-js does (postgrest-js
// 2.78, PostgrestBuilder.then) and returns what it hands the handler: the
// data, and whether it reports an error. Its rules are odd in places, and
// copied as they are:
//
//   - A 2xx reply with no body has no data. One that is not JSON is an
//     error.
//   - Any other reply is an error if its body is JSON whose value is
//     truthy, or is not JSON at all. A 404 whose body is a JSON list, or
//     is empty, is not an error: it means "no rows".
func ReadResult(status int, raw []byte) (data any, failed bool) {
	text := jscompat.DecodeUTF8(raw)
	if status >= 200 && status <= 299 {
		if text == "" {
			return nil, false
		}
		value, err := jscompat.ParseJSON(text)
		return value, err != nil
	}
	value, err := jscompat.ParseJSON(text)
	if err != nil {
		return nil, !(status == 404 && text == "")
	}
	if _, isList := value.([]any); isList && status == 404 {
		return []any{}, false
	}
	return nil, Truthy(value)
}

// DataJSON is the data of a reply ReadResult did not fail, as JSON.stringify
// writes it back: a success's own text, and [] for a 404 whose body is a
// list, which supabase-js reads as no rows whatever the list held.
func DataJSON(status int, raw []byte) []byte {
	if status < 200 || status > 299 {
		return []byte("[]")
	}
	return []byte(jscompat.DecodeUTF8(raw))
}

// Truthy reports whether JavaScript would treat a decoded JSON value as
// true. It is jscompat.Truthy, kept here for the routes that read replies.
func Truthy(value any) bool { return jscompat.Truthy(value) }

// Describe names an error for a log. A transport error's own text holds the
// request's URL, and the URL holds the user's id, so it is not used.
func Describe(err error) string {
	var transport *url.Error
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		return "timeout"
	case errors.As(err, &transport):
		return "transport"
	}
	return err.Error()
}
