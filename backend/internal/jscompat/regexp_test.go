package jscompat

import (
	"regexp"
	"testing"
)

// The YouTube pattern of /api/repo/videos, translated with JSDot and
// JSSpace.
var youtubePattern = regexp.MustCompile(`(?:youtube\.com/(?:[^/]+/` + JSDot + `+/|(?:v|e(?:mbed)?)/|` + JSDot + `*[?&]v=)|youtu\.be/)([^"&?/` + JSSpace + `]{11})`)

// Each answer was produced in Node 21 by url.match(re)?.[1] with the
// handler's own pattern; "" stands for no match.
func TestFindSubmatchUTF16(t *testing.T) {
	tests := []struct{ in, want string }{
		{"https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"},
		{"https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"https://www.youtube.com/v/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"https://www.youtube.com/e/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"https://youtube.com/shorts/abc/def/dQw4w9WgXcQ", "dQw4w9WgXcQ"},
		{"https://www.youtube.com/watch?feature=x&v=dQw4w9WgXcQ&t=1", "dQw4w9WgXcQ"},
		{"https://www.youtube.com/watch?v=short", ""},
		{"https://youtu.be/\u00a0bcdefghijk", ""},
		{"https://youtu.be/abc\u00a0efghijk", ""},
		{"https://youtu.be/abcdefghi\U0001F600x", "abcdefghi\U0001F600"},
		{"https://youtu.be/\U0001F600abcdefghi", "\U0001F600abcdefghi"},
		{"https://www.youtube.com/watch\n?v=dQw4w9WgXcQ", ""},
		{"https://www.youtube.com/a/b\u2028/dQw4w9WgXcQ", ""},
		{"https://youtu.be/abcdefghij\u000bk", ""},
		{"https://github.com/octo/demo/raw/demo.mp4", ""},
		{"https://youtube.com", ""},
		{"https://youtu.be/dQw4w9WgXcQdQw4w9WgXcQ", "dQw4w9WgXcQ"},
	}
	for _, tt := range tests {
		got, ok := FindSubmatchUTF16(youtubePattern, tt.in, 1)
		if want := tt.want != ""; ok != want || (ok && string(mustJSON(got)) != string(mustJSON(ToUTF16(tt.want)))) {
			t.Errorf("match(%q) = %q, %v; want %q", tt.in, string(mustJSON(got)), ok, tt.want)
		}
	}
}

// Eleven units can end in the middle of an emoji; the answer then holds
// half of it, as JavaScript's does, and JSON writes the half as an escape.
func TestFindSubmatchUTF16CanSplitAPair(t *testing.T) {
	got, ok := FindSubmatchUTF16(youtubePattern, "https://youtu.be/abcdefghij\U0001F600", 1)
	if !ok || string(mustJSON(got)) != `"abcdefghij\ud83d"` {
		t.Errorf("got %s, %v", mustJSON(got), ok)
	}
}

func mustJSON(u UTF16) []byte {
	b, _ := u.MarshalJSON()
	return b
}
