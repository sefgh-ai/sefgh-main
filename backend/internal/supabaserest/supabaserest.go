// Package supabaserest asks the Supabase Data API (PostgREST) as the
// signed-in user, and reads its replies as supabase-js does. The routes that
// read the database (activity, starred) share it.
//
// The database is asked as the user, never as the server: the user's own
// access token goes with the project's public key, which is what the Next.js
// handlers' session client sends, so the same row-level security decides
// which rows come back. No service key is used anywhere in the backend.
package supabaserest

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
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

// Param writes one query parameter as supabase-js writes it in the URL, the
// value encoded so that it cannot add a parameter of its own.
func Param(name, value string) string { return name + "=" + url.QueryEscape(value) }

// Select sends GET /rest/v1/<table>?<query> as the user whose access token
// is session, and returns the reply's status and body, or an error when
// there is no reply to read. query is already encoded (see Param).
func (c Client) Select(ctx context.Context, session, table, query string) (int, []byte, error) {
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	target := strings.TrimRight(c.URL, "/") + "/rest/v1/" + table + "?" + query
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("apikey", c.Key)
	req.Header.Set("Authorization", "Bearer "+session)
	req.Header.Set("Accept-Profile", "public")

	client := *c.HTTP
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, MaxReplyBytes+1))
	if err == nil && len(raw) > MaxReplyBytes {
		err = errors.New("reply too large")
	}
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, raw, nil
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

// Truthy reports whether JavaScript would treat a decoded JSON value as true.
func Truthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case json.Number:
		// A JSON number is never NaN. One too small for a double is 0 in
		// both languages, and one too large is Infinity, which is truthy.
		f, _ := strconv.ParseFloat(string(v), 64)
		return f != 0
	}
	return true
}

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
