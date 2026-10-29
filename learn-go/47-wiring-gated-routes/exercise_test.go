package runtimegate

import "testing"

func TestRouteState(t *testing.T) {
	for _, tc := range []struct {
		flag               string
		configured, policy bool
		want               string
	}{
		{"", true, true, "off"}, {"0", true, true, "off"}, {"true", true, true, "off"}, {"1 ", true, true, "off"},
		{"1", false, true, "unavailable"}, {"1", true, false, "unavailable"}, {"1", true, true, "ready"},
	} {
		if got := routeState(tc.flag, tc.configured, tc.policy); got != tc.want {
			t.Errorf("routeState(%q,%v,%v)=%q, want %q", tc.flag, tc.configured, tc.policy, got, tc.want)
		}
	}
}
