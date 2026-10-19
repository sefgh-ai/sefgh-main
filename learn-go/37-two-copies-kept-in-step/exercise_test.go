package lesson37

import (
	"slices"
	"testing"
)

// A shortened copy of the site's policy.
const policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https:; frame-ancestors 'none';"

func TestSources(t *testing.T) {
	cases := []struct {
		name string
		want []string
	}{
		{"connect-src", []string{"'self'", "https://*.supabase.co", "wss://*.supabase.co", "https:"}},
		{"script-src", []string{"'self'", "'unsafe-inline'", "https:"}},
		{"frame-ancestors", []string{"'none'"}},
		{"worker-src", nil},
		{"src", nil},
	}
	for _, c := range cases {
		if got := sources(policy, c.name); !slices.Equal(got, c.want) {
			t.Errorf("sources(policy, %q) = %q, want %q", c.name, got, c.want)
		}
	}
}

// R-104: the site's policy names the Realtime websocket on its own, because
// "https:" does not cover wss://.
func TestRealtimeIsNamed(t *testing.T) {
	if !slices.Contains(sources(policy, "connect-src"), "wss://*.supabase.co") {
		t.Error("connect-src does not name wss://*.supabase.co")
	}
}

func TestOddSpacing(t *testing.T) {
	got := sources("  img-src   'self'  data: ;;  ", "img-src")
	if want := []string{"'self'", "data:"}; !slices.Equal(got, want) {
		t.Errorf("got %q, want %q", got, want)
	}
}
