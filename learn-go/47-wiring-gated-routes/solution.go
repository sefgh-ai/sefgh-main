//go:build solution

package runtimegate

func routeState(flag string, configured, policyReady bool) string {
	if flag != "1" {
		return "off"
	}
	if !configured || !policyReady {
		return "unavailable"
	}
	return "ready"
}
