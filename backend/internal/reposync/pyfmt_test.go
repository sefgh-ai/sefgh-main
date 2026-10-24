package reposync

import (
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func quiet() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

// Each repr was produced by Python 3.12: str(json.loads(raw)).
func TestPyReprMatchesPython(t *testing.T) {
	for _, tt := range []struct{ raw, want string }{
		{`[{"type": "NOT_FOUND", "message": "Could not resolve"}]`, `[{'type': 'NOT_FOUND', 'message': 'Could not resolve'}]`},
		{`{"a": 100000.0, "b": 0.0001, "c": 1.5e-05, "d": 1e+16, "e": 1234567.0, "f": -0.0, "g": 2.5, "h": true, "i": null, "j": 12, "k": 1e-05}`,
			`{'a': 100000.0, 'b': 0.0001, 'c': 1.5e-05, 'd': 1e+16, 'e': 1234567.0, 'f': -0.0, 'g': 2.5, 'h': True, 'i': None, 'j': 12, 'k': 1e-05}`},
		{`["it's", "say \"hi\"", "both ' and \"", "tab\there", "nl\nx", "back\\slash", "é日", "\u0001", "\u007f"]`,
			`["it's", 'say "hi"', 'both \' and "', 'tab\there', 'nl\nx', 'back\\slash', '` + "é日" + `', '\x01', '\x7f']`},
	} {
		if got := pyRepr([]byte(tt.raw)); got != tt.want {
			t.Errorf("pyRepr(%s)\n got %s\nwant %s", tt.raw, got, tt.want)
		}
	}
}

func TestIsoformatLikePython(t *testing.T) {
	if got := isoformat(time.Date(2026, 10, 24, 17, 30, 0, 0, time.UTC)); got != "2026-10-24T17:30:00" {
		t.Fatal(got)
	}
	if got := isoformat(time.Date(2026, 10, 24, 17, 30, 0, 123456789, time.UTC)); got != "2026-10-24T17:30:00.123456" {
		t.Fatal(got)
	}
}

// RepoSync's key names and masks: first and last characters.
func TestKeyNamesAndMasks(t *testing.T) {
	r := newKeyRing([]string{"abcdefgh", "abcde", "abc", "日本語のキー"}, []string{"named"})
	var got []string
	for _, k := range r.info {
		got = append(got, k.Name+"|"+k.MaskedKey)
	}
	want := "named|abc...fgh,key2|ab...de,key3|***,日本語...のキー|日本...キー"
	if strings.Join(got, ",") != want {
		t.Fatalf("got %s", strings.Join(got, ","))
	}
}
