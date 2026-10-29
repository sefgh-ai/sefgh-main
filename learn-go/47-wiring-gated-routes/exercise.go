//go:build !solution

package runtimegate

func routeState(flag string, configured, policyReady bool) string {
	// TODO: return off, unavailable or ready using the lesson's rules.
	return "off"
}
