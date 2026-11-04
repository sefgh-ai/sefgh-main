package lesson50

import "testing"

func TestReasoningEffort(t *testing.T) {
	for _, tc := range []struct {
		setting, preset, want string
		bad                   bool
	}{
		{"", "none", "none", false},
		{"   ", "", "", false},
		{"default", "none", "", false},
		{" Low ", "none", "low", false},
		{"XHIGH", "", "xhigh", false},
		{"none", "", "none", false},
		{"off", "none", "", true},
		{"lowest", "", "", true},
	} {
		got, err := reasoningEffort(tc.setting, tc.preset)
		if got != tc.want || (err != nil) != tc.bad {
			t.Errorf("reasoningEffort(%q, %q) = %q, %v; want %q, error %v", tc.setting, tc.preset, got, err, tc.want, tc.bad)
		}
	}
}
