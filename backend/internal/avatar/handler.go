// Package avatar ports POST /api/upload-avatar at contract version 1.
// All Storage, Auth and profile calls use the verified caller's token.
package avatar

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

const (
	MaxFileBytes  = 5 << 20
	MaxBodyBytes  = 6 << 20
	Budget        = 24 * time.Second
	CleanupBudget = 3 * time.Second
)

type User func(*http.Request) (id, session string, status int)

type Handler struct {
	User                     User
	HTTP                     *http.Client
	SupabaseURL, SupabaseKey string
	Now                      func() time.Time
	Logger                   *slog.Logger
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), Budget)
	defer cancel()
	r = r.WithContext(ctx)
	// A context alone cannot interrupt a slow inbound Body.Read. Apply its
	// deadline to the connection as well; Recorder does not support this.
	deadline, _ := ctx.Deadline()
	controller := http.NewResponseController(w)
	// Leave it in place while net/http drains/closes an unread request body.
	// Clearing it before returning would let that drain block indefinitely.
	_ = controller.SetReadDeadline(deadline)
	if h.SupabaseURL == "" || h.SupabaseKey == "" {
		h.fail(w, "settings", "Internal server error", supabaserest.MissingSettings)
		return
	}
	id, session, status := h.User(r)
	if status != 200 {
		write(w, 401, map[string]any{"error": "Unauthorized"})
		return
	}
	name, kind, body, present, err := readAvatar(w, r)
	if err != nil {
		h.fail(w, "form", "Internal server error", "Could not parse multipart form data")
		return
	}
	if !present {
		write(w, 400, map[string]any{"error": "No file provided"})
		return
	}
	if kind != "image/jpeg" && kind != "image/png" && kind != "image/gif" && kind != "image/webp" {
		write(w, 400, map[string]any{"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."})
		return
	}
	if len(body) > MaxFileBytes {
		write(w, 400, map[string]any{"error": "File size exceeds 5MB limit"})
		return
	}
	stamp := func() string {
		now := time.Now()
		if h.Now != nil {
			now = h.Now()
		}
		return strconv.FormatInt(now.UnixMilli(), 10)
	}
	parts := strings.Split(name, ".")
	fileName := id + "/avatar-" + stamp() + "." + parts[len(parts)-1]
	uploadPath := cleanPath(fileName)
	_, raw, upstreamErr := h.call(ctx, session, "POST", "/storage/v1/object/avatars/"+uploadPath, kind, body, true)
	if upstreamErr == nil && bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		h.fail(w, "upload_shape", "Internal server error", "Cannot read properties of null (reading 'Id')")
		return
	}
	if upstreamErr != nil {
		details := errorText(raw, upstreamErr, false)
		code, buckets, listErr := h.call(ctx, session, "GET", "/storage/v1/bucket", "", nil, false)
		exists := false
		if listErr == nil && code < 300 {
			var list []map[string]any
			if json.Unmarshal(buckets, &list) == nil {
				for _, bucket := range list {
					if bucket["name"] == "avatars" {
						exists = true
					}
				}
			}
		}
		message := "Failed to upload avatar"
		if !exists {
			message = "Storage bucket not configured. Please run supabase/avatar-storage-setup.sql to set up the avatars bucket."
		}
		h.fail(w, "upload", message, details)
		return
	}
	publicURL := encodeURI(strings.TrimRight(h.SupabaseURL, "/")+"/storage/v1/object/public/avatars/"+fileName) + "?t=" + stamp()
	metadata, _ := json.Marshal(map[string]any{"data": map[string]string{"avatar_url": publicURL}, "code_challenge": nil, "code_challenge_method": nil})
	_, raw, upstreamErr = h.call(ctx, session, "PUT", "/auth/v1/user", "application/json;charset=UTF-8", metadata, false)
	if upstreamErr == nil && bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		h.fail(w, "metadata_shape", "Internal server error", "Cannot read properties of null (reading 'user')")
		return
	}
	if upstreamErr != nil {
		h.fail(w, "metadata", "Failed to update user profile", errorText(raw, upstreamErr, true))
		return
	}
	changes, _ := json.Marshal(map[string]string{"avatar_url": publicURL})
	_, _, profileErr := h.call(ctx, session, "PATCH", "/rest/v1/profiles?"+supabaserest.Param("id", "eq."+id), "application/json", changes, false)
	if profileErr != nil {
		h.log("profile")
	}
	// Next starts detached cleanup. Go finishes bounded best-effort cleanup
	// before returning, so a serverless response cannot strand its goroutine.
	cleanupCtx, stop := context.WithTimeout(ctx, CleanupBudget)
	h.cleanup(cleanupCtx, session, id, fileName)
	stop()
	write(w, 200, map[string]any{"success": true, "avatar_url": publicURL})
}

// MultipartReader streams parts without spilling the upload to a temp file.
// Only the first avatar field is used, matching FormData.get.
func readAvatar(w http.ResponseWriter, r *http.Request) (name, kind string, body []byte, present bool, err error) {
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	media, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if media == "application/x-www-form-urlencoded" {
		raw, e := io.ReadAll(r.Body)
		if e != nil {
			return "", "", nil, false, e
		}
		text, ok := jscompat.ParseQuery(string(raw)).Get("avatar")
		return "", "", nil, ok && text != "", nil
	}
	reader, e := r.MultipartReader()
	if e != nil {
		return "", "", nil, false, e
	}
	for {
		part, e := reader.NextPart()
		if e == io.EOF {
			return "", "", nil, false, nil
		}
		if e != nil {
			return "", "", nil, false, e
		}
		if part.FormName() != "avatar" {
			if _, e = io.Copy(io.Discard, part); e != nil {
				return "", "", nil, false, e
			}
			continue
		}
		_, params, _ := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
		_, isFile := params["filename"]
		data, e := io.ReadAll(io.LimitReader(part, MaxFileBytes+1))
		if e != nil {
			return "", "", nil, false, e
		}
		if !isFile {
			return "", "", nil, len(data) > 0, nil
		}
		// The name as sent: part.FileName() applies filepath.Base, which
		// drops path segments (and on Windows also splits on backslashes).
		return params["filename"], strings.ToLower(part.Header.Get("Content-Type")), data, true, nil
	}
}

// cleanPath copies how storage-js cleans an upload path: it removes one
// leading and one trailing slash, then turns each run of slashes into one.
func cleanPath(p string) string {
	p = strings.TrimSuffix(strings.TrimPrefix(p, "/"), "/")
	for strings.Contains(p, "//") {
		p = strings.ReplaceAll(p, "//", "/")
	}
	return p
}

func (h *Handler) cleanup(ctx context.Context, session, id, current string) {
	query, _ := json.Marshal(map[string]any{"limit": 100, "offset": 0, "sortBy": map[string]string{"column": "name", "order": "asc"}, "prefix": id})
	_, raw, err := h.call(ctx, session, "POST", "/storage/v1/object/list/avatars", "application/json", query, false)
	if err != nil {
		h.log("cleanup_list")
		return
	}
	var files []map[string]any
	if json.Unmarshal(raw, &files) != nil || len(files) <= 1 {
		return
	}
	_, currentOnly, _ := strings.Cut(current, "/")
	prefixes := []string{}
	for _, file := range files {
		if file["name"] != currentOnly {
			name := "undefined"
			if v, ok := file["name"]; ok {
				name = jscompat.String(v)
			}
			prefixes = append(prefixes, id+"/"+name)
		}
	}
	if len(prefixes) > 0 {
		data, _ := json.Marshal(map[string]any{"prefixes": prefixes})
		if _, _, err = h.call(ctx, session, "DELETE", "/storage/v1/object/avatars", "application/json", data, false); err != nil {
			h.log("cleanup_remove")
		}
	}
}

// call refuses redirects and caps replies; every call shares the route's
// context as well as a 10-second per-call bound. Never log the raw error.
func (h *Handler) call(ctx context.Context, session, method, path, contentType string, body []byte, upload bool) (int, []byte, error) {
	ctx, cancel := context.WithTimeout(ctx, supabaserest.Timeout)
	defer cancel()
	u, err := jscompat.FetchURL(strings.TrimRight(h.SupabaseURL, "/") + path)
	if err != nil {
		return 0, nil, err
	}
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, u.String(), reader)
	if err != nil {
		return 0, nil, err
	}
	req.URL = u
	req.Header.Set("apikey", h.SupabaseKey)
	req.Header.Set("Authorization", "Bearer "+session)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if upload {
		req.Header.Set("Cache-Control", "max-age=3600")
		req.Header.Set("X-Upsert", "true")
	}
	if strings.HasPrefix(path, "/rest/v1/") {
		req.Header.Set("Content-Profile", "public")
	}
	if strings.HasPrefix(path, "/auth/v1/") {
		req.Header.Set("X-Supabase-Api-Version", "2024-01-01")
	}
	client := *h.HTTP
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, supabaserest.MaxReplyBytes+1))
	if err != nil {
		return resp.StatusCode, nil, err
	}
	if len(raw) > supabaserest.MaxReplyBytes {
		return resp.StatusCode, nil, errors.New("reply too large")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, raw, errors.New("upstream refused")
	}
	if resp.StatusCode != 204 && !strings.HasPrefix(path, "/rest/v1/") && !json.Valid(raw) {
		return resp.StatusCode, raw, errors.New("invalid JSON reply")
	}
	return resp.StatusCode, raw, nil
}

func errorText(raw []byte, err error, auth bool) string {
	if len(raw) == 0 {
		return "fetch failed"
	}
	var value any
	if json.Unmarshal(raw, &value) != nil {
		return "Invalid JSON response"
	}
	object, _ := value.(map[string]any)
	for _, key := range []string{"msg", "message", "error_description", "error"} {
		v := object[key]
		if !auth && key == "error" {
			if nested, ok := v.(map[string]any); ok {
				v = nested["message"]
			}
		}
		if jscompat.Truthy(v) {
			return jscompat.String(v)
		}
	}
	compact := &bytes.Buffer{}
	_ = json.Compact(compact, raw)
	return compact.String()
}

// encodeURI, unlike encodeURIComponent, keeps URI separators in public URLs.
func encodeURI(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r < 128 && strings.ContainsRune(";/?:@&=+$,#", r) {
			b.WriteRune(r)
		} else {
			b.WriteString(jscompat.EncodeURIComponent(string(r)))
		}
	}
	return b.String()
}

func (h *Handler) log(stage string) {
	logger := h.Logger
	if logger == nil {
		logger = slog.Default()
	}
	logger.Warn("avatar stage failed", "stage", stage)
}
func (h *Handler) fail(w http.ResponseWriter, stage, message, details string) {
	h.log(stage)
	write(w, 500, map[string]any{"error": message, "details": details})
}
func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
