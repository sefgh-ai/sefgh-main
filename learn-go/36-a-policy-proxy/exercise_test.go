package lesson36

import "testing"

func TestTargetOf(t *testing.T) {
	for rest, want := range map[string]string{
		"projects":                    "projects",
		"user_conversations":          "user_conversations",
		"projects/extra":              "projects",
		"rpc/log_user_activity":       "rpc/log_user_activity",
		"rpc/log_user_activity/extra": "rpc/log_user_activity",
		"rpc/":                        "rpc/",
		"":                            "",
	} {
		if got := targetOf(rest); got != want {
			t.Errorf("targetOf(%q) = %q, want %q", rest, got, want)
		}
	}
}
