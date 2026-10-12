package lesson15

import (
	"strings"
	"testing"
	"time"
)

func TestFromMap(t *testing.T) {
	getenv := fromMap(map[string]string{"PORT": "3000", "EMPTY": ""})
	if got := getenv("PORT"); got != "3000" {
		t.Errorf(`getenv("PORT") = %q, want "3000"`, got)
	}
	if got := getenv("EMPTY"); got != "" {
		t.Errorf(`getenv("EMPTY") = %q, want ""`, got)
	}
	if got := getenv("MISSING"); got != "" {
		t.Errorf(`getenv("MISSING") = %q, want ""`, got)
	}
}

// Each function remembers its own map.
func TestFromMapKeepsMapsApart(t *testing.T) {
	first := fromMap(map[string]string{"PORT": "3000"})
	second := fromMap(map[string]string{"PORT": "4000"})
	if a, b := first("PORT"), second("PORT"); a != "3000" || b != "4000" {
		t.Errorf("got %q and %q, want 3000 and 4000", a, b)
	}
	// A nil map has no keys. Reading from it is allowed and gives "".
	if got := fromMap(nil)("PORT"); got != "" {
		t.Errorf(`fromMap(nil)("PORT") = %q, want ""`, got)
	}
}

// only answers one name, so this test does not depend on fromMap.
func only(value string) func(string) string {
	return func(name string) string {
		if name == "TIMEOUT_SECONDS" {
			return value
		}
		return ""
	}
}

func TestTimeoutFrom(t *testing.T) {
	accepted := []struct {
		in   string
		want time.Duration
	}{
		{"", 10 * time.Second},
		{"1", time.Second},
		{"25", 25 * time.Second},
		{"60", time.Minute},
	}
	for _, tt := range accepted {
		got, err := timeoutFrom(only(tt.in))
		if err != nil || got != tt.want {
			t.Errorf("TIMEOUT_SECONDS=%q: got %v, %v; want %v and no error", tt.in, got, err, tt.want)
		}
	}
	for _, in := range []string{"0", "61", "-5", "ten", "2.5", "10s", " 10"} {
		got, err := timeoutFrom(only(in))
		if err == nil {
			t.Errorf("TIMEOUT_SECONDS=%q: got %v and no error, want an error", in, got)
			continue
		}
		if got != 0 {
			t.Errorf("TIMEOUT_SECONDS=%q: got %v with the error, want 0", in, got)
		}
		if !strings.Contains(err.Error(), "TIMEOUT_SECONDS") {
			t.Errorf("TIMEOUT_SECONDS=%q: error %q does not name the setting", in, err)
		}
	}
}

func TestTimeoutFromAsksForTheRightName(t *testing.T) {
	var asked []string
	timeoutFrom(func(name string) string {
		asked = append(asked, name)
		return ""
	})
	if len(asked) == 0 {
		t.Fatal("timeoutFrom never called getenv")
	}
	for _, name := range asked {
		if name != "TIMEOUT_SECONDS" {
			t.Errorf("timeoutFrom asked for %q, want only TIMEOUT_SECONDS", name)
		}
	}
}
