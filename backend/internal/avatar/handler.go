// Package avatar ports POST /api/upload-avatar at contract version 1.
// All Storage, Auth and profile calls use the verified caller's token.
package avatar

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
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
	Random                   io.Reader
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
	_, _, body, present, err := readAvatar(w, r)
	if err != nil {
		h.fail(w, "form", "Internal server error", "Could not parse multipart form data")
		return
	}
	if !present {
		write(w, 400, map[string]any{"error": "No file provided"})
		return
	}
	kind, extension := imageType(body)
	if kind == "" {
		write(w, 400, map[string]any{"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."})
		return
	}
	if len(body) > MaxFileBytes {
		write(w, 400, map[string]any{"error": "File size exceeds 5MB limit"})
		return
	}
	if status := h.acquire(r.Context(), session, id); status != 200 {
		message := "Avatar upload could not be started"
		if status == 409 {
			message = "Another avatar upload is in progress"
		}
		write(w, status, map[string]any{"error": message})
		return
	}
	defer h.release(r.Context(), session, id)
	stamp := func() string {
		now := time.Now()
		if h.Now != nil {
			now = h.Now()
		}
		return strconv.FormatInt(now.UnixMilli(), 10)
	}
	random := h.Random
	if random == nil {
		random = rand.Reader
	}
	token := make([]byte, 16)
	if _, err := io.ReadFull(random, token); err != nil {
		h.fail(w, "random", "Failed to upload avatar", "")
		return
	}
	fileName := id + "/avatar-" + stamp() + "-" + hex.EncodeToString(token) + "." + extension
	uploadPath := cleanPath(fileName)
	_, raw, upstreamErr := h.call(ctx, session, "POST", "/storage/v1/object/avatars/"+uploadPath, kind, body, true)
	if upstreamErr == nil && bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		h.fail(w, "upload_shape", "Internal server error", "Cannot read properties of null (reading 'Id')")
		return
	}
	if upstreamErr != nil {
		// R-041 (contract version 2): no bucket listing after a failed upload.
		// Signed-in users cannot list buckets (no storage.buckets policy), so
		// the old check always failed and named a setup file that does not
		// exist. The bucket exists; the answer is the plain failure.
		h.fail(w, "upload", "Failed to upload avatar", errorText(raw, upstreamErr, false))
		return
	}
	committed := false
	defer func() {
		if !committed {
			h.rollback(ctx, session, uploadPath)
		}
	}()
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
		h.fail(w, "profile", "Failed to update user profile", "Profile update failed")
		return
	}
	committed = true
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

const uploadLockName = ".avatar-upload-lock.png"

// acquire uses a non-overwriting Storage insert, shared by all Go instances.
func (h *Handler) acquire(ctx context.Context, session, id string) int {
	status, raw, err := h.call(ctx, session, "POST", "/storage/v1/object/avatars/"+id+"/"+uploadLockName, "image/png", []byte{137, 80, 78, 71, 13, 10, 26, 10}, true)
	if err == nil {
		return 200
	}
	h.log("upload_lock")
	var body struct {
		Error string
		Code  string
	}
	_ = json.Unmarshal(raw, &body)
	if status == 409 || (status == 400 && (body.Error == "Duplicate" || body.Code == "ResourceAlreadyExists" || body.Error == "ResourceAlreadyExists")) {
		return 409
	}
	return 503
}

// Never release an unacknowledged/foreign lock or steal a lock by age.
func (h *Handler) release(ctx context.Context, session, id string) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), time.Second)
	defer cancel()
	body, _ := json.Marshal(map[string]any{"prefixes": []string{id + "/" + uploadLockName}})
	if _, _, err := h.call(ctx, session, "DELETE", "/storage/v1/object/avatars", "application/json", body, false); err != nil {
		h.log("upload_unlock")
	}
}

func safeName(name string) bool {
	return name != "" && name != "." && name != ".." && !strings.ContainsAny(name, "/\\\x00")
}

func avatarStamp(name string) (int64, bool) {
	rest, ok := strings.CutPrefix(name, "avatar-")
	if !ok {
		return 0, false
	}
	end := strings.IndexAny(rest, ".-")
	if end < 1 {
		return 0, false
	}
	stamp, err := strconv.ParseInt(rest[:end], 10, 64)
	return stamp, err == nil
}

func (h *Handler) cleanup(ctx context.Context, session, id, current string) {
	_, currentOnly, _ := strings.Cut(current, "/")
	cutoff, _ := avatarStamp(currentOnly)
	pending := []string{id}
	prefixes := []string{}
	// Finish the whole snapshot before deleting, so offsets cannot shift.
	for len(pending) > 0 {
		folder := pending[0]
		pending = pending[1:]
		for offset := 0; ; offset += 100 {
			if ctx.Err() != nil {
				h.log("cleanup_list")
				return
			}
			query, _ := json.Marshal(map[string]any{"limit": 100, "offset": offset, "sortBy": map[string]string{"column": "name", "order": "asc"}, "prefix": folder})
			_, raw, err := h.call(ctx, session, "POST", "/storage/v1/object/list/avatars", "application/json", query, false)
			var files []map[string]any
			if err != nil || json.Unmarshal(raw, &files) != nil {
				h.log("cleanup_list")
				return
			}
			for _, file := range files {
				name, ok := file["name"].(string)
				if !ok || !safeName(name) || name == uploadLockName {
					continue
				}
				path := folder + "/" + name
				if path == current {
					continue
				}
				if stamp, known := avatarStamp(name); known && stamp > cutoff {
					continue
				}
				if value, present := file["id"]; present && value == nil {
					pending = append(pending, path)
				} else {
					prefixes = append(prefixes, path)
				}
			}
			if len(files) < 100 {
				break
			}
		}
	}
	for len(prefixes) > 0 {
		count := min(100, len(prefixes))
		data, _ := json.Marshal(map[string]any{"prefixes": prefixes[:count]})
		if _, _, err := h.call(ctx, session, "DELETE", "/storage/v1/object/avatars", "application/json", data, false); err != nil {
			h.log("cleanup_remove")
			return
		}
		prefixes = prefixes[count:]
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
		req.Header.Set("X-Upsert", "false")
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
	write(w, 500, map[string]any{"error": message})
}
func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// imageType checks the supported file signatures, not user-supplied labels.
// It identifies a format; it does not decode or validate the entire image.
func imageType(body []byte) (kind, extension string) {
	switch {
	case bytes.HasPrefix(body, []byte{137, 80, 78, 71, 13, 10, 26, 10}):
		return "image/png", "png"
	case bytes.HasPrefix(body, []byte{255, 216, 255}):
		return "image/jpeg", "jpg"
	case bytes.HasPrefix(body, []byte("GIF87a")) || bytes.HasPrefix(body, []byte("GIF89a")):
		return "image/gif", "gif"
	case len(body) >= 12 && string(body[:4]) == "RIFF" && string(body[8:12]) == "WEBP":
		return "image/webp", "webp"
	default:
		return "", ""
	}
}

// rollback removes only this request's uploaded object. Cancellation of the
// original request does not suppress the bounded compensation attempt.
func (h *Handler) rollback(ctx context.Context, session, path string) {
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), CleanupBudget)
	defer cancel()
	body, _ := json.Marshal(map[string]any{"prefixes": []string{path}})
	if _, _, err := h.call(cleanup, session, "DELETE", "/storage/v1/object/avatars", "application/json", body, false); err != nil {
		h.log("rollback")
	}
}
