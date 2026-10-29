// Package activity ports GET /api/activity at contract version 3: the
// signed-in user's activity over the last year, as weeks of days and some
// statistics. Go distinguishes Auth outages and reads all yearly pages;
// rollback Next.js expectations remain in the contract separately.
//
// The database is asked as the user, never as the server, through
// internal/supabaserest: the user's own access token with the project's
// public key, so the same row-level security decides which rows come back.
//
// The planned difference, as for chat: Next.js reads its session cookie,
// Go a Supabase bearer, which the browser sends
// (src/lib/supabase/session-fetch.js).
package activity

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// Timeout bounds all database pages together. Next.js sets none.
const Timeout = supabaserest.Timeout

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
	db := supabaserest.Client{HTTP: h.Client, URL: h.SupabaseURL, Key: h.SupabaseKey}
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, "Internal server error")
		return
	}
	// supabase.auth.getUser() reports a refused session and an unreachable
	// Supabase alike, and the Next.js handler answers 401 to both. Go tells
	// them apart (R-063, contract version 2): an outage is 503, as chat
	// answers, so the profile card does not say the visitor signed out.
	userID, session, status := h.User(r)
	if status == 503 {
		write(w, 503, map[string]string{"error": "Sign-in could not be verified"})
		return
	}
	if status != 200 {
		write(w, 401, map[string]string{"error": "Unauthorized"})
		return
	}

	now := time.Now
	if h.Now != nil {
		now = h.Now
	}
	from, to := dateRange(now())
	upstream, data, err := askDatabase(r.Context(), db, userID, session, from, to)
	if err != nil {
		h.fail(w, "database", upstream, err, "Failed to fetch activity data")
		return
	}
	counts, total, err := sumRows(data)
	if err != nil {
		h.fail(w, "rows", upstream, err, "Internal server error")
		return
	}
	write(w, 200, buildReply(from, to, counts, total))
}

// askDatabase keeps the same user and date filters as Next.js, but reads
// 1000-row pages (R-064). The unique user/date/type key makes the combined
// order stable for a fixed dataset. One deadline bounds the entire read.
func askDatabase(ctx context.Context, db supabaserest.Client, userID, session string, from, to time.Time) (int, any, error) {
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	query := strings.Join([]string{
		supabaserest.Param("select", "activity_date,activity_count"),
		supabaserest.Param("user_id", "eq."+userID),
		supabaserest.Param("activity_date", "gte."+day(from)),
		supabaserest.Param("activity_date", "lte."+day(to)),
		supabaserest.Param("order", "activity_date.asc,activity_type.asc"),
		supabaserest.Param("limit", "1000"),
	}, "&")
	var rows []any
	for offset := 0; ; offset += 1000 {
		upstream, raw, err := db.Select(ctx, session, "activity_logs", query+"&"+supabaserest.Param("offset", strconv.Itoa(offset)))
		if err != nil {
			return upstream, nil, err
		}
		data, failed := supabaserest.ReadResult(upstream, raw)
		if failed {
			return upstream, nil, errors.New("activity page failed")
		}
		page, ok := data.([]any)
		if !ok {
			// Preserve existing first-page odd-value behavior. Later pages
			// must be arrays; nothing may turn a partial read into success.
			if offset == 0 {
				return upstream, data, nil
			}
			return upstream, nil, errors.New("invalid activity page")
		}
		rows = append(rows, page...)
		if len(page) < 1000 {
			return upstream, rows, nil
		}
	}
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
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("activity request failed", attrs...)
	write(w, 500, map[string]string{"error": message})
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false) // JSON.stringify does not escape <, > and &
	_ = encoder.Encode(body)
}
