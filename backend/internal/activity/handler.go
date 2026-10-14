// Package activity ports GET /api/activity at contract version 1: the
// signed-in user's activity over the last year, as weeks of days and some
// statistics. Every case in contracts/activity is answered as the Next.js
// handler answers it, the two marked defect included.
//
// The database is asked as the user, never as the server. The user's own
// access token goes to the Supabase Data API with the project's public
// key, which is what the Next.js handler's session client sends, so the
// same row-level security decides which rows come back. No service key is
// used.
//
// The planned difference, as for chat: Next.js reads its session cookie,
// Go a Supabase bearer, which the browser sends
// (src/lib/supabase/session-fetch.js).
package activity

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Timeout bounds the database call. The Next.js handler sets none.
const Timeout = 10 * time.Second

// maxReplyBytes bounds the database's reply. A year of rows is far smaller.
const maxReplyBytes = 8 << 20

// Handler answers GET /api/activity. User and Client are required; Now and
// Logger have defaults.
type Handler struct {
	// User says who is calling: their id and their own access token with
	// 200, or another status when that cannot be verified. In the server
	// it is githubaccess.Verifier.User.
	User func(*http.Request) (id, session string, status int)
	// Client makes the Data API call. Its redirects are refused, so the
	// user's token is never sent anywhere else.
	Client *http.Client
	// SupabaseURL and SupabaseKey are the project's address and public key.
	SupabaseURL, SupabaseKey string
	Now                      func() time.Time
	Logger                   *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// The Next.js handler builds its Supabase client first, and without the
	// project's settings that throws: 500, before anything else is checked.
	if h.SupabaseURL == "" || h.SupabaseKey == "" {
		h.fail(w, "settings", 0, nil, "Internal server error")
		return
	}
	// supabase.auth.getUser() reports a refused session and an unreachable
	// Supabase alike, and the handler answers 401 to both. So does Go.
	userID, session, status := h.User(r)
	if status != 200 {
		write(w, 401, map[string]string{"error": "Unauthorized"})
		return
	}

	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	from, to := dateRange(now())
	upstream, raw, err := h.askDatabase(r.Context(), userID, session, from, to)
	if err != nil {
		h.fail(w, "database", upstream, err, "Failed to fetch activity data")
		return
	}
	data, failed := readResult(upstream, raw)
	if failed {
		h.fail(w, "database", upstream, nil, "Failed to fetch activity data")
		return
	}
	counts, total, err := sumRows(data)
	if err != nil {
		h.fail(w, "rows", upstream, err, "Internal server error")
		return
	}
	write(w, 200, buildReply(from, to, counts, total))
}

// askDatabase sends the query the Next.js handler builds:
//
//	.from('activity_logs').select('activity_date, activity_count')
//	.eq('user_id', id).gte('activity_date', from).lte('activity_date', to)
//	.order('activity_date', { ascending: true })
//
// written as supabase-js writes it in the URL. It returns the reply's
// status and body, or an error when there is no reply to read.
func (h *Handler) askDatabase(ctx context.Context, userID, session string, from, to time.Time) (int, []byte, error) {
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	query := strings.Join([]string{
		"select=" + url.QueryEscape("activity_date,activity_count"),
		"user_id=" + url.QueryEscape("eq."+userID),
		"activity_date=" + url.QueryEscape("gte."+day(from)),
		"activity_date=" + url.QueryEscape("lte."+day(to)),
		"order=" + url.QueryEscape("activity_date.asc"),
	}, "&")
	target := strings.TrimRight(h.SupabaseURL, "/") + "/rest/v1/activity_logs?" + query
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("apikey", h.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+session)
	req.Header.Set("Accept-Profile", "public")

	client := *h.Client
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxReplyBytes+1))
	if err == nil && len(raw) > maxReplyBytes {
		err = errors.New("reply too large")
	}
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, raw, nil
}

// fail logs the stage and the database's status, never the user, the rows
// or the database's own words, and answers 500 with a fixed sentence.
func (h *Handler) fail(w http.ResponseWriter, stage string, upstream int, err error, message string) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "activity", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", describe(err))
	}
	logger.Error("activity request failed", attrs...)
	write(w, 500, map[string]string{"error": message})
}

// describe names an error for the log. A transport error's own text holds
// the request's URL, and the URL holds the user's id, so it is not used.
func describe(err error) string {
	var transport *url.Error
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		return "timeout"
	case errors.As(err, &transport):
		return "transport"
	}
	return err.Error()
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // JSON.stringify does not escape <, > and &
	_ = encoder.Encode(body)
}
