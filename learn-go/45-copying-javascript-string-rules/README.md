# 45. Copy JavaScript's string rules exactly

Real code: `readAvatar` and `cleanPath` in
`backend/internal/avatar/handler.go`. Before a route moves to Go, the Go port
must give the same answers as the Next.js handler, odd ones included, so the
two can be compared. Two small differences in how a filename was handled broke
that for crafted uploads. A review on 2026-10-24 (REVIEW-028) found them.

## One pass is not "every run"

The Next.js route uploads through storage-js, which cleans the path first:

```js
path.replace(/^\/|\/$/g, '').replace(/\/+/g, '/')
```

`/\/+/g` matches a whole run of slashes, so `a///b` becomes `a/b`. The first
Go version used `strings.ReplaceAll(p, "//", "/")`. `ReplaceAll` scans once
and does not look at its own output: `a///b` has one `//` pair, then a single
`/`, and becomes `a//b`. The order mattered too. JavaScript removes one leading
and one trailing slash *before* collapsing; Go trimmed every slash *after*. So
`png//` stayed `png/` in JavaScript but became `png` in Go.

```go
func cleanPath(p string) string {
	p = strings.TrimSuffix(strings.TrimPrefix(p, "/"), "/")
	for strings.Contains(p, "//") {
		p = strings.ReplaceAll(p, "//", "/")
	}
	return p
}
```

`TrimPrefix` and `TrimSuffix` remove one copy at most, like `^\/` and `\/$`.
`strings.Trim(p, "/")` removes every slash at either end: a different rule.
The loop repeats until no pair is left, which is what `+` means in the regular
expression. Go also has a `regexp` package; a loop over `strings` is plainer
for one character.

## `FileName` is not the name that was sent

`multipart.Part.FileName()` returns the filename passed through
`filepath.Base`. That drops everything up to the last path separator, and the
separator depends on the computer: on Windows both `/` and `\` count, on Linux
only `/`. A browser sends only the file's own name, but a hand-made request can
send `photo.png///x`. Next.js kept the whole name; Go kept `x`. The port now
reads the `filename` parameter that `mime.ParseMediaType` already returned, so
Linux, Windows and Next.js all see the same name.

In JavaScript terms: `FileName()` is like calling `path.basename(file.name)`
for you. Handy for saving a file to disk, wrong when you must copy behaviour.

## Your exercise

Implement `cleanPath` in `exercise.go` so that it matches storage-js's rule
above for every case in `exercise_test.go`. From `learn-go/`:

```powershell
go test ./45-copying-javascript-string-rules
go test -tags solution ./45-copying-javascript-string-rules
```

The exercise is intentionally unfinished. The solution shows one way to do it.


## BUG-056: R-094

Avatar uploads detect PNG, JPEG, GIF87a/GIF89a and WebP signatures from bytes, reject empty/unsupported/truncated signatures, and derive MIME and stored extension from the detected format. User filenames and MIME labels cannot choose the stored suffix. The 5MiB bound, caller token, existing metadata/error/cleanup policies remain; full image decoding is outside this signature check.

The real backend and fixtures pin this change. Go returns early for errors and keeps the user's request scope. The regression was shown failing before the fix and under a deliberate break. Existing exercise.go files are untouched; lesson checks remain optional.

imageType returns two strings: detected MIME and a canonical extension. A switch without an expression checks byte prefixes with bytes.HasPrefix. The WebP branch checks length before slicing body[:4] and body[8:12], so a short upload cannot panic. An empty result means reject the upload. This checks signatures, not a full image decode. JavaScript similarly uses byte arrays and subarray; a file.type or filename string is only caller-provided metadata. Existing filename-copying exercises describe the original port; the current upload no longer derives its filename from the caller.


## BUG-059: R-095

Avatar replacement uses an exclusive own-folder Storage insert across participating Go instances, unique random filenames and non-overwriting uploads. Cleanup snapshots all pages before deleting in batches, traverses explicit legacy folders, and preserves the current file, lock and newer timestamps. A failed page causes no partial-snapshot deletion. Lock release is bounded. Crash/uncertain-acquisition recovery is intentionally manual (R-209); hosted acceptance and all-writers protocol are rollout gates.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.
