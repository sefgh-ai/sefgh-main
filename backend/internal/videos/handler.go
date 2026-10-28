// Package videos ports GET, POST and DELETE /api/repo/videos: a
// repository's videos with their uploaders, adding a video, and deleting
// one's own. Every case in contracts/repo-videos is answered as the Next.js
// handlers answered it at version 1, apart from the fixes made here after
// cutover: a video address must be https on YouTube's or GitHub's exact hosts
// (version 2, R-088), and an uploader's name and picture come from the public
// profile columns full_name and avatar_url, with no admin lookup (version 3,
// R-040, R-075). The Next.js handler keeps the old behaviour until retired.
//
// Every database request goes as the visitor, through internal/supabaserest:
// with the request's bearer when it has one, and with the project's public
// key otherwise. The planned difference, as for activity: Go reads a
// bearer, not the session cookie, and the browser sends one.
package videos

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// MaxBodyBytes bounds a POST body; a longer one is answered as a body that
// cannot be read. The Next.js handler has no bound of its own.
const MaxBodyBytes = 1 << 20

// concurrency is how many videos have their uploader read at once. The
// Next.js handler starts them all together.
const concurrency = 4

// DetailsBudget bounds every video's uploader lookups together, after the
// list's own read. A lookup cut short counts as failed. The Next.js handler
// has no bound.
const DetailsBudget = 16 * time.Second

// WriteBudget bounds a POST's two database calls together, after the
// sign-in check.
const WriteBudget = 20 * time.Second

// youtubeID is the handler's pattern, written for Go with JavaScript's .
// and \s, and run over UTF-16 units (jscompat.FindSubmatchUTF16):
//
//	/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
var youtubeID = regexp.MustCompile(`(?:youtube\.com/(?:[^/]+/` + jscompat.JSDot + `+/|(?:v|e(?:mbed)?)/|` + jscompat.JSDot + `*[?&]v=)|youtu\.be/)([^"&?/` + jscompat.JSSpace + `]{11})`)

// Handler answers the three methods of /api/repo/videos. User, Database
// and the two settings are required; the rest have defaults.
type Handler struct {
	// User says who is calling: their id, their own access token and the
	// email Supabase Auth gave (nil when it gave none), with 200, or
	// another status. In the server it is githubaccess.Verifier.UserEmail.
	User func(*http.Request) (id, session string, email json.RawMessage, status int)
	// Database makes the Data API and admin calls; SupabaseURL and
	// SupabaseKey are the project's address and public key.
	Database                 *http.Client
	SupabaseURL, SupabaseKey string
	// DetailsBudget and WriteBudget replace the package's when not zero.
	// Tests shorten them.
	DetailsBudget, WriteBudget time.Duration
	Logger                     *slog.Logger
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

// get answers a repository's videos, each with its uploader: GET in the
// Next.js handler.
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
	session := h.SupabaseKey
	if token, ok := githubaccess.SessionToken(r); ok {
		session = token
	}
	// .order('is_featured', { ascending: false }).order('created_at', ...)
	// writes one order parameter with both columns.
	query := strings.Join([]string{
		supabaserest.Param("select", "*"),
		supabaserest.Param("repo_full_name", "eq."+repo),
		supabaserest.Param("order", "is_featured.desc,created_at.desc"),
	}, "&")
	upstream, raw, err := db.Select(r.Context(), session, "repo_videos", query)
	if failed(upstream, raw, err) {
		h.fail(w, "select", upstream, err, 500, "Failed to fetch videos")
		return
	}
	// (videos || []).map: nothing is an empty list; anything else that is
	// not a list has no map().
	data, _ := supabaserest.ReadResult(upstream, raw)
	var rows []json.RawMessage
	if jscompat.Truthy(data) {
		list, isList := data.([]any)
		if !isList {
			h.fail(w, "rows", upstream, nil, 500, "Internal server error")
			return
		}
		if len(list) > 0 {
			rows, _ = jscompat.Elements([]byte(jscompat.DecodeUTF8(raw)))
		}
	}

	details, ok := h.details(r.Context(), session, rows)
	if !ok {
		h.fail(w, "details", 0, nil, 500, "Internal server error")
		return
	}
	var reply bytes.Buffer
	reply.WriteString(`{"videos":[`)
	for i, video := range details {
		if i > 0 {
			reply.WriteByte(',')
		}
		reply.Write(video)
	}
	reply.WriteString(`]}`)
	write(w, 200, reply.Bytes())
}

// details reads every video's uploader, at most concurrency videos at once
// and all within one budget. ok is false where the Next.js handler's
// Promise.all rejects; the first rejection cancels the rest.
func (h *Handler) details(parent context.Context, session string, rows []json.RawMessage) ([][]byte, bool) {
	budget := h.DetailsBudget
	if budget == 0 {
		budget = DetailsBudget
	}
	ctx, cancel := context.WithTimeout(parent, budget)
	defer cancel()
	out := make([][]byte, len(rows))
	slots := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex
	failedAny := false
	for i := range rows {
		wg.Add(1)
		slots <- struct{}{}
		go func(i int) {
			defer wg.Done()
			defer func() { <-slots }()
			video, ok := h.detail(ctx, session, rows[i])
			if !ok {
				mu.Lock()
				failedAny = true
				mu.Unlock()
				cancel()
				return
			}
			out[i] = video
		}(i)
	}
	wg.Wait()
	return out, !failedAny
}

// detail is the map callback for one video.
func (h *Handler) detail(ctx context.Context, session string, row json.RawMessage) ([]byte, bool) {
	if jscompat.Kind(row) == 'n' {
		return nil, false // video.uploaded_by throws on null
	}
	uploader := property(row, "uploaded_by")
	// if (!video.uploaded_by) return video
	if !jscompat.Truthy(uploader) {
		return row, true
	}
	// The uploader's public profile; since contract version 3 (R-040,
	// R-075) there is no admin lookup, so an uploader's email is never sent.
	profile := h.profile(ctx, session, jscompat.String(uploader))
	fields := jscompat.Spread(row)
	fields = jscompat.Assign(fields, "uploader_name", jscompat.FieldOr(profile, "full_name", []byte("null")))
	fields = jscompat.Assign(fields, "uploader_email", []byte("null"))
	fields = jscompat.Assign(fields, "uploader_avatar", jscompat.FieldOr(profile, "avatar_url", []byte("null")))
	var out bytes.Buffer
	jscompat.WriteObject(&out, fields)
	return out.Bytes(), true
}

// profile reads one user's profile as one row and answers its JSON when the
// read succeeds with a truthy row, or nil.
func (h *Handler) profile(ctx context.Context, session, userID string) []byte {
	query := supabaserest.Param("select", "full_name,avatar_url") + "&" + supabaserest.Param("id", "eq."+userID)
	upstream, raw, err := h.db().SelectObject(ctx, session, "profiles", query)
	if failed(upstream, raw, err) {
		return nil
	}
	if data, _ := supabaserest.ReadResult(upstream, raw); jscompat.Truthy(data) {
		return supabaserest.DataJSON(upstream, raw)
	}
	return nil
}

// post adds a video: POST in the Next.js handler.
func (h *Handler) post(w http.ResponseWriter, r *http.Request) {
	db := h.db()
	if !db.Configured() {
		h.fail(w, "settings", 0, nil, 500, "Internal server error")
		return
	}
	userID, session, email, status := h.User(r)
	if status != 200 {
		write(w, 401, []byte(`{"error":"Unauthorized. Please login to add videos."}`))
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBodyBytes))
	if err != nil {
		h.fail(w, "read_body", 0, err, 500, "Internal server error")
		return
	}
	// const { repoFullName, videoUrl, title, description } = await request.json()
	fields, ok := jscompat.RequestFields(body)
	if !ok {
		h.fail(w, "decode_body", 0, nil, 500, "Internal server error")
		return
	}
	repo, videoURL := fields["repoFullName"], fields["videoUrl"]
	if !jscompat.TruthyJSON(repo) || !jscompat.TruthyJSON(videoURL) {
		write(w, 400, []byte(`{"error":"Repository name and video URL are required"}`))
		return
	}
	videoType, thumbnail, ok := kind(parse(videoURL))
	if !ok {
		write(w, 400, []byte(`{"error":"Video URL must be an https link to YouTube or GitHub"}`))
		return
	}
	title, description := fields["title"], fields["description"]
	if !jscompat.TruthyJSON(title) {
		title = json.RawMessage("null")
	}
	if !jscompat.TruthyJSON(description) {
		description = json.RawMessage("null")
	}
	budget := h.WriteBudget
	if budget == 0 {
		budget = WriteBudget
	}
	ctx, cancel := context.WithTimeout(r.Context(), budget)
	defer cancel()

	id, _ := json.Marshal(userID)
	var row bytes.Buffer
	row.WriteString(`{"repo_full_name":`)
	row.Write(repo)
	row.WriteString(`,"video_url":`)
	row.Write(videoURL)
	row.WriteString(`,"video_type":"` + videoType + `","title":`)
	row.Write(title)
	row.WriteString(`,"description":`)
	row.Write(description)
	row.WriteString(`,"thumbnail_url":`)
	row.Write(thumbnail)
	row.WriteString(`,"uploaded_by":` + string(id) + `}`)
	upstream, raw, err := db.InsertReturning(ctx, session, "repo_videos", row.Bytes())
	if failed(upstream, raw, err) {
		h.fail(w, "insert", upstream, err, 500, "Failed to add video")
		return
	}
	var created []jscompat.Field
	if data, _ := supabaserest.ReadResult(upstream, raw); data != nil {
		created = jscompat.Spread(supabaserest.DataJSON(upstream, raw))
	}
	profile := h.profile(ctx, session, userID)
	created = jscompat.Assign(created, "uploader_name", jscompat.FieldOr(profile, "full_name", []byte("null")))
	created = jscompat.Assign(created, "uploader_email", email)
	created = jscompat.Assign(created, "uploader_avatar", jscompat.FieldOr(profile, "avatar_url", []byte("null")))
	var reply bytes.Buffer
	reply.WriteString(`{"success":true,"video":`)
	jscompat.WriteObject(&reply, created)
	reply.WriteByte('}')
	write(w, 200, reply.Bytes())
}

// videoHosts are the hosts a video may come from, each with the type it
// gives (R-088). The match is exact, case included: the page's YouTube player
// recognises only these spellings.
var videoHosts = map[string]string{
	"youtube.com":     "youtube",
	"www.youtube.com": "youtube",
	"m.youtube.com":   "youtube",
	"youtu.be":        "youtube",
	"github.com":      "github",
	"www.github.com":  "github",
}

// kind gives a video's type and the thumbnail's JSON (null without a YouTube
// id). Since contract version 2 (R-088) a video is text that parses as an
// https address with no user name or port, whose host is one of videoHosts;
// the host alone decides the type. ok is false for anything else, which is
// answered 400.
func kind(videoURL any) (videoType string, thumbnail json.RawMessage, ok bool) {
	text, isText := videoURL.(string)
	if !isText {
		return "", nil, false
	}
	address, err := url.Parse(text)
	if err != nil || address.Scheme != "https" || address.User != nil || address.Port() != "" {
		return "", nil, false
	}
	videoType, ok = videoHosts[address.Host]
	if !ok {
		return "", nil, false
	}
	if videoType != "youtube" {
		return videoType, json.RawMessage("null"), true
	}
	units, found := jscompat.FindSubmatchUTF16(youtubeID, text, 1)
	if !found {
		return "youtube", json.RawMessage("null"), true
	}
	// `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, as UTF-16
	// units, so half of a pair is written as JSON writes it.
	image := append(append(jscompat.ToUTF16("https://img.youtube.com/vi/"), units...), jscompat.ToUTF16("/maxresdefault.jpg")...)
	thumbnail, _ = image.MarshalJSON()
	return "youtube", thumbnail, true
}

// delete removes the caller's own video: DELETE in the Next.js handler.
// Someone else's video matches no row, which is not an error, so the answer
// is success (R-087).
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
	videoID, _ := jscompat.ParseQuery(r.URL.RawQuery).Get("id")
	if videoID == "" {
		write(w, 400, []byte(`{"error":"Video ID is required"}`))
		return
	}
	filters := supabaserest.Param("id", "eq."+videoID) + "&" + supabaserest.Param("uploaded_by", "eq."+userID)
	upstream, raw, err := db.Delete(r.Context(), session, "repo_videos", filters)
	if failed(upstream, raw, err) {
		h.fail(w, "delete", upstream, err, 500, "Failed to delete video")
		return
	}
	write(w, 200, []byte(`{"success":true}`))
}

// property is value.name for one row's raw JSON: an object's field, and
// undefined for anything else, as `"text".uploaded_by` is.
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

// fail logs the stage and the database's status, never the user, the video
// or the database's own words, and answers with a fixed sentence.
func (h *Handler) fail(w http.ResponseWriter, stage string, upstream int, err error, status int, message string) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	attrs := []any{"route", "videos", "stage", stage}
	if upstream != 0 {
		attrs = append(attrs, "status", upstream)
	}
	if err != nil {
		attrs = append(attrs, "error", supabaserest.Describe(err))
	}
	logger.Error("videos request failed", attrs...)
	body, _ := json.Marshal(map[string]string{"error": message})
	write(w, status, body)
}

func write(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
