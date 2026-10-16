//go:build solution

package lesson24

import "strings"

func bearer(header string) (string, bool) {
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || token == "" || strings.ContainsAny(token, " \t") {
		return "", false
	}
	return token, true
}
